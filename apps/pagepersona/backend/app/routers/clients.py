from fastapi import APIRouter, Depends, HTTPException
import asyncpg
import uuid
import re
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.database import get_db
from app.core.security import get_current_user
from app.services.email_service import send_email

router = APIRouter(prefix="/api/clients", tags=["clients"])


class InviteClientRequest(BaseModel):
    client_email: EmailStr
    workspace_id: str


class SendReportRequest(BaseModel):
    workspace_id: str
    client_workspace_id: str
    message: Optional[str] = None


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    return slug.strip('-')


@router.post("/invite")
async def invite_client(
    body: InviteClientRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Invite a client to manage their own workspace under your agency workspace."""
    # Verify agency workspace ownership
    agency_ws = await db.fetchrow(
        "SELECT * FROM workspaces WHERE id = $1 AND owner_id = $2",
        body.workspace_id, current_user['id']
    )
    if not agency_ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Check for existing pending invite
    existing = await db.fetchrow(
        "SELECT id FROM client_invites WHERE workspace_id = $1 AND client_email = $2 AND status = 'pending'",
        body.workspace_id, body.client_email
    )
    if existing:
        raise HTTPException(status_code=400, detail="A pending invite already exists for this email")

    # Create client workspace for them
    base_slug = _slugify(body.client_email.split('@')[0])
    slug = base_slug
    count = await db.fetchval("SELECT COUNT(*) FROM workspaces WHERE slug = $1", slug)
    if count:
        slug = f"{base_slug}-{str(uuid.uuid4())[:8]}"

    client_ws = await db.fetchrow(
        """INSERT INTO workspaces (name, slug, owner_id, type, parent_workspace_id, client_email)
           VALUES ($1, $2, $3, 'client', $4, $5)
           RETURNING *""",
        body.client_email, slug, current_user['id'], body.workspace_id, body.client_email
    )

    token = str(uuid.uuid4())
    invite = await db.fetchrow(
        """INSERT INTO client_invites (workspace_id, client_email, client_workspace_id, token)
           VALUES ($1, $2, $3, $4)
           RETURNING *""",
        body.workspace_id, body.client_email, client_ws['id'], token
    )

    agency_name = agency_ws.get('white_label_brand_name') or agency_ws['name']
    accept_url = f"https://app.usepagepersona.com/accept-invite?token={token}"
    invite_html = f"""
    <p>Hi,</p>
    <p><strong>{agency_name}</strong> has given you access to your personalisation dashboard on PagePersona.</p>
    <p>Click the link below to set up your account and view your results:</p>
    <p><a href="{accept_url}" style="background:#1A56DB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Accept Invitation</a></p>
    <p style="color:#94a3b8;font-size:12px;">This link expires in 7 days.</p>
    """
    send_email(body.client_email, f"You've been invited to {agency_name}", invite_html)

    return {
        "invite_id": str(invite['id']),
        "client_workspace_id": str(client_ws['id']),
        "token": token,
        "status": "pending"
    }


@router.get("/accept")
async def accept_invite(
    token: str,
    db: asyncpg.Connection = Depends(get_db)
):
    """Accept a client invite by token (no auth required — called from invite link)."""
    invite = await db.fetchrow(
        "SELECT * FROM client_invites WHERE token = $1 AND status = 'pending'",
        token
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite token")

    from datetime import datetime, timezone
    await db.execute(
        "UPDATE client_invites SET status = 'accepted', accepted_at = $1 WHERE id = $2",
        datetime.now(timezone.utc), invite['id']
    )
    return {
        "ok": True,
        "client_email": invite['client_email'],
        "client_workspace_id": str(invite['client_workspace_id'])
    }


@router.post("/report")
async def send_report(
    body: SendReportRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Send an analytics report email to the client."""
    # Verify agency workspace ownership
    agency_ws = await db.fetchrow(
        "SELECT * FROM workspaces WHERE id = $1 AND owner_id = $2",
        body.workspace_id, current_user['id']
    )
    if not agency_ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    client_ws = await db.fetchrow(
        "SELECT * FROM workspaces WHERE id = $1 AND parent_workspace_id = $2",
        body.client_workspace_id, body.workspace_id
    )
    if not client_ws:
        raise HTTPException(status_code=404, detail="Client workspace not found")

    if not client_ws.get('client_email'):
        raise HTTPException(status_code=400, detail="No client email on record")

    agency_name = agency_ws.get('white_label_brand_name') or agency_ws['name']
    report_url = f"https://app.usepagepersona.com/dashboard/analytics"
    custom_msg = body.message or "Here is your latest personalisation report."

    report_html = f"""
    <p>Hi,</p>
    <p>{custom_msg}</p>
    <p>View your full dashboard here:</p>
    <p><a href="{report_url}" style="background:#1A56DB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">View Dashboard</a></p>
    <p style="color:#94a3b8;font-size:12px;">Sent by {agency_name} via PagePersona</p>
    """
    send_email(client_ws['client_email'], f"Your PagePersona Report from {agency_name}", report_html)

    return {"ok": True}
