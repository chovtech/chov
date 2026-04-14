"""
AI Router — PagePersona

Endpoints:
  GET  /api/ai/coins          — coin balance + plan info for current workspace
  GET  /api/ai/coins/history  — recent coin transaction log
"""
from fastapi import APIRouter, Depends, Query
import asyncpg
from app.database import get_db
from app.core.security import get_current_user
from app.core.access import get_accessible_workspace
from app.services.coin_service import get_balance

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/coins")
async def coins_balance(
    workspace_id: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Return AI coin balance, plan, and cost reference for the workspace."""
    workspace = await get_accessible_workspace(db, current_user["id"], workspace_id)
    return await get_balance(str(workspace["id"]), db)


@router.get("/coins/history")
async def coins_history(
    workspace_id: str | None = Query(default=None),
    limit: int = Query(default=20, le=100),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Return recent AI coin transactions for the workspace."""
    workspace = await get_accessible_workspace(db, current_user["id"], workspace_id)
    rows = await db.fetch(
        """SELECT action_type, coins_deducted, claude_tokens_used,
                  fal_image_generated, metadata, created_at
           FROM ai_coin_transactions
           WHERE workspace_id = $1
           ORDER BY created_at DESC
           LIMIT $2""",
        workspace["id"], limit
    )
    return [dict(r) for r in rows]
