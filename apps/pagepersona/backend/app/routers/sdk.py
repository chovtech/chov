from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
import asyncpg
import httpx
import hashlib
import json
from app.database import get_db
from app.core.security import get_current_user

router = APIRouter(prefix='/api/sdk', tags=['sdk'])


def compute_rules_hash(rules: list) -> str:
    """Stable hash of active rules — changes when any rule changes."""
    serialised = json.dumps(rules, sort_keys=True, default=str)
    return hashlib.md5(serialised.encode()).hexdigest()[:8]


async def get_project_by_script_id(script_id: str, db: asyncpg.Connection):
    """Fetch project row by script_id. Raises 404 if not found."""
    row = await db.fetchrow(
        'SELECT id, page_url, status FROM projects WHERE script_id = $1',
        script_id
    )
    if not row:
        raise HTTPException(status_code=404, detail='Project not found')
    return row


async def get_active_rules(project_id: str, db: asyncpg.Connection) -> list:
    """Return all active rules for a project, parsed."""
    rows = await db.fetch(
        '''
        SELECT id, name, conditions, condition_operator, actions, priority
        FROM rules
        WHERE project_id = $1 AND is_active = true
        ORDER BY priority ASC, created_at ASC
        ''',
        project_id
    )
    rules = []
    for row in rows:
        rules.append({
            'id': str(row['id']),
            'name': row['name'],
            'conditions': json.loads(row['conditions']) if isinstance(row['conditions'], str) else row['conditions'],
            'condition_operator': row['condition_operator'],
            'actions': json.loads(row['actions']) if isinstance(row['actions'], str) else row['actions'],
            'priority': row['priority'],
        })
    return rules


# ---------------------------------------------------------------------------
# GET /api/sdk/ping?script_id=PP-XXXXXX
# Public. Lightweight hash check — SDK calls this first to decide
# whether to use its cache or fetch fresh rules.
# ---------------------------------------------------------------------------
@router.get('/ping')
async def sdk_ping(
    script_id: str = Query(...),
    db: asyncpg.Connection = Depends(get_db)
):
    project = await get_project_by_script_id(script_id, db)
    rules = await get_active_rules(str(project['id']), db)
    rules_hash = compute_rules_hash(rules)
    response = JSONResponse(content={'rules_hash': rules_hash})
    # Allow CDN to cache this for 30 seconds
    response.headers['Cache-Control'] = 'public, max-age=30'
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


# ---------------------------------------------------------------------------
# GET /api/sdk/rules?script_id=PP-XXXXXX
# Public. Returns full active rules + hash for the project.
# SDK caches this in localStorage.
# ---------------------------------------------------------------------------
@router.get('/rules')
async def sdk_rules(
    script_id: str = Query(...),
    db: asyncpg.Connection = Depends(get_db)
):
    project = await get_project_by_script_id(script_id, db)
    if project['status'] == 'draft':
        # Return empty rules for unpublished projects
        return JSONResponse(
            content={'rules_hash': 'draft', 'rules': []},
            headers={'Access-Control-Allow-Origin': '*'}
        )
    rules = await get_active_rules(str(project['id']), db)
    rules_hash = compute_rules_hash(rules)
    response = JSONResponse(content={
        'rules_hash': rules_hash,
        'rules': rules
    })
    response.headers['Cache-Control'] = 'public, max-age=30'
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


# ---------------------------------------------------------------------------
# POST /api/sdk/verify
# Protected. Server-side fetches the project page URL and checks
# whether the PagePersona script tag is present.
# ---------------------------------------------------------------------------
@router.post('/verify')
async def sdk_verify(
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Get workspace for this user
    workspace = await db.fetchrow(
        'SELECT id FROM workspaces WHERE owner_id = $1',
        current_user['id']
    )
    if not workspace:
        raise HTTPException(status_code=404, detail='Workspace not found')
    # Get all projects for this workspace that are not yet verified
    # Caller passes project_id in body
    return {'detail': 'Use /api/sdk/verify/{project_id} instead'}


@router.post('/verify/{project_id}')
async def sdk_verify_project(
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Verify ownership
    workspace = await db.fetchrow(
        'SELECT id FROM workspaces WHERE owner_id = $1',
        current_user['id']
    )
    if not workspace:
        raise HTTPException(status_code=404, detail='Workspace not found')
    project = await db.fetchrow(
        'SELECT id, page_url, script_id, script_verified FROM projects WHERE id = $1 AND workspace_id = $2',
        project_id, str(workspace['id'])
    )
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    if project['script_verified']:
        return {'verified': True, 'already_verified': True}
    # Fetch the user's page and check for script tag
    page_url = project['page_url']
    script_id = project['script_id']
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(page_url, headers={
                'User-Agent': 'PagePersona-Verifier/1.0'
            })
            html = resp.text
    except Exception as e:
        raise HTTPException(status_code=422, detail=f'Could not fetch page: {str(e)}')
    # Check for script tag with matching script_id
    found = script_id in html and 'pagepersona' in html.lower()
    if found:
        await db.execute(
            'UPDATE projects SET script_verified = true WHERE id = $1',
            project_id
        )
    return {
        'verified': found,
        'page_url': page_url,
        'script_id': script_id,
    }