from fastapi import APIRouter, Depends, HTTPException, Query
import asyncpg
import uuid
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.database import get_db
from app.core.security import get_current_user, hash_password, create_access_token, create_refresh_token
from app.services.email_service import send_team_invite_email, send_team_invite_existing_user_email
from app.core.config import settings

router = APIRouter(prefix="/api/team", tags=["team"])


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: str = "member"  # "member" | "admin"
    workspace_id: Optional[str] = None


class UpdateRoleRequest(BaseModel):
    role: str


class AcceptInviteRequest(BaseModel):
    token: str
    name: Optional[str] = None
    password: Optional[str] = None


def _fmt(m) -> dict:
    return {
        "id": str(m["id"]),
        "workspace_id": str(m["workspace_id"]),
        "user_id": str(m["user_id"]) if m["user_id"] else None,
        "email": m["email"],
        "role": m["role"],
        "status": m["status"],
        "invited_at": m["invited_at"].isoformat() if m["invited_at"] else None,
        "joined_at": m["joined_at"].isoformat() if m["joined_at"] else None,
    }


async def _owner_workspace(db, current_user, workspace_id: str | None = None) -> dict:
    """Resolve a workspace the current_user owns.
    If workspace_id given, verifies ownership of that specific workspace.
    Raises 403 if not owner."""
    if workspace_id:
        ws = await db.fetchrow(
            "SELECT * FROM workspaces WHERE id = $1 AND owner_id = $2",
            workspace_id, current_user["id"]
        )
    else:
        ws = await db.fetchrow(
            "SELECT * FROM workspaces WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1",
            current_user["id"]
        )
    if not ws:
        raise HTTPException(status_code=403, detail="Only the workspace owner can perform this action")
    return dict(ws)


async def _admin_or_owner_workspace(db, current_user, workspace_id: str | None = None) -> dict:
    """Workspace accessible to current_user as owner OR admin.
    If workspace_id given, checks that specific workspace. Otherwise falls back to own workspace."""
    if workspace_id:
        ws = await db.fetchrow(
            """SELECT w.* FROM workspaces w
               WHERE w.id = $1 AND (
                   w.owner_id = $2
                   OR EXISTS (
                       SELECT 1 FROM workspace_members wm
                       WHERE wm.workspace_id = w.id AND wm.user_id = $2
                         AND wm.role = 'admin' AND wm.status = 'active'
                   )
               )""",
            workspace_id, current_user["id"]
        )
        if not ws:
            raise HTTPException(status_code=403, detail="Admin access required")
        return dict(ws)
    # No workspace_id — fall back to own workspace first, then any admin workspace
    ws = await db.fetchrow(
        "SELECT * FROM workspaces WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1",
        current_user["id"]
    )
    if ws:
        return dict(ws)
    row = await db.fetchrow(
        """SELECT w.* FROM workspaces w
           JOIN workspace_members wm ON wm.workspace_id = w.id
           WHERE wm.user_id = $1 AND wm.role = 'admin' AND wm.status = 'active'
           LIMIT 1""",
        current_user["id"]
    )
    if not row:
        raise HTTPException(status_code=403, detail="Admin access required")
    return dict(row)


# ── List members ──────────────────────────────────────────────────────────────

