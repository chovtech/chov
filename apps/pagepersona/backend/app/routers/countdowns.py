from fastapi import APIRouter, Depends, HTTPException, Query
import asyncpg
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.core.security import get_current_user
from app.core.access import get_accessible_workspace
from app.services.countdown_service import (
    create_countdown, get_countdowns, get_countdown, update_countdown, delete_countdown, _parse
)

router = APIRouter(prefix="/api/countdowns", tags=["countdowns"])


async def _resolve_countdown_workspace(db: asyncpg.Connection, countdown_id: str, user_id) -> str:
    """Return the workspace_id of the countdown, 404 if not found or not accessible."""
    row = await db.fetchrow(
        """SELECT c.workspace_id FROM countdowns c
           JOIN workspaces w ON c.workspace_id = w.id
           WHERE c.id = $1 AND (
               w.owner_id = $2
               OR EXISTS (
                   SELECT 1 FROM workspace_members wm
                   WHERE wm.workspace_id = w.id AND wm.user_id = $2
                     AND wm.status = 'active' AND wm.role != 'revoked'
               )
           )""",
        countdown_id, user_id
    )
    if not row:
        raise HTTPException(404, "Countdown not found")
    return str(row['workspace_id'])


class CountdownCreate(BaseModel):
    name: str
    ends_at: Optional[str] = None
    expiry_action: str = "hide"
    expiry_value: str = ""
    config: dict = {}
    workspace_id: Optional[str] = None


class CountdownUpdate(BaseModel):
    name: Optional[str] = None
    ends_at: Optional[str] = None
    expiry_action: Optional[str] = None
    expiry_value: Optional[str] = None
    config: Optional[dict] = None
    status: Optional[str] = None


@router.post("")
async def create(
    body: CountdownCreate,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace = await get_accessible_workspace(db, current_user['id'], body.workspace_id)
    return await create_countdown(
        db, str(workspace['id']), body.name,
        body.ends_at, body.expiry_action, body.expiry_value, body.config
    )


@router.get("")
async def list_all(
    workspace_id: Optional[str] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if workspace_id:
        workspace = await get_accessible_workspace(db, current_user['id'], workspace_id)
        return await get_countdowns(db, str(workspace['id']))
    # No workspace_id: return countdowns from all accessible workspaces
    rows = await db.fetch(
        """SELECT c.* FROM countdowns c
           JOIN workspaces w ON c.workspace_id = w.id
           WHERE w.owner_id = $1
              OR EXISTS (
                  SELECT 1 FROM workspace_members wm
                  WHERE wm.workspace_id = w.id AND wm.user_id = $1
                    AND wm.status = 'active' AND wm.role != 'revoked'
              )
           ORDER BY c.created_at DESC""",
        current_user['id']
    )
    return [_parse(r) for r in rows]


@router.get("/{countdown_id}")
async def get_one(
    countdown_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace_id = await _resolve_countdown_workspace(db, countdown_id, current_user['id'])
    countdown = await get_countdown(db, countdown_id, workspace_id)
    if not countdown:
        raise HTTPException(404, "Countdown not found")
    return countdown


@router.put("/{countdown_id}")
async def update(
    countdown_id: str,
    body: CountdownUpdate,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace_id = await _resolve_countdown_workspace(db, countdown_id, current_user['id'])
    countdown = await update_countdown(
        db, countdown_id, workspace_id,
        body.name, body.ends_at, body.expiry_action, body.expiry_value,
        body.config, body.status
    )
    if not countdown:
        raise HTTPException(404, "Countdown not found")
    return countdown


@router.delete("/{countdown_id}")
async def delete(
    countdown_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace_id = await _resolve_countdown_workspace(db, countdown_id, current_user['id'])
    deleted = await delete_countdown(db, countdown_id, workspace_id)
    if not deleted:
        raise HTTPException(404, "Countdown not found")
    return {"message": "Countdown deleted"}
