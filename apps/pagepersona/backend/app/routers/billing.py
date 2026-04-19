"""
Billing summary endpoint — returns plan, coins, expiry, and usage meters.
"""
import uuid
import asyncpg
from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.database import get_db
from app.core.security import get_current_user
from app.core.plan_limits import PLAN_LIMITS

router = APIRouter(prefix="/api/billing", tags=["billing"])

PLAN_LABELS = {
    "trial":        "Free Trial",
    "fe":           "Core",
    "unlimited":    "Unlimited",
    "professional": "Professional",
    "agency":       "Agency",
    "owner":        "Owner",
}


@router.get("/summary")
async def billing_summary(
    workspace_id: Optional[str] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Always resolve to the user's own top-level (main) workspace.
    # Billing is per-user subscription — client sub-workspaces don't carry entitlements.
    ws = await db.fetchrow(
        """SELECT id FROM workspaces
           WHERE owner_id = $1 AND parent_workspace_id IS NULL
           ORDER BY created_at ASC LIMIT 1""",
        current_user["id"]
    )

    trial_limits = PLAN_LIMITS["trial"]
    if not ws:
        return {
            "plan": "trial", "plan_label": "Free Trial", "expires_at": None,
            "coins_balance": 0, "lifetime_coins_earned": 0, "is_unlimited_coins": False,
            "usage": {
                "projects":          {"used": 0, "limit": trial_limits["projects"]},
                "popups":            {"used": 0, "limit": trial_limits["popups"]},
                "countdowns":        {"used": 0, "limit": trial_limits["countdowns"]},
                "rules_per_project": {"used": None, "limit": trial_limits["rules_per_project"]},
                "workspaces":        {"used": 0, "limit": trial_limits["workspaces"]},
                "client_accounts":   {"used": 0, "limit": trial_limits["client_accounts"]},
            },
        }

    ws_id = uuid.UUID(str(ws["id"]))

    # Entitlement
    ent = await db.fetchrow(
        """SELECT plan, expires_at, status FROM entitlements
           WHERE workspace_id = $1 AND product_id = 'pagepersona' AND status = 'active'
           ORDER BY created_at DESC LIMIT 1""",
        ws_id
    )
    plan = ent["plan"] if ent else "trial"
    expires_at = ent["expires_at"].isoformat() if ent and ent["expires_at"] else None

    # Coins
    coins_row = await db.fetchrow(
        "SELECT balance, lifetime_earned FROM ai_coins WHERE workspace_id = $1", ws_id
    )
    coins_balance = int(coins_row["balance"]) if coins_row else 0
    lifetime_earned = int(coins_row["lifetime_earned"]) if coins_row else 0
    is_unlimited_coins = (plan == "owner")

    # Usage counts
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["trial"])

    try:
        projects_used = await db.fetchval(
            "SELECT COUNT(*) FROM projects WHERE workspace_id = $1", ws_id
        ) or 0
    except Exception:
        projects_used = 0
    try:
        popups_used = await db.fetchval(
            "SELECT COUNT(*) FROM popups WHERE workspace_id = $1", ws_id
        ) or 0
    except Exception:
        popups_used = 0
    try:
        countdowns_used = await db.fetchval(
            "SELECT COUNT(*) FROM countdowns WHERE workspace_id = $1", ws_id
        ) or 0
    except Exception:
        countdowns_used = 0
    try:
        workspaces_used = await db.fetchval(
            "SELECT COUNT(*) FROM workspaces WHERE owner_id = $1 AND parent_workspace_id IS NULL",
            current_user["id"]
        ) or 0
    except Exception:
        workspaces_used = 1
    try:
        client_accounts_used = await db.fetchval(
            "SELECT COUNT(*) FROM workspaces WHERE parent_workspace_id = $1", ws_id
        ) or 0
    except Exception:
        client_accounts_used = 0

    return {
        "plan": plan,
        "plan_label": PLAN_LABELS.get(plan, plan.title()),
        "expires_at": expires_at,
        "coins_balance": coins_balance,
        "lifetime_coins_earned": lifetime_earned,
        "is_unlimited_coins": is_unlimited_coins,
        "usage": {
            "projects": {
                "used": int(projects_used),
                "limit": limits["projects"],
            },
            "rules_per_project": {
                "used": None,
                "limit": limits["rules_per_project"],
            },
            "popups": {
                "used": int(popups_used),
                "limit": limits["popups"],
            },
            "countdowns": {
                "used": int(countdowns_used),
                "limit": limits["countdowns"],
            },
            "workspaces": {
                "used": int(workspaces_used),
                "limit": limits["workspaces"],
            },
            "client_accounts": {
                "used": int(client_accounts_used),
                "limit": limits["client_accounts"],
            },
        },
    }
