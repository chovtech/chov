from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import asyncpg
import re
import socket
import subprocess
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.core.security import get_current_user
from app.core.plan_limits import _get_plan
import uuid

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_access_level: Optional[str] = None
    white_label_brand_name: Optional[str] = None
    white_label_logo: Optional[str] = None
    white_label_icon: Optional[str] = None
    white_label_primary_color: Optional[str] = None
    hide_powered_by: Optional[bool] = None
    custom_domain: Optional[str] = None


class WorkspaceCreate(BaseModel):
    name: str
    type: str = "personal"
    parent_workspace_id: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_access_level: str = "full"


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    return slug.strip('-')


def _get(ws, key, default=None):
    try:
        v = ws[key]
        return v if v is not None else default
    except (KeyError, IndexError):
        return default


def _fmt(ws) -> dict:
    last_activity = _get(ws, 'last_activity')
    created_at = _get(ws, 'created_at')
    return {
        "id": str(ws['id']),
        "name": ws['name'],
        "slug": _get(ws, 'slug'),
        "type": _get(ws, 'type', 'personal'),
        "owner_id": str(ws['owner_id']),
        "parent_workspace_id": str(ws['parent_workspace_id']) if _get(ws, 'parent_workspace_id') else None,
        "parent_slug": _get(ws, 'parent_slug'),
        "client_email": _get(ws, 'client_email'),
        "client_name": _get(ws, 'client_name'),
        "client_access_level": _get(ws, 'client_access_level', 'full'),
        # Client workspaces use parent (agency) white-label settings
        "white_label_logo": _get(ws, 'parent_logo') or _get(ws, 'white_label_logo') if _get(ws, 'type') == 'client' else _get(ws, 'white_label_logo'),
        "white_label_icon": _get(ws, 'parent_icon') or _get(ws, 'white_label_icon') if _get(ws, 'type') == 'client' else _get(ws, 'white_label_icon'),
        "white_label_brand_name": _get(ws, 'parent_brand_name') or _get(ws, 'white_label_brand_name') if _get(ws, 'type') == 'client' else _get(ws, 'white_label_brand_name'),
        "white_label_primary_color": (_get(ws, 'parent_color') or _get(ws, 'white_label_primary_color') or '#1A56DB') if _get(ws, 'type') == 'client' else (_get(ws, 'white_label_primary_color') or '#1A56DB'),
        "hide_powered_by": (_get(ws, 'parent_hide_powered_by') or _get(ws, 'hide_powered_by') or False) if _get(ws, 'type') == 'client' else (_get(ws, 'hide_powered_by') or False),
        "custom_domain": (_get(ws, 'parent_custom_domain') or _get(ws, 'custom_domain')) if _get(ws, 'type') == 'client' else _get(ws, 'custom_domain'),
        "custom_domain_verified": ((_get(ws, 'parent_custom_domain_verified') or _get(ws, 'custom_domain_verified')) or False) if _get(ws, 'type') == 'client' else (_get(ws, 'custom_domain_verified') or False),
        "member_role": _get(ws, 'member_role', 'owner'),
        "created_at": created_at.isoformat() if created_at else None,
        "project_count": int(_get(ws, 'project_count') or 0),
        "active_rules_count": int(_get(ws, 'active_rules_count') or 0),
        "sessions_this_month": int(_get(ws, 'sessions_this_month') or 0),
        "last_activity": last_activity.isoformat() if last_activity else None,
        "invite_status": _get(ws, 'invite_status') or 'none',
        "onboarding_completed": bool(_get(ws, 'onboarding_completed', False)),
    }


_STATS_SUBQUERIES = """
  (SELECT COUNT(*) FROM projects p WHERE p.workspace_id = w.id) as project_count,
  (SELECT COUNT(*) FROM rules r JOIN projects p ON r.project_id = p.id
   WHERE p.workspace_id = w.id AND r.is_active = true) as active_rules_count,
  (SELECT COUNT(*) FROM page_visits pv JOIN projects p ON pv.project_id = p.id
   WHERE p.workspace_id = w.id
   AND pv.timestamp >= date_trunc('month', NOW() AT TIME ZONE 'UTC')) as sessions_this_month,
  (SELECT MAX(pv.timestamp) FROM page_visits pv JOIN projects p ON pv.project_id = p.id
   WHERE p.workspace_id = w.id) as last_activity
"""