@router.get("")
async def list_members(
    workspace_id: Optional[str] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ws = await _admin_or_owner_workspace(db, current_user, workspace_id)
    rows = await db.fetch(
        "SELECT * FROM workspace_members WHERE workspace_id = $1 ORDER BY invited_at ASC",
        ws["id"]
    )
    return [_fmt(r) for r in rows]


# ── Invite info (unauthenticated) ─────────────────────────────────────────────

@router.get("/invite-info")
async def invite_info(
    token: str = Query(...),
    db: asyncpg.Connection = Depends(get_db)
):
    """Return workspace name and whether the invited email already has an account."""
    member = await db.fetchrow(
        """SELECT wm.id, wm.email, wm.role, wm.status,
                  w.name as workspace_name, w.id as workspace_id
           FROM workspace_members wm
           JOIN workspaces w ON wm.workspace_id = w.id
           WHERE wm.invite_token = $1""",
        token
    )
    if not member:
        raise HTTPException(status_code=404, detail="Invalid invite link")
    if member["status"] == "active":
        raise HTTPException(status_code=409, detail="This invitation has already been accepted")

    user_exists = await db.fetchrow(
        "SELECT id FROM users WHERE email = $1", member["email"]
    )
    return {
        "workspace_name": member["workspace_name"],
        "email": member["email"],
        "role": member["role"],
        "user_exists": user_exists is not None,
    }


# ── Invite member ─────────────────────────────────────────────────────────────

@router.post("/invite")
async def invite_member(
    body: InviteMemberRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if body.role not in ("member", "admin"):
        raise HTTPException(status_code=422, detail="Role must be 'member' or 'admin'")

    ws = await _admin_or_owner_workspace(db, current_user, body.workspace_id)

    # Block inviting yourself
    self_user = await db.fetchrow("SELECT email FROM users WHERE id = $1", current_user["id"])
    if self_user and self_user["email"] == body.email:
        raise HTTPException(status_code=400, detail="You cannot invite yourself")

    # Block inviting the workspace owner
    owner_user = await db.fetchrow(
        "SELECT u.email FROM users u JOIN workspaces w ON u.id = w.owner_id WHERE w.id = $1",
        ws["id"]
    )
    if owner_user and owner_user["email"] == body.email:
        raise HTTPException(status_code=400, detail="This person is already the workspace owner")

    # Check existing pending/active invite
    existing = await db.fetchrow(
        "SELECT id, status FROM workspace_members WHERE workspace_id = $1 AND email = $2",
        ws["id"], body.email
    )
    if existing and existing["status"] == "active":
        raise HTTPException(status_code=400, detail="This email is already an active team member")
    if existing and existing["status"] == "pending":
        raise HTTPException(status_code=400, detail="A pending invitation already exists for this email. Use resend to send a new link.")

    token = str(uuid.uuid4())
    accept_url = f"{settings.FRONTEND_URL}/team-accept?token={token}"

    member = await db.fetchrow(
        """INSERT INTO workspace_members (workspace_id, email, role, status, invite_token)
           VALUES ($1, $2, $3, 'pending', $4)
           RETURNING *""",
        ws["id"], body.email, body.role, token
    )

    # Send email — different copy depending on whether they have an account
    user_exists = await db.fetchrow("SELECT id FROM users WHERE email = $1", body.email)
    inviter = await db.fetchrow("SELECT name FROM users WHERE id = $1", current_user["id"])
    inviter_name = inviter["name"] if inviter else "Your team"

    if user_exists:
        send_team_invite_existing_user_email(
            to_email=body.email,
            workspace_name=ws["name"],
            inviter_name=inviter_name,
            accept_url=accept_url,
        )
    else:
        send_team_invite_email(
            to_email=body.email,
            workspace_name=ws["name"],
            inviter_name=inviter_name,
            accept_url=accept_url,
        )

    return _fmt(member)


# ── Resend invite ─────────────────────────────────────────────────────────────

@router.post("/{member_id}/resend")
async def resend_invite(
    member_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    member = await db.fetchrow(
        "SELECT * FROM workspace_members WHERE id = $1 AND status = 'pending'", member_id
    )
    if not member:
        raise HTTPException(status_code=404, detail="Pending invite not found")

    ws = await _admin_or_owner_workspace(db, current_user, str(member["workspace_id"]))

    token = str(uuid.uuid4())
    accept_url = f"{settings.FRONTEND_URL}/team-accept?token={token}"

    updated = await db.fetchrow(
        """UPDATE workspace_members SET invite_token = $1, invited_at = NOW()
           WHERE id = $2 RETURNING *""",
        token, member_id
    )

    user_exists = await db.fetchrow("SELECT id FROM users WHERE email = $1", member["email"])
    inviter = await db.fetchrow("SELECT name FROM users WHERE id = $1", current_user["id"])
    inviter_name = inviter["name"] if inviter else "Your team"

    if user_exists:
        send_team_invite_existing_user_email(
            to_email=member["email"], workspace_name=ws["name"],
            inviter_name=inviter_name, accept_url=accept_url,
        )
    else:
        send_team_invite_email(
            to_email=member["email"], workspace_name=ws["name"],
            inviter_name=inviter_name, accept_url=accept_url,
        )

    return _fmt(updated)


# ── Accept invite ─────────────────────────────────────────────────────────────

@router.post("/accept")
async def accept_invite(
    body: AcceptInviteRequest,
    db: asyncpg.Connection = Depends(get_db)
):
    """Accept team invite — create account + own workspace if new, else use existing user."""
    member = await db.fetchrow(
        """SELECT wm.*, w.name as workspace_name
           FROM workspace_members wm
           JOIN workspaces w ON wm.workspace_id = w.id
           WHERE wm.invite_token = $1 AND wm.status = 'pending'""",
        body.token
    )
    if not member:
        raise HTTPException(status_code=404, detail="Invalid or already accepted invite link")

    email = member["email"]
    now = datetime.now(timezone.utc)

    existing_user = await db.fetchrow("SELECT * FROM users WHERE email = $1", email)

    if existing_user:
        user = existing_user
    else:
        if not body.name or not body.password:
            raise HTTPException(status_code=400, detail="Name and password are required to create your account")
        if len(body.password) < 8:
            raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
        hashed = hash_password(body.password)
        user = await db.fetchrow(
            """INSERT INTO users (email, name, password_hash, email_verified, language)
               VALUES ($1, $2, $3, true, 'en')
               RETURNING *""",
            email, body.name, hashed
        )
        # Create their own personal workspace
        ws_name = f"{body.name}'s Workspace"
        ws_slug_base = body.name.lower().strip().replace(" ", "-")
        ws_slug = ws_slug_base
        count = await db.fetchval("SELECT COUNT(*) FROM workspaces WHERE slug = $1", ws_slug)
        if count:
            ws_slug = f"{ws_slug_base}-{str(uuid.uuid4())[:8]}"
        await db.execute(
            """INSERT INTO workspaces (name, slug, owner_id, type)
               VALUES ($1, $2, $3, 'personal')""",
            ws_name, ws_slug, str(user["id"])
        )

    # Activate the workspace_members row
    await db.execute(
        """UPDATE workspace_members
           SET user_id = $1, status = 'active', joined_at = $2, invite_token = NULL
           WHERE id = $3""",
        str(user["id"]), now, member["id"]
    )

    access_token = create_access_token({"sub": str(user["id"])})
    refresh_token = create_refresh_token({"sub": str(user["id"])})
    await db.execute(
        "INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
        str(user["id"]), refresh_token
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {"id": str(user["id"]), "email": user["email"], "name": user["name"]},
        "workspace_name": member["workspace_name"],
    }


# ── Update role ───────────────────────────────────────────────────────────────

@router.patch("/{member_id}/role")
async def update_member_role(
    member_id: str,
    body: UpdateRoleRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if body.role not in ("member", "admin"):
        raise HTTPException(status_code=422, detail="Role must be 'member' or 'admin'")
    # Look up workspace from the member record, then verify ownership
    member = await db.fetchrow("SELECT workspace_id FROM workspace_members WHERE id = $1", member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    ws = await _owner_workspace(db, current_user, str(member["workspace_id"]))  # only owner can change roles
    updated = await db.fetchrow(
        """UPDATE workspace_members SET role = $1
           WHERE id = $2 AND workspace_id = $3
           RETURNING *""",
        body.role, member_id, ws["id"]
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Member not found")
    return _fmt(updated)


# ── Remove member ─────────────────────────────────────────────────────────────

@router.delete("/{member_id}")
async def remove_member(
    member_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Look up workspace from the member record, then verify admin/owner access
    member = await db.fetchrow("SELECT workspace_id FROM workspace_members WHERE id = $1", member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    ws = await _admin_or_owner_workspace(db, current_user, str(member["workspace_id"]))
    deleted = await db.fetchrow(
        "DELETE FROM workspace_members WHERE id = $1 AND workspace_id = $2 RETURNING id",
        member_id, ws["id"]
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"ok": True}
