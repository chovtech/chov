from fastapi import APIRouter, Depends, HTTPException, Query
import asyncpg
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.core.security import get_current_user
from app.core.access import get_accessible_workspace
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
    workspace = await get_accessible_workspace(db, current_user['id'])
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
    workspace = await get_accessible_workspace(db, current_user['id'], workspace_id)
    return await get_countdowns(db, str(workspace['id']))


@router.get("/{countdown_id}")
async def get_one(
    countdown_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace = await get_accessible_workspace(db, current_user['id'])
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
    workspace = await get_accessible_workspace(db, current_user['id'])
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
    workspace = await get_accessible_workspace(db, current_user['id'])
    deleted = await delete_countdown(db, countdown_id, str(workspace['id']))
    if not deleted:
        raise HTTPException(404, "Countdown not found")
    return {"message": "Countdown deleted"}
