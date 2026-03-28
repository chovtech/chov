from fastapi import APIRouter, Depends, HTTPException
import asyncpg
import uuid
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.database import get_db
from app.core.security import get_current_user
from app.services.email_service import send_email

router = APIRouter(prefix="/api/team", tags=["team"])


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: str = "member"


class UpdateRoleRequest(BaseModel):
    role: str


def _fmt(m) -> dict:
    return {
        "id": str(m['id']),
        "workspace_id": str(m['workspace_id']),
        "user_id": str(m['user_id']) if m['user_id'] else None,
        "email": m['email'],
        "role": m['role'],
        "status": m['status'],
        "invited_at": m['invited_at'].isoformat() if m['invited_at'] else None,
        "joined_at": m['joined_at'].isoformat() if m['joined_at'] else None,
    }


async def _get_workspace(db, current_user):
    ws = await db.fetchrow(
        "SELECT * FROM workspaces WHERE owner_id = $1 LIMIT 1",
        current_user['id']
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


@router.get("")
async def list_members(
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ws = await _get_workspace(db, current_user)
    rows = await db.fetch(
        "SELECT * FROM workspace_members WHERE workspace_id = $1 ORDER BY invited_at ASC",
        ws['id']
    )
    return [_fmt(r) for r in rows]


@router.post("/invite")
async def invite_member(
    body: InviteMemberRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ws = await _get_workspace(db, current_user)

    # Check if already a member
    existing = await db.fetchrow(
        "SELECT id FROM workspace_members WHERE workspace_id = $1 AND email = $2",
        ws['id'], body.email
    )
    if existing:
        raise HTTPException(status_code=400, detail="This email is already a member or has a pending invite")

    member = await db.fetchrow(
        """INSERT INTO workspace_members (workspace_id, email, role, status)
           VALUES ($1, $2, $3, 'pending')
           RETURNING *""",
        ws['id'], body.email, body.role
    )

    # Send invite email
    invite_html = f"""
    <p>You've been invited to join <strong>{ws['name']}</strong> on PagePersona.</p>
    <p>Sign up or log in to accept your invitation.</p>
    <p><a href="https://app.usepagepersona.com/signup">Accept Invitation</a></p>
    """
    await send_email(body.email, f"You've been invited to {ws['name']}", invite_html)

    return _fmt(member)


@router.patch("/{member_id}/role")
async def update_member_role(
    member_id: str,
    body: UpdateRoleRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ws = await _get_workspace(db, current_user)
    updated = await db.fetchrow(
        """UPDATE workspace_members SET role = $1
           WHERE id = $2 AND workspace_id = $3
           RETURNING *""",
        body.role, member_id, ws['id']
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Member not found")
    return _fmt(updated)


@router.delete("/{member_id}")
async def remove_member(
    member_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ws = await _get_workspace(db, current_user)
    deleted = await db.fetchrow(
        "DELETE FROM workspace_members WHERE id = $1 AND workspace_id = $2 RETURNING id",
        member_id, ws['id']
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"ok": True}
