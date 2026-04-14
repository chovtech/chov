from fastapi import APIRouter, Depends, HTTPException, Query
import asyncpg
import uuid
import re
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.database import get_db
from app.core.security import get_current_user, hash_password, create_access_token, create_refresh_token
from app.services.email_service import send_client_access_restored_email

router = APIRouter(prefix="/api/clients", tags=["clients"])


class InviteClientRequest(BaseModel):
    client_email: EmailStr
    workspace_id: str
    client_workspace_id: Optional[str] = None


class AcceptInviteRequest(BaseModel):
    token: str
    name: Optional[str] = None
    password: Optional[str] = None


class SendReportRequest(BaseModel):
    workspace_id: str
    client_workspace_id: str
    message: Optional[str] = None


class SelfSignupRequest(BaseModel):
    slug: str
    name: str
    email: EmailStr
    password: str


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    return slug.strip('-')


# ── Invite info (unauthenticated) ────────────────────────────────────────────

@router.get("/invite-info")
async def get_invite_info(
    token: str = Query(...),
    db: asyncpg.Connection = Depends(get_db)
):
    """Return white label + workspace info for an invite token. No auth required."""
    invite = await db.fetchrow(
        """SELECT ci.id, ci.status, ci.client_email as email,
                  w.name as workspace_name, w.white_label_brand_name, w.white_label_logo, w.white_label_primary_color, w.hide_powered_by,
                  u.name as inviter_name
           FROM client_invites ci
           JOIN workspaces w ON ci.workspace_id = w.id
           JOIN users u ON w.owner_id = u.id
           WHERE ci.token = $1""",
        token
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite token")
    if invite['status'] == 'active':
        raise HTTPException(status_code=409, detail="This invitation has already been accepted")
    if invite['status'] not in ('pending',):
        raise HTTPException(status_code=410, detail="This invitation link is invalid or has expired")

    existing_user = await db.fetchrow("SELECT id FROM users WHERE email = $1", invite['email'])

    return {
        "workspace_name": invite['workspace_name'],
        "inviter_name": invite['inviter_name'],
        "client_email": invite['email'],
        "white_label_brand_name": invite['white_label_brand_name'],
        "white_label_logo": invite['white_label_logo'],
        "white_label_primary_color": invite['white_label_primary_color'] or '#1A56DB',
        "hide_powered_by": invite['hide_powered_by'] or False,
        "user_exists": existing_user is not None,
    }


# ── Resolve custom domain (unauthenticated) ───────────────────────────────────

@router.get("/resolve-domain")
async def resolve_domain(
    domain: str = Query(...),
    db: asyncpg.Connection = Depends(get_db)
):
    """Look up white label settings by custom domain. No auth required."""
    ws = await db.fetchrow(
        """SELECT id, white_label_brand_name, white_label_logo, white_label_primary_color, hide_powered_by
           FROM workspaces
           WHERE custom_domain = $1 AND custom_domain_verified = true""",
        domain
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Domain not found")
    return {
        "workspace_id": str(ws['id']),
        "white_label_brand_name": ws['white_label_brand_name'],
        "white_label_logo": ws['white_label_logo'],
        "white_label_primary_color": ws['white_label_primary_color'] or '#1A56DB',
        "hide_powered_by": ws['hide_powered_by'] or False,
    }


# ── Join info (unauthenticated) ───────────────────────────────────────────────

@router.get("/join-info")
async def join_info(
    slug: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    db: asyncpg.Connection = Depends(get_db)
):
    """Return agency branding for a self-signup page. No auth required.
    Accepts either ?slug= or ?domain= (custom domain)."""
    if not slug and not domain:
        raise HTTPException(status_code=400, detail="slug or domain required")

    if domain:
        ws = await db.fetchrow(
            """SELECT id, slug, name, white_label_brand_name, white_label_logo, white_label_icon, white_label_primary_color, hide_powered_by
               FROM workspaces
               WHERE custom_domain = $1 AND custom_domain_verified = true""",
            domain
        )
    else:
        ws = await db.fetchrow(
            """SELECT id, slug, name, white_label_brand_name, white_label_logo, white_label_icon, white_label_primary_color, hide_powered_by
               FROM workspaces WHERE slug = $1""",
            slug
        )

    if not ws:
        raise HTTPException(status_code=404, detail="Agency not found")

    return {
        "agency_workspace_id": str(ws['id']),
        "agency_slug": ws['slug'],
        "brand_name": ws['white_label_brand_name'] or ws['name'],
        "logo_url": ws['white_label_logo'],
        "icon_url": ws['white_label_icon'],
        "brand_color": ws['white_label_primary_color'] or '#1A56DB',
        "hide_powered_by": ws['hide_powered_by'] or False,
    }


# ── Self-signup ───────────────────────────────────────────────────────────────

@router.post("/self-signup")
async def self_signup(
    body: SelfSignupRequest,
    db: asyncpg.Connection = Depends(get_db)
):
    """Public self-signup: create user + client workspace under agency."""
    # Look up agency workspace by slug
    agency = await db.fetchrow(
        "SELECT id, owner_id, name, white_label_brand_name, white_label_logo, white_label_primary_color FROM workspaces WHERE slug = $1",
        body.slug
    )
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    # Check email not already registered
    existing = await db.fetchrow("SELECT id FROM users WHERE email = $1", body.email)
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists. Please log in.")

    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")

    # Create user
    user_id = str(uuid.uuid4())
    pw_hash = hash_password(body.password)
    await db.execute(
        """INSERT INTO users (id, name, email, password_hash, email_verified)
           VALUES ($1, $2, $3, $4, true)""",
        user_id, body.name, body.email, pw_hash
    )

    # Create client workspace
    agency_id = str(agency['id'])
    ws_name = f"{body.name}'s Workspace"
    ws_slug_base = re.sub(r'[^a-z0-9]+', '-', body.name.lower().strip()).strip('-')
    ws_slug = ws_slug_base
    count = await db.fetchval("SELECT COUNT(*) FROM workspaces WHERE slug = $1", ws_slug)
    if count:
        ws_slug = f"{ws_slug_base}-{str(uuid.uuid4())[:8]}"

    client_ws_id = str(uuid.uuid4())
    await db.execute(
        """INSERT INTO workspaces (id, name, slug, owner_id, type, parent_workspace_id, client_email, client_access_level)
           VALUES ($1, $2, $3, $4, 'client', $5, $6, 'full')""",
        client_ws_id, ws_name, ws_slug, str(agency['owner_id']),
        agency_id, body.email
    )

    # Create workspace_members row so client can access it
    await db.execute(
        """INSERT INTO workspace_members (workspace_id, user_id, email, role, status, joined_at)
           VALUES ($1, $2, $3, 'client', 'active', NOW())""",
        client_ws_id, user_id, body.email
    )

    # Issue tokens
    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})
    await db.execute(
        "INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
        user_id, refresh_token
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {"id": user_id, "name": body.name, "email": body.email},
        "workspace_id": client_ws_id,
    }


