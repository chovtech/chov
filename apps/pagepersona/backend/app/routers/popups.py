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


class PopupCreate(BaseModel):
    name: str
    config: dict = {}


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
    workspace = await get_accessible_workspace(db, current_user['id'])
    return await create_popup(db, str(workspace['id']), body.name, body.config)


@router.get("")
async def list_all(
    workspace_id: Optional[str] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace = await get_accessible_workspace(db, current_user['id'], workspace_id)
    return await get_popups(db, str(workspace['id']))


@router.get("/{popup_id}")
async def get_one(
    popup_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace = await get_accessible_workspace(db, current_user['id'])
    popup = await get_popup(db, popup_id, str(workspace['id']))
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
    workspace = await get_accessible_workspace(db, current_user['id'])
    popup = await update_popup(db, popup_id, str(workspace['id']), body.name, body.config, body.status)
    if not popup:
        raise HTTPException(404, "Popup not found")
    return popup


@router.delete("/{popup_id}")
async def delete(
    popup_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace = await get_accessible_workspace(db, current_user['id'])
    deleted = await delete_popup(db, popup_id, str(workspace['id']))
    if not deleted:
        raise HTTPException(404, "Popup not found")
    return {"message": "Popup deleted"}
