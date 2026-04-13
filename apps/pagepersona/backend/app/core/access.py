"""
Shared workspace access helpers.

All authenticated endpoints use one of these to resolve the workspace,
so team members (workspace_members rows) get access alongside the owner.
"""
import asyncpg
from fastapi import HTTPException


_MEMBER_CHECK = """
    (
        w.owner_id = $2
        OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = w.id
              AND wm.user_id = $2
              AND wm.status = 'active'
              AND wm.role NOT IN ('client', 'revoked')
        )
    )
"""


async def get_accessible_workspace(
    db: asyncpg.Connection,
    user_id,
    workspace_id: str | None = None,
) -> dict:
    """
    Return a workspace the user can access (as owner or active team member).
    If workspace_id is provided, look up that specific workspace.
    Otherwise fall back to the user's own workspace (ordered by created_at).
    Raises 404 if not found or not accessible.
    """
    if workspace_id:
        row = await db.fetchrow(
            f"SELECT w.* FROM workspaces w WHERE w.id = $1 AND {_MEMBER_CHECK}",
            workspace_id, user_id
        )
    else:
        # Owner's own workspace first, then any member workspace
        row = await db.fetchrow(
            f"""SELECT w.* FROM workspaces w
                LEFT JOIN workspace_members wm
                       ON wm.workspace_id = w.id AND wm.user_id = $1
                          AND wm.status = 'active' AND wm.role NOT IN ('client', 'revoked')
                WHERE w.owner_id = $1 OR wm.id IS NOT NULL
                ORDER BY CASE WHEN w.owner_id = $1 THEN 0 ELSE 1 END,
                         w.created_at ASC
                LIMIT 1""",
            user_id
        )
    if not row:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return dict(row)