@router.get("")
async def list_workspaces(
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    rows = await db.fetch(
        f"""
        SELECT
          w.*,
          pw.slug as parent_slug,
          pw.white_label_brand_name as parent_brand_name,
          pw.white_label_logo as parent_logo,
          pw.white_label_icon as parent_icon,
          pw.white_label_primary_color as parent_color,
          pw.hide_powered_by as parent_hide_powered_by,
          pw.custom_domain as parent_custom_domain,
          pw.custom_domain_verified as parent_custom_domain_verified,
          COALESCE(wm.role, 'owner') as member_role,
          (SELECT status FROM client_invites ci WHERE ci.workspace_id = w.id
           ORDER BY created_at DESC LIMIT 1) as invite_status,
          {_STATS_SUBQUERIES}
        FROM workspaces w
        LEFT JOIN workspaces pw ON w.parent_workspace_id = pw.id
        LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = $1 AND wm.status = 'active'
        WHERE w.owner_id = $1 OR (wm.id IS NOT NULL AND wm.role NOT IN ('revoked'))
        ORDER BY
          CASE WHEN w.owner_id = $1 THEN 0 ELSE 1 END,
          w.created_at ASC
        """,
        current_user['id']
    )
    return [_fmt(r) for r in rows]


@router.post("")
async def create_workspace(
    body: WorkspaceCreate,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    base_slug = _slugify(body.name)
    slug = base_slug
    count = await db.fetchval("SELECT COUNT(*) FROM workspaces WHERE slug = $1", slug)
    if count:
        import uuid as _uuid
        slug = f"{base_slug}-{str(_uuid.uuid4())[:8]}"

    row = await db.fetchrow(
        """INSERT INTO workspaces (name, slug, owner_id, type, parent_workspace_id, client_name, client_email, client_access_level)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *""",
        body.name, slug, current_user['id'], body.type,
        body.parent_workspace_id, body.client_name, body.client_email, body.client_access_level
    )
    return _fmt(row)


@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    row = await db.fetchrow(
        "SELECT * FROM workspaces WHERE id = $1 AND owner_id = $2",
        workspace_id, current_user['id']
    )
    if not row:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return _fmt(row)


# Maps WorkspaceUpdate fields → DB column names
_PATCH_FIELD_MAP = {
    'name': 'name',
    'client_name': 'client_name',
    'client_email': 'client_email',
    'client_access_level': 'client_access_level',
    'white_label_brand_name': 'white_label_brand_name',
    'white_label_logo': 'white_label_logo',
    'white_label_icon': 'white_label_icon',
    'white_label_primary_color': 'white_label_primary_color',
    'hide_powered_by': 'hide_powered_by',
    'custom_domain': 'custom_domain',
}


@router.patch("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    body: WorkspaceUpdate,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    row = await db.fetchrow(
        "SELECT * FROM workspaces WHERE id = $1 AND owner_id = $2",
        workspace_id, current_user['id']
    )

    # Full-access clients can rename their own workspace (but nothing else)
    is_client = False
    if not row:
        member = await db.fetchrow(
            """SELECT wm.role FROM workspace_members wm
               JOIN workspaces w ON wm.workspace_id = w.id
               WHERE wm.workspace_id = $1 AND wm.user_id = $2
               AND wm.status = 'active' AND wm.role = 'client'
               AND w.client_access_level = 'full'""",
            workspace_id, current_user['id']
        )
        if member:
            row = await db.fetchrow("SELECT * FROM workspaces WHERE id = $1", workspace_id)
            is_client = True

    if not row:
        raise HTTPException(status_code=404, detail="Workspace not found")

    updates = body.dict(exclude_unset=True)
    if not updates:
        return _fmt(row)

    # Clients can only update name — strip everything else
    if is_client:
        updates = {k: v for k, v in updates.items() if k == 'name'}
    if not updates:
        return _fmt(row)

    # Plan-gated white-label fields
    AGENCY_FIELDS = {'white_label_brand_name', 'white_label_logo', 'white_label_icon', 'white_label_primary_color', 'custom_domain'}
    PROFESSIONAL_FIELDS = {'hide_powered_by'}
    needs_agency = any(k in updates for k in AGENCY_FIELDS)
    needs_professional = 'hide_powered_by' in updates and updates.get('hide_powered_by') is True

    if needs_agency or needs_professional:
        plan = await _get_plan(uuid.UUID(workspace_id), db)
        agency_plans = {'agency', 'owner'}
        professional_plans = {'professional', 'agency', 'owner'}
        if needs_agency and plan not in agency_plans:
            raise HTTPException(
                status_code=402,
                detail={"error": "plan_limit_reached", "resource": "white_label", "plan": plan}
            )
        if needs_professional and plan not in professional_plans:
            raise HTTPException(
                status_code=402,
                detail={"error": "plan_limit_reached", "resource": "remove_branding", "plan": plan}
            )

    set_parts = []
    values = []
    i = 1
    for api_key, value in updates.items():
        db_col = _PATCH_FIELD_MAP.get(api_key)
        if db_col:
            set_parts.append(f"{db_col} = ${i}")
            values.append(value)
            i += 1

    if not set_parts:
        return _fmt(row)

    values.append(workspace_id)
    q = f"UPDATE workspaces SET {', '.join(set_parts)} WHERE id = ${i} RETURNING *"
    updated = await db.fetchrow(q, *values)
    return _fmt(updated)


@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    row = await db.fetchrow(
        "SELECT id FROM workspaces WHERE id = $1 AND owner_id = $2",
        workspace_id, current_user['id']
    )
    if not row:
        raise HTTPException(status_code=404, detail="Workspace not found")
    # Explicitly clean up client_invites referencing this workspace as a client workspace
    # before deletion so re-inviting the same email always starts fresh.
    await db.execute("DELETE FROM client_invites WHERE client_workspace_id = $1", workspace_id)
    await db.execute("DELETE FROM workspaces WHERE id = $1", workspace_id)
    return {"ok": True}


@router.post("/{workspace_id}/complete-onboarding")
async def complete_onboarding(
    workspace_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark onboarding as complete for the workspace. Owner only."""
    ws = await db.fetchrow(
        "SELECT id FROM workspaces WHERE id = $1 AND owner_id = $2",
        workspace_id, current_user['id']
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    await db.execute(
        "UPDATE workspaces SET onboarding_completed = true WHERE id = $1",
        workspace_id
    )
    return {"ok": True}


@router.get("/{workspace_id}/clients")
async def list_clients(
    workspace_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ws = await db.fetchrow(
        "SELECT id FROM workspaces WHERE id = $1 AND owner_id = $2",
        workspace_id, current_user['id']
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    rows = await db.fetch(
        f"""
        SELECT
          w.*,
          'owner' as member_role,
          (SELECT status FROM client_invites ci
           WHERE ci.workspace_id = $1 AND ci.email = w.client_email
           ORDER BY ci.created_at DESC LIMIT 1) as invite_status,
          {_STATS_SUBQUERIES}
        FROM workspaces w
        WHERE w.parent_workspace_id = $1
        ORDER BY w.created_at ASC
        """,
        workspace_id
    )
    return [_fmt(r) for r in rows]


def _provision_ssl(domain: str) -> None:
    try:
        subprocess.run(
            ['sudo', '/usr/bin/bash', '/home/chike/chov/scripts/provision_domain.sh', domain],
            timeout=120, capture_output=True
        )
    except Exception:
        pass  # Cron fallback will catch it within 60s


@router.post("/{workspace_id}/verify-domain")
async def verify_domain(
    workspace_id: str,
    background_tasks: BackgroundTasks,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ws = await db.fetchrow(
        "SELECT * FROM workspaces WHERE id = $1 AND owner_id = $2",
        workspace_id, current_user['id']
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    custom_domain = _get(ws, 'custom_domain')
    if not custom_domain:
        raise HTTPException(status_code=400, detail="No custom domain configured")

    verified = False
    message = ""
    try:
        domain_ip = socket.gethostbyname(custom_domain)
        try:
            target_ip = socket.gethostbyname('cname.usepagepersona.com')
            verified = domain_ip == target_ip
            message = "Domain verified successfully" if verified else "Domain does not point to cname.usepagepersona.com"
        except socket.gaierror:
            verified = bool(domain_ip)
            message = "Domain resolves — could not verify target IP"
    except socket.gaierror:
        verified = False
        message = "Domain does not resolve. Check your DNS settings."

    await db.execute(
        "UPDATE workspaces SET custom_domain_verified = $1 WHERE id = $2",
        verified, workspace_id
    )

    if verified:
        background_tasks.add_task(_provision_ssl, custom_domain)

    return {"verified": verified, "message": message}
