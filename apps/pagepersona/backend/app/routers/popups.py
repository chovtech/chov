from fastapi import APIRouter, Depends, HTTPException, Query
import asyncpg
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.core.security import get_current_user
from app.core.access import get_accessible_workspace
from app.services.popup_service import (
    create_popup, get_popups, get_popup, update_popup, delete_popup
)

router = APIRouter(prefix="/api/popups", tags=["popups"])

_MEMBER_ACCESS = """
    (
        w.owner_id = $1
        OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = w.id AND wm.user_id = $1
              AND wm.status = 'active' AND wm.role != 'revoked'
        )
    )
"""


async def _resolve_popup_workspace(db: asyncpg.Connection, popup_id: str, user_id) -> str:
    """Return the workspace_id of the popup, 404 if not found or not accessible."""
    row = await db.fetchrow(
        """SELECT p.workspace_id FROM popups p
           JOIN workspaces w ON p.workspace_id = w.id
           WHERE p.id = $1 AND (
               w.owner_id = $2
               OR EXISTS (
                   SELECT 1 FROM workspace_members wm
                   WHERE wm.workspace_id = w.id AND wm.user_id = $2
                     AND wm.status = 'active' AND wm.role != 'revoked'
               )
           )""",
        popup_id, user_id
    )
    if not row:
        raise HTTPException(404, "Popup not found")
    return str(row['workspace_id'])


class PopupCreate(BaseModel):
    name: str
    config: dict = {}
    workspace_id: Optional[str] = None


class PopupUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[dict] = None
    status: Optional[str] = None


@router.post("")
async def create(
    body: PopupCreate,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace = await get_accessible_workspace(db, current_user['id'], body.workspace_id)
    return await create_popup(db, str(workspace['id']), body.name, body.config)


@router.get("")
async def list_all(
    workspace_id: Optional[str] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if workspace_id:
        workspace = await get_accessible_workspace(db, current_user['id'], workspace_id)
        return await get_popups(db, str(workspace['id']))
    # No workspace_id: return popups from all accessible workspaces
    rows = await db.fetch(
        f"""SELECT p.* FROM popups p
            JOIN workspaces w ON p.workspace_id = w.id
            WHERE {_MEMBER_ACCESS}
            ORDER BY p.created_at DESC""",
        current_user['id']
    )
    return [dict(r) for r in rows]


@router.get("/{popup_id}")
async def get_one(
    popup_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace_id = await _resolve_popup_workspace(db, popup_id, current_user['id'])
    popup = await get_popup(db, popup_id, workspace_id)
    if not popup:
        raise HTTPException(404, "Popup not found")
    return popup


@router.put("/{popup_id}")
async def update(
    popup_id: str,
    body: PopupUpdate,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace_id = await _resolve_popup_workspace(db, popup_id, current_user['id'])
    popup = await update_popup(db, popup_id, workspace_id, body.name, body.config, body.status)
    if not popup:
        raise HTTPException(404, "Popup not found")
    return popup


@router.delete("/{popup_id}")
async def delete(
    popup_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace_id = await _resolve_popup_workspace(db, popup_id, current_user['id'])
    deleted = await delete_popup(db, popup_id, workspace_id)
    if not deleted:
        raise HTTPException(404, "Popup not found")
    return {"message": "Popup deleted"}
