from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
import asyncpg
import httpx
import hashlib
import json
import re
from app.database import get_db
from app.core.security import get_current_user

_geo_cache: dict = {}

router = APIRouter(prefix='/api/sdk', tags=['sdk'])


async def get_visitor_geo(ip: str) -> dict:
    """Look up geo info for visitor IP via ipwho.is. Cached in memory per IP."""
    if ip in _geo_cache:
        return _geo_cache[ip]
    null_geo = {'country': None, 'country_code': None, 'continent': None, 'isp': None, 'timezone_id': None}
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f'https://ipwho.is/{ip}')
            data = resp.json()
            if data.get('success'):
                geo = {
                    'country': data.get('country'),
                    'country_code': data.get('country_code'),
                    'continent': data.get('continent'),
                    'isp': (data.get('connection') or {}).get('org'),
                    'timezone_id': (data.get('timezone') or {}).get('id'),
                }
                _geo_cache[ip] = geo
                return geo
    except Exception:
        pass
    _geo_cache[ip] = null_geo
    return null_geo


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
        actions = json.loads(row['actions']) if isinstance(row['actions'], str) else row['actions']
        # Always resolve fresh config from source tables — never serve stale snapshots
        for action in actions:
            if action.get('type') == 'show_popup' and action.get('value'):
                try:
                    val = json.loads(action['value']) if isinstance(action['value'], str) else action['value']
                    popup_id = val.get('popup_id')
                    if popup_id:
                        popup_row = await db.fetchrow('SELECT config FROM popups WHERE id = $1', popup_id)
                        if popup_row and popup_row['config']:
                            live_config = json.loads(popup_row['config']) if isinstance(popup_row['config'], str) else popup_row['config']
                            # Also resolve any countdown blocks inside the popup live from the countdowns table
                            blocks = live_config.get('blocks') or []
                            for block in blocks:
                                if block.get('type') == 'countdown' and block.get('countdown_id'):
                                    cd_row = await db.fetchrow(
                                        'SELECT config, ends_at, expiry_action, expiry_value FROM countdowns WHERE id = $1',
                                        block['countdown_id']
                                    )
                                    if cd_row:
                                        block['countdown_config'] = json.loads(cd_row['config']) if isinstance(cd_row['config'], str) else (cd_row['config'] or {})
                                        block['countdown_ends_at'] = cd_row['ends_at'].isoformat() if cd_row['ends_at'] and hasattr(cd_row['ends_at'], 'isoformat') else cd_row['ends_at']
                                        block['countdown_expiry_action'] = cd_row['expiry_action']
                                        block['countdown_expiry_value'] = cd_row['expiry_value']
                            # Also resolve countdown blocks inside column sub-blocks
                            for block in blocks:
                                if block.get('type') == 'columns':
                                    for sub in (block.get('col_left') or []) + (block.get('col_right') or []):
                                        if sub.get('type') == 'countdown' and sub.get('countdown_id'):
                                            cd_row = await db.fetchrow(
                                                'SELECT config, ends_at, expiry_action, expiry_value FROM countdowns WHERE id = $1',
                                                sub['countdown_id']
                                            )
                                            if cd_row:
                                                sub['countdown_config'] = json.loads(cd_row['config']) if isinstance(cd_row['config'], str) else (cd_row['config'] or {})
                                                sub['countdown_ends_at'] = cd_row['ends_at'].isoformat() if cd_row['ends_at'] and hasattr(cd_row['ends_at'], 'isoformat') else cd_row['ends_at']
                                                sub['countdown_expiry_action'] = cd_row['expiry_action']
                                                sub['countdown_expiry_value'] = cd_row['expiry_value']
                            val['config'] = live_config
                            action['value'] = json.dumps(val)
                except Exception:
                    pass
            elif action.get('type') == 'insert_countdown' and action.get('value'):
                try:
                    val = json.loads(action['value']) if isinstance(action['value'], str) else action['value']
                    countdown_id = val.get('countdown_id')
                    if countdown_id:
                        cd_row = await db.fetchrow('SELECT config, ends_at, expiry_action, expiry_value FROM countdowns WHERE id = $1', countdown_id)
                        if cd_row:
                            if cd_row['config']:
                                val['config'] = json.loads(cd_row['config']) if isinstance(cd_row['config'], str) else cd_row['config']
                            if cd_row['ends_at']:
                                val['ends_at'] = cd_row['ends_at'].isoformat() if hasattr(cd_row['ends_at'], 'isoformat') else cd_row['ends_at']
                            val['expiry_action'] = cd_row['expiry_action']
                            val['expiry_value'] = cd_row['expiry_value']
                            action['value'] = json.dumps(val)
                except Exception:
                    pass
        rules.append({
            'id': str(row['id']),
            'name': row['name'],
            'conditions': json.loads(row['conditions']) if isinstance(row['conditions'], str) else row['conditions'],
            'condition_operator': row['condition_operator'],
            'actions': actions,
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
    response.headers['Cache-Control'] = 'no-store'
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


# ---------------------------------------------------------------------------
# GET /api/sdk/rules?script_id=PP-XXXXXX
# Public. Returns full active rules + hash for the project.
# SDK caches this in localStorage.
# ---------------------------------------------------------------------------
@router.get('/rules')
async def sdk_rules(
    request: Request,
    script_id: str = Query(...),
    db: asyncpg.Connection = Depends(get_db)
):
    # Extract visitor IP: X-Forwarded-For → X-Real-IP → direct connection
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        visitor_ip = forwarded_for.split(',')[0].strip()
    else:
        real_ip = request.headers.get('X-Real-IP')
        visitor_ip = real_ip.strip() if real_ip else (request.client.host if request.client else '0.0.0.0')

    geo = await get_visitor_geo(visitor_ip)

    project = await get_project_by_script_id(script_id, db)
    if project['status'] == 'draft':
        return JSONResponse(
            content={'rules_hash': 'draft', 'rules': [], 'geo': geo},
            headers={'Access-Control-Allow-Origin': '*'}
        )
    rules = await get_active_rules(str(project['id']), db)
    rules_hash = compute_rules_hash(rules)
    response = JSONResponse(content={
        'rules_hash': rules_hash,
        'rules': rules,
        'geo': geo,
        'page_url': project['page_url'],
    })
    response.headers['Cache-Control'] = 'no-store'
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
    # Verify access — owner, team member, or full-access client
    project = await db.fetchrow(
        """SELECT p.id, p.page_url, p.script_id, p.script_verified
           FROM projects p
           JOIN workspaces w ON p.workspace_id = w.id
           WHERE p.id = $1 AND (
               w.owner_id = $2
               OR EXISTS (
                   SELECT 1 FROM workspace_members wm
                   WHERE wm.workspace_id = w.id AND wm.user_id = $2
                     AND wm.status = 'active' AND wm.role != 'revoked'
               )
           )""",
        project_id, current_user['id']
    )
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    # Always do a live check — never trust cached script_verified state
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
    # Exact match: script ID must be followed by a non-alphanumeric char (avoids PP-ABC matching PP-ABC11)
    found = bool(re.search(re.escape(script_id) + r'[^A-Za-z0-9]', html))
    await db.execute(
        'UPDATE projects SET script_verified = $1 WHERE id = $2',
        found, project_id
    )
    return {
        'verified': found,
        'already_verified': project['script_verified'] and found,
        'page_url': page_url,
        'script_id': script_id,
    }