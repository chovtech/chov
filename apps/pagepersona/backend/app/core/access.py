"""
Shared workspace access helpers.

Role matrix:
  owner  — full access to everything
  admin  — full CRUD on projects/rules/popups/countdowns, can invite/remove members
  member — read + edit on projects, full CRUD on rules/popups/countdowns,
           cannot create or delete projects
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
    Return a workspace the user can access (as owner, active team member, or full-access client).
    If workspace_id is provided, look up that specific workspace.
    Otherwise fall back to the user's own workspace (ordered by created_at).
    Raises 404 if not found or not accessible.
    """
    if workspace_id:
        row = await db.fetchrow(
            f"SELECT w.* FROM workspaces w WHERE w.id = $1 AND {_MEMBER_CHECK}",
            workspace_id, user_id
        )
        # Also allow client users (full or view_only) to access their assigned workspace.
        # require_admin_or_owner will then enforce write restrictions for view_only clients.
        if not row:
            row = await db.fetchrow(
                """SELECT w.* FROM workspaces w
                   JOIN workspace_members wm ON wm.workspace_id = w.id
                   WHERE w.id = $1 AND wm.user_id = $2
                     AND wm.role = 'client' AND wm.status = 'active'""",
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


async def require_admin_or_owner(
    db: asyncpg.Connection,
    user_id,
    workspace_id: str,
) -> None:
    """
    Raise 403 if user is a plain 'member' (not owner or admin).
    Used for project create and delete — operations members cannot perform.
    """
    # Owner always passes
    is_owner = await db.fetchval(
        "SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2",
        workspace_id, user_id
    )
    if is_owner:
        return

    # Check admin membership
    is_admin = await db.fetchval(
        """SELECT 1 FROM workspace_members
           WHERE workspace_id = $1 AND user_id = $2
             AND role = 'admin' AND status = 'active'""",
        workspace_id, user_id
    )
    if is_admin:
        return

    # Full-access clients can also create/delete projects in their workspace
    is_full_client = await db.fetchval(
        """SELECT 1 FROM workspace_members wm
           JOIN workspaces w ON wm.workspace_id = w.id
           WHERE wm.workspace_id = $1 AND wm.user_id = $2
             AND wm.role = 'client' AND wm.status = 'active'
             AND w.client_access_level = 'full'""",
        workspace_id, user_id
    )
    if is_full_client:
        return

    raise HTTPException(status_code=403, detail="Members cannot perform this action")
