from fastapi import APIRouter, Depends, HTTPException
import asyncpg
import re
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.core.security import get_current_user

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    white_label_brand_name: Optional[str] = None
    white_label_logo: Optional[str] = None
    white_label_primary_color: Optional[str] = None


class WorkspaceCreate(BaseModel):
    name: str
    type: str = "personal"


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    return slug.strip('-')


def _fmt(ws) -> dict:
    return {
        "id": str(ws['id']),
        "name": ws['name'],
        "slug": ws['slug'],
        "type": ws['type'],
        "owner_id": str(ws['owner_id']),
        "parent_workspace_id": str(ws['parent_workspace_id']) if ws['parent_workspace_id'] else None,
        "client_email": ws.get('client_email'),
        "white_label_logo": ws.get('white_label_logo'),
        "white_label_brand_name": ws.get('white_label_brand_name'),
        "white_label_primary_color": ws.get('white_label_primary_color') or '#1A56DB',
        "created_at": ws['created_at'].isoformat() if ws['created_at'] else None,
    }


@router.get("")
async def list_workspaces(
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all workspaces owned by the current user."""
    rows = await db.fetch(
        "SELECT * FROM workspaces WHERE owner_id = $1 ORDER BY created_at ASC",
        current_user['id']
    )
    return [_fmt(r) for r in rows]


@router.post("")
async def create_workspace(
    body: WorkspaceCreate,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new workspace for the current user."""
    base_slug = _slugify(body.name)
    slug = base_slug
    # Ensure unique slug
    count = await db.fetchval("SELECT COUNT(*) FROM workspaces WHERE slug = $1", slug)
    if count:
        import uuid as _uuid
        slug = f"{base_slug}-{str(_uuid.uuid4())[:8]}"

    row = await db.fetchrow(
        """INSERT INTO workspaces (name, slug, owner_id, type)
           VALUES ($1, $2, $3, $4)
           RETURNING *""",
        body.name, slug, current_user['id'], body.type
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
    if not row:
        raise HTTPException(status_code=404, detail="Workspace not found")

    updates = body.dict(exclude_none=True)
    if not updates:
        return _fmt(row)

    set_parts = []
    values = []
    i = 1
    for k, v in updates.items():
        set_parts.append(f"{k} = ${i}")
        values.append(v)
        i += 1
    values.append(workspace_id)
    values.append(current_user['id'])
    q = f"UPDATE workspaces SET {', '.join(set_parts)}, updated_at = NOW() WHERE id = ${i} AND owner_id = ${i+1} RETURNING *"
    updated = await db.fetchrow(q, *values)
    return _fmt(updated)


@router.get("/{workspace_id}/clients")
async def list_clients(
    workspace_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List client workspaces that belong to this agency workspace."""
    # Verify ownership
    ws = await db.fetchrow(
        "SELECT id FROM workspaces WHERE id = $1 AND owner_id = $2",
        workspace_id, current_user['id']
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    rows = await db.fetch(
        """SELECT w.*, ci.status as invite_status, ci.client_email
           FROM workspaces w
           LEFT JOIN client_invites ci ON ci.client_workspace_id = w.id AND ci.workspace_id = $1
           WHERE w.parent_workspace_id = $1
           ORDER BY w.created_at ASC""",
        workspace_id
    )
    return [_fmt(r) for r in rows]
