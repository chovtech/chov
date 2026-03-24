import asyncpg
import uuid
from typing import Optional

async def create_popup(db: asyncpg.Connection, workspace_id: str, name: str, config: dict) -> dict:
    row = await db.fetchrow(
        """
        INSERT INTO popups (id, workspace_id, name, config, status)
        VALUES ($1, $2, $3, $4::jsonb, 'draft')
        RETURNING *
        """,
        uuid.uuid4(), uuid.UUID(workspace_id), name, __import__('json').dumps(config)
    )
    return _parse(row)

async def get_popups(db: asyncpg.Connection, workspace_id: str) -> list:
    rows = await db.fetch(
        "SELECT * FROM popups WHERE workspace_id = $1 ORDER BY created_at DESC",
        uuid.UUID(workspace_id)
    )
    return [_parse(r) for r in rows]

async def get_popup(db: asyncpg.Connection, popup_id: str, workspace_id: str) -> Optional[dict]:
    row = await db.fetchrow(
        "SELECT * FROM popups WHERE id = $1 AND workspace_id = $2",
        uuid.UUID(popup_id), uuid.UUID(workspace_id)
    )
    return _parse(row) if row else None

async def update_popup(db: asyncpg.Connection, popup_id: str, workspace_id: str,
                       name: Optional[str] = None, config: Optional[dict] = None,
                       status: Optional[str] = None) -> Optional[dict]:
    row = await db.fetchrow(
        "SELECT * FROM popups WHERE id = $1 AND workspace_id = $2",
        uuid.UUID(popup_id), uuid.UUID(workspace_id)
    )
    if not row:
        return None
    current = _parse(row)
    new_name   = name   if name   is not None else current['name']
    new_config = config if config is not None else current['config']
    new_status = status if status is not None else current['status']
    updated = await db.fetchrow(
        """
        UPDATE popups SET name=$1, config=$2::jsonb, status=$3, updated_at=NOW()
        WHERE id=$4 AND workspace_id=$5 RETURNING *
        """,
        new_name, __import__('json').dumps(new_config),
        new_status, uuid.UUID(popup_id), uuid.UUID(workspace_id)
    )
    return _parse(updated)

async def delete_popup(db: asyncpg.Connection, popup_id: str, workspace_id: str) -> bool:
    result = await db.execute(
        "DELETE FROM popups WHERE id = $1 AND workspace_id = $2",
        uuid.UUID(popup_id), uuid.UUID(workspace_id)
    )
    return result == "DELETE 1"

def _parse(row) -> dict:
    import json
    r = dict(row)
    if isinstance(r.get('config'), str):
        r['config'] = json.loads(r['config'])
    r['id'] = str(r['id'])
    r['workspace_id'] = str(r['workspace_id'])
    return r
