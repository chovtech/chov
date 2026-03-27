from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
import asyncpg
from app.database import get_db
from app.core.security import get_current_user
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix='/api/analytics', tags=['analytics'])


def _date_range(period: int):
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=period)
    return start, now


@router.get('/project/{project_id}')
async def project_analytics(
    project_id: str,
    period: int = Query(30, ge=1, le=365),
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Verify ownership
    workspace = await db.fetchrow(
        'SELECT id FROM workspaces WHERE owner_id = $1', current_user['id']
    )
    if not workspace:
        raise HTTPException(status_code=404, detail='Workspace not found')

    project = await db.fetchrow(
        'SELECT id, name FROM projects WHERE id = $1 AND workspace_id = $2',
        project_id, str(workspace['id'])
    )
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')

    start, now = _date_range(period)

    # --- Headline numbers ---
    total_visits = await db.fetchval(
        'SELECT COUNT(*) FROM page_visits WHERE project_id=$1 AND timestamp>=$2',
        project_id, start
    )
    unique_visitors = await db.fetchval(
        'SELECT COUNT(DISTINCT session_id) FROM page_visits WHERE project_id=$1 AND timestamp>=$2',
        project_id, start
    )
    new_visitors = await db.fetchval(
        'SELECT COUNT(*) FROM page_visits WHERE project_id=$1 AND timestamp>=$2 AND is_new_visitor=true',
        project_id, start
    )
    rules_fired = await db.fetchval(
        'SELECT COUNT(*) FROM rule_events WHERE project_id=$1 AND timestamp>=$2',
        project_id, start
    )
    avg_time = await db.fetchval(
        'SELECT AVG(time_on_page) FROM page_visits WHERE project_id=$1 AND timestamp>=$2 AND time_on_page IS NOT NULL',
        project_id, start
    )
    avg_scroll = await db.fetchval(
        'SELECT AVG(scroll_depth) FROM page_visits WHERE project_id=$1 AND timestamp>=$2 AND scroll_depth IS NOT NULL',
        project_id, start
    )

    personalisation_rate = round((rules_fired / total_visits * 100), 1) if total_visits else 0

    # --- Daily series (visits + rules fired per day) ---
    daily_visits_rows = await db.fetch(
        '''
        SELECT DATE(timestamp AT TIME ZONE 'UTC') AS day, COUNT(*) AS cnt
        FROM page_visits WHERE project_id=$1 AND timestamp>=$2
        GROUP BY day ORDER BY day
        ''',
        project_id, start
    )
    daily_events_rows = await db.fetch(
        '''
        SELECT DATE(timestamp AT TIME ZONE 'UTC') AS day, COUNT(*) AS cnt
        FROM rule_events WHERE project_id=$1 AND timestamp>=$2
        GROUP BY day ORDER BY day
        ''',
        project_id, start
    )

    def rows_to_dict(rows):
        return {str(r['day']): int(r['cnt']) for r in rows}

    visits_by_day = rows_to_dict(daily_visits_rows)
    events_by_day = rows_to_dict(daily_events_rows)

    # Fill every date in range
    daily_series = []
    d = start.date()
    end_d = now.date()
    while d <= end_d:
        ds = str(d)
        daily_series.append({
            'date': ds,
            'visits': visits_by_day.get(ds, 0),
            'rules_fired': events_by_day.get(ds, 0),
        })
        d += timedelta(days=1)

    # --- Top countries ---
    country_rows = await db.fetch(
        '''
        SELECT country, COUNT(*) AS cnt FROM page_visits
        WHERE project_id=$1 AND timestamp>=$2 AND country IS NOT NULL
        GROUP BY country ORDER BY cnt DESC LIMIT 10
        ''',
        project_id, start
    )
    top_countries = [{'country': r['country'], 'visits': int(r['cnt'])} for r in country_rows]

    # --- Traffic sources ---
    source_rows = await db.fetch(
        '''
        SELECT COALESCE(utm_source, 'direct') AS source, COUNT(*) AS cnt
        FROM page_visits WHERE project_id=$1 AND timestamp>=$2
        GROUP BY source ORDER BY cnt DESC LIMIT 8
        ''',
        project_id, start
    )
    traffic_sources = [{'source': r['source'], 'visits': int(r['cnt'])} for r in source_rows]

    # --- Device split ---
    device_rows = await db.fetch(
        '''
        SELECT COALESCE(device, 'unknown') AS device, COUNT(*) AS cnt
        FROM page_visits WHERE project_id=$1 AND timestamp>=$2
        GROUP BY device ORDER BY cnt DESC
        ''',
        project_id, start
    )
    device_split = [{'device': r['device'], 'visits': int(r['cnt'])} for r in device_rows]

    # --- Visitor type split ---
    new_v = int(new_visitors or 0)
    returning_v = int(unique_visitors or 0) - new_v
    visitor_split = [
        {'type': 'new', 'count': new_v},
        {'type': 'returning', 'count': max(0, returning_v)},
    ]

    # --- Rules performance ---
    rule_rows = await db.fetch(
        '''
        SELECT re.rule_id, r.name, COUNT(*) AS fires,
               COUNT(DISTINCT re.session_id) AS unique_sessions
        FROM rule_events re
        JOIN rules r ON r.id = re.rule_id
        WHERE re.project_id=$1 AND re.timestamp>=$2
        GROUP BY re.rule_id, r.name ORDER BY fires DESC LIMIT 20
        ''',
        project_id, start
    )
    rules_performance = [
        {
            'rule_id': str(r['rule_id']),
            'name': r['name'],
            'fires': int(r['fires']),
            'unique_sessions': int(r['unique_sessions']),
        }
        for r in rule_rows
    ]

    return {
        'period': period,
        'headline': {
            'total_visits': int(total_visits or 0),
            'unique_visitors': int(unique_visitors or 0),
            'new_visitors': int(new_visitors or 0),
            'rules_fired': int(rules_fired or 0),
            'personalisation_rate': personalisation_rate,
            'avg_time_on_page': round(float(avg_time), 1) if avg_time else 0,
            'avg_scroll_depth': round(float(avg_scroll), 1) if avg_scroll else 0,
        },
        'daily_series': daily_series,
        'top_countries': top_countries,
        'traffic_sources': traffic_sources,
        'device_split': device_split,
        'visitor_split': visitor_split,
        'rules_performance': rules_performance,
    }


@router.get('/workspace/{workspace_id}')
async def workspace_analytics(
    workspace_id: str,
    period: int = Query(30, ge=1, le=365),
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Verify ownership
    workspace = await db.fetchrow(
        'SELECT id FROM workspaces WHERE id=$1 AND owner_id=$2',
        workspace_id, current_user['id']
    )
    if not workspace:
        raise HTTPException(status_code=404, detail='Workspace not found')

    start, now = _date_range(period)

    # Get all project IDs in workspace
    project_rows = await db.fetch(
        'SELECT id, name FROM projects WHERE workspace_id=$1', workspace_id
    )
    if not project_rows:
        return {
            'period': period,
            'headline': {'total_visits': 0, 'unique_visitors': 0, 'rules_fired': 0, 'personalisation_rate': 0},
            'daily_series': [],
            'top_countries': [],
            'device_split': [],
            'utm_performance': [],
            'project_performance': [],
        }

    project_ids = [str(r['id']) for r in project_rows]
    project_names = {str(r['id']): r['name'] for r in project_rows}

    # Headline
    total_visits = await db.fetchval(
        'SELECT COUNT(*) FROM page_visits WHERE project_id=ANY($1) AND timestamp>=$2',
        project_ids, start
    )
    unique_visitors = await db.fetchval(
        'SELECT COUNT(DISTINCT session_id) FROM page_visits WHERE project_id=ANY($1) AND timestamp>=$2',
        project_ids, start
    )
    rules_fired = await db.fetchval(
        'SELECT COUNT(*) FROM rule_events WHERE project_id=ANY($1) AND timestamp>=$2',
        project_ids, start
    )
    personalisation_rate = round((rules_fired / total_visits * 100), 1) if total_visits else 0

    # Daily series — personalised vs unpersonalised
    daily_visits_rows = await db.fetch(
        '''
        SELECT DATE(timestamp AT TIME ZONE 'UTC') AS day, COUNT(*) AS cnt
        FROM page_visits WHERE project_id=ANY($1) AND timestamp>=$2
        GROUP BY day ORDER BY day
        ''',
        project_ids, start
    )
    # Sessions that had at least 1 rule fire = personalised
    daily_personalised_rows = await db.fetch(
        '''
        SELECT DATE(timestamp AT TIME ZONE 'UTC') AS day, COUNT(DISTINCT session_id) AS cnt
        FROM rule_events WHERE project_id=ANY($1) AND timestamp>=$2
        GROUP BY day ORDER BY day
        ''',
        project_ids, start
    )

    def rows_to_dict(rows):
        return {str(r['day']): int(r['cnt']) for r in rows}

    visits_by_day = rows_to_dict(daily_visits_rows)
    pers_by_day = rows_to_dict(daily_personalised_rows)

    daily_series = []
    d = start.date()
    end_d = now.date()
    while d <= end_d:
        ds = str(d)
        total = visits_by_day.get(ds, 0)
        personalised = pers_by_day.get(ds, 0)
        daily_series.append({
            'date': ds,
            'visits': total,
            'personalised': min(personalised, total),
            'unpersonalised': max(0, total - personalised),
        })
        d += timedelta(days=1)

    # Top countries
    country_rows = await db.fetch(
        '''
        SELECT country, COUNT(*) AS cnt FROM page_visits
        WHERE project_id=ANY($1) AND timestamp>=$2 AND country IS NOT NULL
        GROUP BY country ORDER BY cnt DESC LIMIT 10
        ''',
        project_ids, start
    )
    top_countries = [{'country': r['country'], 'visits': int(r['cnt'])} for r in country_rows]

    # Device split
    device_rows = await db.fetch(
        '''
        SELECT COALESCE(device, 'unknown') AS device, COUNT(*) AS cnt
        FROM page_visits WHERE project_id=ANY($1) AND timestamp>=$2
        GROUP BY device ORDER BY cnt DESC
        ''',
        project_ids, start
    )
    device_split = [{'device': r['device'], 'visits': int(r['cnt'])} for r in device_rows]

    # UTM performance
    utm_rows = await db.fetch(
        '''
        SELECT COALESCE(utm_source, 'direct') AS source,
               COALESCE(utm_medium, '') AS medium,
               COUNT(*) AS visits,
               COUNT(DISTINCT session_id) AS unique_visitors
        FROM page_visits WHERE project_id=ANY($1) AND timestamp>=$2
        GROUP BY source, medium ORDER BY visits DESC LIMIT 10
        ''',
        project_ids, start
    )
    utm_performance = [
        {
            'source': r['source'],
            'medium': r['medium'],
            'visits': int(r['visits']),
            'unique_visitors': int(r['unique_visitors']),
        }
        for r in utm_rows
    ]

    # Project performance
    proj_perf = []
    for pid in project_ids:
        pv = await db.fetchval(
            'SELECT COUNT(*) FROM page_visits WHERE project_id=$1 AND timestamp>=$2', pid, start
        )
        re_ = await db.fetchval(
            'SELECT COUNT(*) FROM rule_events WHERE project_id=$1 AND timestamp>=$2', pid, start
        )
        proj_perf.append({
            'project_id': pid,
            'name': project_names[pid],
            'visits': int(pv or 0),
            'rules_fired': int(re_ or 0),
            'personalisation_rate': round((re_ / pv * 100), 1) if pv else 0,
        })
    proj_perf.sort(key=lambda x: x['visits'], reverse=True)

    return {
        'period': period,
        'headline': {
            'total_visits': int(total_visits or 0),
            'unique_visitors': int(unique_visitors or 0),
            'rules_fired': int(rules_fired or 0),
            'personalisation_rate': personalisation_rate,
        },
        'daily_series': daily_series,
        'top_countries': top_countries,
        'device_split': device_split,
        'utm_performance': utm_performance,
        'project_performance': proj_perf,
    }


@router.get('/overview')
async def workspace_analytics_self(
    period: int = Query(30, ge=1, le=365),
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Same as /workspace/{id} but auto-resolves workspace from auth token."""
    workspace = await db.fetchrow(
        'SELECT id FROM workspaces WHERE owner_id=$1', current_user['id']
    )
    if not workspace:
        raise HTTPException(status_code=404, detail='Workspace not found')

    # Delegate to workspace_analytics
    from fastapi import Request
    class _Fake:
        pass

    workspace_id = str(workspace['id'])
    start, now = _date_range(period)

    project_rows = await db.fetch(
        'SELECT id, name FROM projects WHERE workspace_id=$1', workspace_id
    )
    if not project_rows:
        return {
            'period': period,
            'headline': {'total_visits': 0, 'unique_visitors': 0, 'rules_fired': 0, 'personalisation_rate': 0},
            'daily_series': [],
            'top_countries': [],
            'device_split': [],
            'utm_performance': [],
            'project_performance': [],
        }

    project_ids = [str(r['id']) for r in project_rows]
    project_names = {str(r['id']): r['name'] for r in project_rows}

    total_visits = await db.fetchval(
        'SELECT COUNT(*) FROM page_visits WHERE project_id=ANY($1) AND timestamp>=$2',
        project_ids, start
    )
    unique_visitors = await db.fetchval(
        'SELECT COUNT(DISTINCT session_id) FROM page_visits WHERE project_id=ANY($1) AND timestamp>=$2',
        project_ids, start
    )
    rules_fired = await db.fetchval(
        'SELECT COUNT(*) FROM rule_events WHERE project_id=ANY($1) AND timestamp>=$2',
        project_ids, start
    )
    personalisation_rate = round((rules_fired / total_visits * 100), 1) if total_visits else 0

    daily_visits_rows = await db.fetch(
        '''SELECT DATE(timestamp AT TIME ZONE 'UTC') AS day, COUNT(*) AS cnt
           FROM page_visits WHERE project_id=ANY($1) AND timestamp>=$2
           GROUP BY day ORDER BY day''',
        project_ids, start
    )
    daily_personalised_rows = await db.fetch(
        '''SELECT DATE(timestamp AT TIME ZONE 'UTC') AS day, COUNT(DISTINCT session_id) AS cnt
           FROM rule_events WHERE project_id=ANY($1) AND timestamp>=$2
           GROUP BY day ORDER BY day''',
        project_ids, start
    )

    def rows_to_dict(rows):
        return {str(r['day']): int(r['cnt']) for r in rows}

    visits_by_day = rows_to_dict(daily_visits_rows)
    pers_by_day = rows_to_dict(daily_personalised_rows)

    daily_series = []
    d = start.date()
    end_d = now.date()
    while d <= end_d:
        ds = str(d)
        total = visits_by_day.get(ds, 0)
        personalised = pers_by_day.get(ds, 0)
        daily_series.append({
            'date': ds,
            'visits': total,
            'personalised': min(personalised, total),
            'unpersonalised': max(0, total - personalised),
        })
        d += timedelta(days=1)

    country_rows = await db.fetch(
        '''SELECT country, COUNT(*) AS cnt FROM page_visits
           WHERE project_id=ANY($1) AND timestamp>=$2 AND country IS NOT NULL
           GROUP BY country ORDER BY cnt DESC LIMIT 10''',
        project_ids, start
    )
    top_countries = [{'country': r['country'], 'visits': int(r['cnt'])} for r in country_rows]

    device_rows = await db.fetch(
        '''SELECT COALESCE(device, 'unknown') AS device, COUNT(*) AS cnt
           FROM page_visits WHERE project_id=ANY($1) AND timestamp>=$2
           GROUP BY device ORDER BY cnt DESC''',
        project_ids, start
    )
    device_split = [{'device': r['device'], 'visits': int(r['cnt'])} for r in device_rows]

    utm_rows = await db.fetch(
        '''SELECT COALESCE(utm_source, 'direct') AS source,
                  COALESCE(utm_medium, '') AS medium,
                  COUNT(*) AS visits,
                  COUNT(DISTINCT session_id) AS unique_visitors
           FROM page_visits WHERE project_id=ANY($1) AND timestamp>=$2
           GROUP BY source, medium ORDER BY visits DESC LIMIT 10''',
        project_ids, start
    )
    utm_performance = [
        {'source': r['source'], 'medium': r['medium'],
         'visits': int(r['visits']), 'unique_visitors': int(r['unique_visitors'])}
        for r in utm_rows
    ]

    proj_perf = []
    for pid in project_ids:
        pv = await db.fetchval(
            'SELECT COUNT(*) FROM page_visits WHERE project_id=$1 AND timestamp>=$2', pid, start
        )
        re_ = await db.fetchval(
            'SELECT COUNT(*) FROM rule_events WHERE project_id=$1 AND timestamp>=$2', pid, start
        )
        proj_perf.append({
            'project_id': pid,
            'name': project_names[pid],
            'visits': int(pv or 0),
            'rules_fired': int(re_ or 0),
            'personalisation_rate': round((re_ / pv * 100), 1) if pv else 0,
        })
    proj_perf.sort(key=lambda x: x['visits'], reverse=True)

    return {
        'period': period,
        'headline': {
            'total_visits': int(total_visits or 0),
            'unique_visitors': int(unique_visitors or 0),
            'rules_fired': int(rules_fired or 0),
            'personalisation_rate': personalisation_rate,
        },
        'daily_series': daily_series,
        'top_countries': top_countries,
        'device_split': device_split,
        'utm_performance': utm_performance,
        'project_performance': proj_perf,
    }
