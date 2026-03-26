from fastapi import APIRouter, Depends, HTTPException
import asyncpg
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.core.security import get_current_user
from app.services.countdown_service import (
    create_countdown, get_countdowns, get_countdown, update_countdown, delete_countdown
)

router = APIRouter(prefix="/api/countdowns", tags=["countdowns"])


class CountdownCreate(BaseModel):
    name: str
    ends_at: Optional[str] = None
    expiry_action: str = "hide"
    expiry_value: str = ""
    config: dict = {}


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
    workspace = await db.fetchrow("SELECT id FROM workspaces WHERE owner_id = $1", current_user['id'])
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    return await create_countdown(
        db, str(workspace['id']), body.name,
        body.ends_at, body.expiry_action, body.expiry_value, body.config
    )


@router.get("")
async def list_all(
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace = await db.fetchrow("SELECT id FROM workspaces WHERE owner_id = $1", current_user['id'])
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    return await get_countdowns(db, str(workspace['id']))


@router.get("/{countdown_id}")
async def get_one(
    countdown_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace = await db.fetchrow("SELECT id FROM workspaces WHERE owner_id = $1", current_user['id'])
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    countdown = await get_countdown(db, countdown_id, str(workspace['id']))
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
    workspace = await db.fetchrow("SELECT id FROM workspaces WHERE owner_id = $1", current_user['id'])
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    countdown = await update_countdown(
        db, countdown_id, str(workspace['id']),
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
    workspace = await db.fetchrow("SELECT id FROM workspaces WHERE owner_id = $1", current_user['id'])
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    deleted = await delete_countdown(db, countdown_id, str(workspace['id']))
    if not deleted:
        raise HTTPException(404, "Countdown not found")
    return {"message": "Countdown deleted"}
