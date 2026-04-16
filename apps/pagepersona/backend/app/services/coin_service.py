"""
AI Coin Service — PagePersona

Manages the AI coin economy:
- One ai_coins row per workspace (balance + lifetime earned)
- Every AI action deducts coins and logs to ai_coin_transactions
- Owner plan always bypasses coin checks (unlimited)
- Plan allocations are the starting balance on signup
"""
import uuid
import json
from typing import Optional
import asyncpg
from fastapi import HTTPException

# Starting coin allocation by plan
PLAN_COIN_ALLOCATIONS: dict[str, Optional[int]] = {
    "trial":        20,
    "fe":           50,
    "unlimited":    200,
    "professional": 200,
    "agency":       500,
    "owner":        None,   # None = unlimited, never deducted
}

# Cost per AI action (provisional — updated after empirical testing)
COIN_COSTS: dict[str, int] = {
    "write_copy":           5,
    "generate_image":       10,
    "popup_content":        5,
    "analytics_insights":   8,
    "rule_creation_ai":     15,
    "rule_suggestion":      3,
}


async def _get_plan(workspace_id: uuid.UUID, db: asyncpg.Connection) -> str:
    row = await db.fetchrow(
        """SELECT plan FROM entitlements
           WHERE workspace_id = $1 AND product_id = 'pagepersona' AND status = 'active'
           ORDER BY created_at DESC LIMIT 1""",
        workspace_id
    )
    return row["plan"] if row else "trial"


async def get_balance(workspace_id: str, db: asyncpg.Connection) -> dict:
    """
    Return coin balance and plan info for a workspace.
    {balance, plan, is_unlimited, allocations}
    """
    ws_id = uuid.UUID(workspace_id)
    plan = await _get_plan(ws_id, db)
    is_unlimited = (plan == "owner")

    row = await db.fetchrow(
        "SELECT balance, lifetime_earned FROM ai_coins WHERE workspace_id = $1",
        ws_id
    )
    balance = None if is_unlimited else (row["balance"] if row else 0)

    return {
        "balance": balance,
        "plan": plan,
        "is_unlimited": is_unlimited,
        "allocations": PLAN_COIN_ALLOCATIONS,
        "coin_costs": COIN_COSTS,
    }


async def check_coins(workspace_id: str, action_type: str, db: asyncpg.Connection) -> None:
    """
    Raise HTTP 402 if the workspace cannot afford the action.
    Owner plan always passes.
    """
    ws_id = uuid.UUID(workspace_id)
    plan = await _get_plan(ws_id, db)

    if plan == "owner":
        return

    cost = COIN_COSTS.get(action_type, 0)
    if cost == 0:
        return

    row = await db.fetchrow(
        "SELECT balance FROM ai_coins WHERE workspace_id = $1",
        ws_id
    )
    current = row["balance"] if row else 0

    if current < cost:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "insufficient_coins",
                "balance": current,
                "required": cost,
                "action": action_type,
            }
        )


async def deduct_coins(
    workspace_id: str,
    action_type: str,
    db: asyncpg.Connection,
    claude_tokens_used: Optional[int] = None,
    fal_image_generated: bool = False,
    metadata: Optional[dict] = None,
) -> int:
    """
    Deduct coins for an action and log the transaction.
    Owner plan: logs transaction but deducts 0.
    Returns new balance (None for owner/unlimited).
    """
    ws_id = uuid.UUID(workspace_id)
    plan = await _get_plan(ws_id, db)
    cost = COIN_COSTS.get(action_type, 0)

    if plan == "owner":
        # Log but do not deduct
        await db.execute(
            """INSERT INTO ai_coin_transactions
               (id, workspace_id, action_type, coins_deducted, claude_tokens_used, fal_image_generated, metadata)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            uuid.uuid4(), ws_id, action_type, 0,
            claude_tokens_used, fal_image_generated,
            json.dumps(metadata or {})
        )
        return None

    # Atomic deduct
    row = await db.fetchrow(
        """UPDATE ai_coins
           SET balance = GREATEST(balance - $1, 0),
               updated_at = now()
           WHERE workspace_id = $2
           RETURNING balance""",
        cost, ws_id
    )
    new_balance = row["balance"] if row else 0

    # Log transaction
    await db.execute(
        """INSERT INTO ai_coin_transactions
           (id, workspace_id, action_type, coins_deducted, claude_tokens_used, fal_image_generated, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)""",
        uuid.uuid4(), ws_id, action_type, cost,
        claude_tokens_used, fal_image_generated,
        json.dumps(metadata or {})
    )

    return new_balance


async def seed_coins(workspace_id: str, plan: str, db: asyncpg.Connection) -> None:
    """
    Create the ai_coins row for a new workspace (called on signup / plan upgrade).
    Owner plan gets 0 (unlimited — balance is never read for them).
    """
    ws_id = uuid.UUID(workspace_id)
    allocation = PLAN_COIN_ALLOCATIONS.get(plan, 20)
    starting_balance = 0 if allocation is None else allocation

    await db.execute(
        """INSERT INTO ai_coins (id, workspace_id, balance, lifetime_earned)
           VALUES ($1, $2, $3, $3)
           ON CONFLICT (workspace_id) DO UPDATE
               SET balance = EXCLUDED.balance,
                   lifetime_earned = EXCLUDED.lifetime_earned,
                   updated_at = now()""",
        uuid.uuid4(), ws_id, starting_balance
    )
