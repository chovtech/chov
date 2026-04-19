"""
Plan limit enforcement for PagePersona.

Plans with None as a limit = unlimited.
Owner plan bypasses all limits.
"""
import uuid
import asyncpg
from fastapi import HTTPException

# None = unlimited
PLAN_LIMITS: dict[str, dict] = {
    "trial": {
        "projects":          1,
        "rules_per_project": 3,
        "popups":            1,
        "countdowns":        1,
        "workspaces":        1,
        "client_accounts":   0,
    },
    "fe": {
        "projects":          5,
        "rules_per_project": 10,
        "popups":            10,
        "countdowns":        5,
        "workspaces":        1,
        "client_accounts":   0,
    },
    "unlimited":    {"projects": None, "rules_per_project": None, "popups": None, "countdowns": None, "workspaces": None, "client_accounts": 0},
    "professional": {"projects": None, "rules_per_project": None, "popups": None, "countdowns": None, "workspaces": None, "client_accounts": 0},
    "agency":       {"projects": None, "rules_per_project": None, "popups": None, "countdowns": None, "workspaces": None, "client_accounts": 100},
    "owner":        {"projects": None, "rules_per_project": None, "popups": None, "countdowns": None, "workspaces": None, "client_accounts": None},
}

_COUNT_QUERIES: dict[str, str] = {
    "projects":          "SELECT COUNT(*) FROM projects WHERE workspace_id = $1",
    "popups":            "SELECT COUNT(*) FROM popups   WHERE workspace_id = $1",
    "countdowns":        "SELECT COUNT(*) FROM countdowns WHERE workspace_id = $1",
    "rules_per_project": "SELECT COUNT(*) FROM rules WHERE project_id = $1",
}


async def _get_plan(workspace_id: uuid.UUID, db: asyncpg.Connection) -> str:
    row = await db.fetchrow(
        """SELECT plan FROM entitlements
           WHERE workspace_id = $1 AND product_id = 'pagepersona' AND status = 'active'
           ORDER BY created_at DESC LIMIT 1""",
        workspace_id
    )
    return row["plan"] if row else "trial"


async def enforce_plan_limit(
    resource: str,
    scope_id: str,
    db: asyncpg.Connection,
    workspace_id: str,
) -> None:
    """
    Check whether adding one more `resource` would exceed the workspace's plan limit.

    resource    — 'projects' | 'rules_per_project' | 'popups' | 'countdowns'
    scope_id    — workspace_id for workspace-scoped resources; project_id for rules
    workspace_id — always the real workspace UUID (used for plan lookup)

    Raises HTTP 402 if over limit.
    """
    ws_uuid = uuid.UUID(workspace_id)
    plan = await _get_plan(ws_uuid, db)

    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["trial"])
    limit = limits.get(resource)

    if limit is None:
        return  # unlimited

    current = await db.fetchval(_COUNT_QUERIES[resource], uuid.UUID(scope_id))
    if current >= limit:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "plan_limit_reached",
                "resource": resource,
                "limit": limit,
                "plan": plan,
            },
        )