# ── Send invite ───────────────────────────────────────────────────────────────

@router.post("/invite")
async def invite_client(
    body: InviteClientRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    agency_ws = await db.fetchrow(
        "SELECT * FROM workspaces WHERE id = $1 AND owner_id = $2",
        body.workspace_id, current_user['id']
    )
    if not agency_ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Block if already active (accepted) — only count invites whose client workspace still exists.
    # Orphaned invite rows from deleted workspaces are ignored so re-invite always works cleanly.
    existing = await db.fetchrow(
        """SELECT ci.id, ci.status FROM client_invites ci
           JOIN workspaces w ON ci.client_workspace_id = w.id
           WHERE ci.workspace_id = $1 AND ci.email = $2 AND ci.status IN ('pending', 'active')""",
        body.workspace_id, body.client_email
    )
    if existing and existing['status'] == 'active':
        raise HTTPException(status_code=400, detail="This client has already accepted the invite.")

    # Check whether the invited email already has a PagePersona account
    invited_user_exists = await db.fetchrow("SELECT id FROM users WHERE email = $1", body.client_email)

    # Find or create the client workspace
    client_ws = None
    if body.client_workspace_id:
        # Direct lookup by ID — used when resending from ManageAccessModal
        client_ws = await db.fetchrow(
            "SELECT * FROM workspaces WHERE id = $1 AND parent_workspace_id = $2",
            body.client_workspace_id, body.workspace_id
        )
        if client_ws and client_ws['client_email'] != body.client_email:
            # Email was corrected — update it on the workspace
            await db.execute(
                "UPDATE workspaces SET client_email = $1 WHERE id = $2",
                body.client_email, client_ws['id']
            )
    if not client_ws:
        client_ws = await db.fetchrow(
            "SELECT * FROM workspaces WHERE parent_workspace_id = $1 AND client_email = $2",
            body.workspace_id, body.client_email
        )
    if not client_ws:
        base_slug = _slugify(body.client_email.split('@')[0])
        slug = base_slug
        count = await db.fetchval("SELECT COUNT(*) FROM workspaces WHERE slug = $1", slug)
        if count:
            slug = f"{base_slug}-{str(uuid.uuid4())[:8]}"
        client_ws = await db.fetchrow(
            """INSERT INTO workspaces (name, slug, owner_id, type, parent_workspace_id, client_email, client_access_level)
               VALUES ($1, $2, $3, 'client', $4, $5, 'full')
               RETURNING *""",
            body.client_email, slug, current_user['id'], body.workspace_id, body.client_email
        )

    token = str(uuid.uuid4())
    if existing and existing['status'] == 'pending':
        # Resend: refresh token and ensure client_workspace_id is current
        invite = await db.fetchrow(
            "UPDATE client_invites SET token = $1, created_at = NOW(), client_workspace_id = $3 WHERE id = $2 RETURNING *",
            token, existing['id'], client_ws['id']
        )
    else:
        invite = await db.fetchrow(
            """INSERT INTO client_invites (workspace_id, email, client_workspace_id, token)
               VALUES ($1, $2, $3, $4)
               RETURNING *""",
            body.workspace_id, body.client_email, client_ws['id'], token
        )

    brand_name = agency_ws['white_label_brand_name'] or 'PagePersona'
    logo_url = agency_ws['white_label_logo']
    brand_color = agency_ws['white_label_primary_color'] or '#1A56DB'
    accept_url = f"https://app.usepagepersona.com/accept?token={token}"

    from app.services.email_service import send_client_invite_email, send_client_invite_existing_user_email
    import logging
    _log = logging.getLogger(__name__)
    email_sent = False
    try:
        if invited_user_exists:
            email_sent = send_client_invite_existing_user_email(
                to_email=body.client_email,
                brand_name=brand_name,
                logo_url=logo_url,
                brand_color=brand_color,
                accept_url=accept_url,
            )
        else:
            email_sent = send_client_invite_email(
                to_email=body.client_email,
                brand_name=brand_name,
                logo_url=logo_url,
                brand_color=brand_color,
                accept_url=accept_url,
            )
        if not email_sent:
            _log.error(f"send_client_invite_email returned False for {body.client_email}")
    except Exception as exc:
        _log.error(f"send_client_invite_email raised: {exc}")

    return {
        "invite_id": str(invite['id']),
        "email_sent": email_sent,
        "client_workspace_id": str(client_ws['id']),
        "token": token,
        "status": "pending",
    }


# ── Accept invite ─────────────────────────────────────────────────────────────

@router.post("/accept")
async def accept_invite(
    body: AcceptInviteRequest,
    db: asyncpg.Connection = Depends(get_db)
):
    """Accept invite — create user account if needed, return JWT."""
    invite = await db.fetchrow(
        """SELECT ci.*, w.client_access_level
           FROM client_invites ci
           JOIN workspaces w ON ci.client_workspace_id = w.id
           WHERE ci.token = $1 AND ci.status = 'pending'""",
        body.token
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite token")

    email = invite['email']
    now = datetime.now(timezone.utc)

    existing_user = await db.fetchrow("SELECT * FROM users WHERE email = $1", email)
    if existing_user:
        user = existing_user
    else:
        if not body.name or not body.password:
            raise HTTPException(status_code=400, detail="Name and password are required to create your account.")
        hashed = hash_password(body.password)
        user = await db.fetchrow(
            """INSERT INTO users (email, name, password_hash, email_verified, language)
               VALUES ($1, $2, $3, true, 'en')
               RETURNING *""",
            email, body.name, hashed
        )

    await db.execute(
        "UPDATE client_invites SET status = 'active', accepted_at = $1 WHERE id = $2",
        now, invite['id']
    )

    existing_member = await db.fetchrow(
        "SELECT id, role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
        invite['client_workspace_id'], user['id']
    )
    if existing_member:
        # Re-activate if previously revoked
        if existing_member['role'] == 'revoked':
            await db.execute(
                "UPDATE workspace_members SET role = 'client', status = 'active', joined_at = $1 WHERE id = $2",
                now, existing_member['id']
            )
    else:
        await db.execute(
            """INSERT INTO workspace_members (workspace_id, user_id, email, role, status, joined_at)
               VALUES ($1, $2, $3, 'client', 'active', $4)""",
            invite['client_workspace_id'], user['id'], email, now
        )

    access_token = create_access_token({"sub": str(user['id'])})
    refresh_token = create_refresh_token({"sub": str(user['id'])})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {"id": str(user['id']), "email": user['email'], "name": user['name']},
        "workspace_id": str(invite['client_workspace_id']),
    }


# ── Revoke access ─────────────────────────────────────────────────────────────

@router.delete("/{workspace_id}/revoke")
async def revoke_access(
    workspace_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Revoke client access. Agency owner only."""
    ws = await db.fetchrow(
        """SELECT w.id FROM workspaces w
           JOIN workspaces parent ON w.parent_workspace_id = parent.id
           WHERE w.id = $1 AND parent.owner_id = $2""",
        workspace_id, current_user['id']
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Client workspace not found")

    await db.execute(
        "UPDATE client_invites SET status = 'revoked' WHERE client_workspace_id = $1 AND status = 'active'",
        workspace_id
    )
    await db.execute(
        "UPDATE workspace_members SET role = 'revoked' WHERE workspace_id = $1 AND role = 'client'",
        workspace_id
    )
    return {"ok": True}


# ── Restore access ────────────────────────────────────────────────────────────

@router.post("/{workspace_id}/restore")
async def restore_access(
    workspace_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Restore a previously revoked client's access. Agency owner only."""
    # Verify requester owns the parent workspace; fetch client workspace name too
    ws = await db.fetchrow(
        """SELECT w.id, w.name AS workspace_name, w.client_email,
                  parent.brand_name, parent.logo_url, parent.brand_color
           FROM workspaces w
           JOIN workspaces parent ON w.parent_workspace_id = parent.id
           WHERE w.id = $1 AND parent.owner_id = $2""",
        workspace_id, current_user['id']
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Client workspace not found")

    # Restore workspace_members role
    await db.execute(
        "UPDATE workspace_members SET role = 'client' WHERE workspace_id = $1 AND role = 'revoked'",
        workspace_id
    )
    # Restore latest client_invite
    await db.execute(
        "UPDATE client_invites SET status = 'active' WHERE client_workspace_id = $1 AND status = 'revoked'",
        workspace_id
    )

    # Send restoration email
    client_email = ws['client_email']
    if client_email:
        from app.core.config import settings
        logo_url = ws['logo_url']
        brand_color = ws['brand_color'] or '#1A56DB'
        # Use agency branding for logo/colour but reference the client's own workspace name
        send_client_access_restored_email(
            to_email=client_email,
            workspace_name=ws['workspace_name'],
            logo_url=logo_url,
            brand_color=brand_color,
            dashboard_url=f"{settings.FRONTEND_URL}/dashboard",
        )

    return {"ok": True}


# ── Access status (for revoked-wall detection) ────────────────────────────────

@router.get("/access-status")
async def access_status(
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Returns whether the current user has been revoked from all workspaces."""
    # Check if they own any workspace
    owns = await db.fetchval(
        "SELECT COUNT(*) FROM workspaces WHERE owner_id = $1", current_user['id']
    )
    if owns:
        return {"revoked": False}

    # Check for active membership
    active = await db.fetchval(
        "SELECT COUNT(*) FROM workspace_members WHERE user_id = $1 AND status = 'active' AND role != 'revoked'",
        current_user['id']
    )
    if active:
        return {"revoked": False}

    # Check for revoked membership
    revoked_row = await db.fetchrow(
        """SELECT w.name AS workspace_name
           FROM workspace_members wm
           JOIN workspaces w ON wm.workspace_id = w.id
           WHERE wm.user_id = $1 AND wm.role = 'revoked'
           LIMIT 1""",
        current_user['id']
    )
    if revoked_row:
        return {"revoked": True, "workspace_name": revoked_row['workspace_name'] or 'your workspace'}

    return {"revoked": False}


# ── Send report ───────────────────────────────────────────────────────────────

@router.post("/report")
async def send_report(
    body: SendReportRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
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

    recipient = client_ws.get('client_email') or ''
    if not recipient:
        raise HTTPException(status_code=400, detail="No client email on record")

    brand_name = agency_ws['white_label_brand_name'] or 'PagePersona'
    logo_url = agency_ws['white_label_logo']
    brand_color = agency_ws['white_label_primary_color'] or '#1A56DB'
    custom_msg = body.message or "Here is your latest personalisation report."
    report_url = "https://app.usepagepersona.com/dashboard/analytics"

    logo_html = f'<img src="{logo_url}" alt="{brand_name}" style="max-height:50px;margin-bottom:16px"/><br/>' if logo_url else ''
    footer_html = '' if agency_ws.get('brand_name') else '<p style="color:#94a3b8;font-size:12px">Powered by PagePersona</p>'

    report_html = f"""
    <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      {logo_html}
      <h2 style="color:{brand_color}">{brand_name} — Personalisation Report</h2>
      <p>{custom_msg}</p>
      <p>View your full dashboard:</p>
      <p><a href="{report_url}" style="background:{brand_color};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">View Dashboard</a></p>
      {footer_html}
    </body></html>
    """
    from app.services.email_service import send_email
    send_email(recipient, f"Your Personalisation Report from {brand_name}", report_html)
    return {"ok": True}
