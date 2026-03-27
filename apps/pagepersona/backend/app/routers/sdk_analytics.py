from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
import asyncpg
import uuid
from app.database import get_db

router = APIRouter(prefix='/api/sdk', tags=['sdk-analytics'])


def _cors():
    return {'Access-Control-Allow-Origin': '*'}


@router.post('/visit')
async def sdk_visit(
    request: Request,
    db: asyncpg.Connection = Depends(get_db)
):
    """Record a page visit beacon from pp.js."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(content={'ok': False}, status_code=400, headers=_cors())

    project_id = body.get('project_id')
    if not project_id:
        return JSONResponse(content={'ok': False}, status_code=400, headers=_cors())

    # Verify project exists
    proj = await db.fetchrow('SELECT id FROM projects WHERE script_id = $1', project_id)
    if not proj:
        return JSONResponse(content={'ok': False}, status_code=404, headers=_cors())

    real_project_id = str(proj['id'])
    session_id = body.get('session_id') or str(uuid.uuid4())

    visit_id = await db.fetchval(
        '''
        INSERT INTO page_visits (
            project_id, session_id, country, country_code, continent,
            device, os, browser, referrer,
            utm_source, utm_medium, utm_campaign, utm_content, utm_term,
            is_new_visitor
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        RETURNING id
        ''',
        real_project_id,
        session_id,
        body.get('country'),
        body.get('country_code'),
        body.get('continent'),
        body.get('device'),
        body.get('os'),
        body.get('browser'),
        body.get('referrer'),
        body.get('utm_source'),
        body.get('utm_medium'),
        body.get('utm_campaign'),
        body.get('utm_content'),
        body.get('utm_term'),
        bool(body.get('is_new_visitor', False)),
    )

    return JSONResponse(
        content={'ok': True, 'visit_id': str(visit_id)},
        headers=_cors()
    )


@router.patch('/visit/{visit_id}')
async def sdk_visit_update(
    visit_id: str,
    request: Request,
    db: asyncpg.Connection = Depends(get_db)
):
    """Update time_on_page and scroll_depth at unload."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(content={'ok': False}, status_code=400, headers=_cors())

    await db.execute(
        '''
        UPDATE page_visits
        SET time_on_page = $1, scroll_depth = $2
        WHERE id = $3
        ''',
        body.get('time_on_page'),
        body.get('scroll_depth'),
        visit_id,
    )
    return JSONResponse(content={'ok': True}, headers=_cors())


@router.post('/event')
async def sdk_event(
    request: Request,
    db: asyncpg.Connection = Depends(get_db)
):
    """Record a rule-fired event beacon from pp.js."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(content={'ok': False}, status_code=400, headers=_cors())

    rule_id = body.get('rule_id')
    project_script_id = body.get('project_id')
    if not rule_id or not project_script_id:
        return JSONResponse(content={'ok': False}, status_code=400, headers=_cors())

    proj = await db.fetchrow('SELECT id FROM projects WHERE script_id = $1', project_script_id)
    if not proj:
        return JSONResponse(content={'ok': False}, status_code=404, headers=_cors())

    real_project_id = str(proj['id'])

    # Verify rule belongs to project
    rule = await db.fetchrow(
        'SELECT id FROM rules WHERE id = $1 AND project_id = $2',
        rule_id, real_project_id
    )
    if not rule:
        return JSONResponse(content={'ok': False}, status_code=404, headers=_cors())

    await db.execute(
        '''
        INSERT INTO rule_events (
            rule_id, project_id, session_id, country, device,
            time_on_page_at_fire, scroll_depth_at_fire
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ''',
        rule_id,
        real_project_id,
        body.get('session_id') or str(uuid.uuid4()),
        body.get('country'),
        body.get('device'),
        body.get('time_on_page'),
        body.get('scroll_depth'),
    )

    return JSONResponse(content={'ok': True}, headers=_cors())
