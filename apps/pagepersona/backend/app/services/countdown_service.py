import asyncpg
import uuid
import json
from typing import Optional


async def create_countdown(db: asyncpg.Connection, workspace_id: str, name: str,
                           ends_at: str, expiry_action: str, expiry_value: str,
                           config: dict) -> dict:
    row = await db.fetchrow(
        """
        INSERT INTO countdowns (id, workspace_id, name, ends_at, expiry_action, expiry_value, config, status)
        VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7::jsonb, 'draft')
        RETURNING *
        """,
        uuid.uuid4(), uuid.UUID(workspace_id), name, ends_at, expiry_action, expiry_value,
        json.dumps(config)
    )
    return _parse(row)


async def get_countdowns(db: asyncpg.Connection, workspace_id: str) -> list:
    rows = await db.fetch(
        "SELECT * FROM countdowns WHERE workspace_id = $1 ORDER BY created_at DESC",
        uuid.UUID(workspace_id)
    )
    return [_parse(r) for r in rows]


async def get_countdown(db: asyncpg.Connection, countdown_id: str, workspace_id: str) -> Optional[dict]:
    row = await db.fetchrow(
        "SELECT * FROM countdowns WHERE id = $1 AND workspace_id = $2",
        uuid.UUID(countdown_id), uuid.UUID(workspace_id)
    )
    return _parse(row) if row else None


async def update_countdown(db: asyncpg.Connection, countdown_id: str, workspace_id: str,
                           name: Optional[str] = None, ends_at: Optional[str] = None,
                           expiry_action: Optional[str] = None, expiry_value: Optional[str] = None,
                           config: Optional[dict] = None, status: Optional[str] = None) -> Optional[dict]:
    row = await db.fetchrow(
        "SELECT * FROM countdowns WHERE id = $1 AND workspace_id = $2",
        uuid.UUID(countdown_id), uuid.UUID(workspace_id)
    )
    if not row:
        return None
    current = _parse(row)
    new_name          = name          if name          is not None else current['name']
    new_ends_at       = ends_at       if ends_at       is not None else current['ends_at']
    new_expiry_action = expiry_action if expiry_action is not None else current['expiry_action']
    new_expiry_value  = expiry_value  if expiry_value  is not None else current['expiry_value']
    new_config        = config        if config        is not None else current['config']
    new_status        = status        if status        is not None else current['status']
    updated = await db.fetchrow(
        """
        UPDATE countdowns
        SET name=$1, ends_at=$2::timestamptz, expiry_action=$3, expiry_value=$4,
            config=$5::jsonb, status=$6
        WHERE id=$7 AND workspace_id=$8
        RETURNING *
        """,
        new_name, new_ends_at, new_expiry_action, new_expiry_value,
        json.dumps(new_config), new_status,
        uuid.UUID(countdown_id), uuid.UUID(workspace_id)
    )
    return _parse(updated)


async def delete_countdown(db: asyncpg.Connection, countdown_id: str, workspace_id: str) -> bool:
    result = await db.execute(
        "DELETE FROM countdowns WHERE id = $1 AND workspace_id = $2",
        uuid.UUID(countdown_id), uuid.UUID(workspace_id)
    )
    return result == "DELETE 1"


def _parse(row) -> dict:
    r = dict(row)
    if isinstance(r.get('config'), str):
        r['config'] = json.loads(r['config'])
    elif r.get('config') is None:
        r['config'] = {}
    r['id'] = str(r['id'])
    r['workspace_id'] = str(r['workspace_id'])
    if r.get('ends_at') and hasattr(r['ends_at'], 'isoformat'):
        r['ends_at'] = r['ends_at'].isoformat()
    return r
