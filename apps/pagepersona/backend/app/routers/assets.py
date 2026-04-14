import uuid
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from app.core.security import get_current_user
from app.database import get_db
from app.routers.upload import get_r2_client, delete_r2_image, ALLOWED_TYPES, MAX_SIZE_MB
from app.core.config import settings
import asyncpg

router = APIRouter()

_WORKSPACE_ACCESS = """
    SELECT id FROM workspaces WHERE id = $1 AND (
        owner_id = $2
        OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = $1 AND wm.user_id = $2
              AND wm.status = 'active' AND wm.role != 'revoked'
        )
    )
"""

_WORKSPACE_ADMIN = """
    SELECT id FROM workspaces WHERE id = $1 AND (
        owner_id = $2
        OR EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = $1 AND wm.user_id = $2
              AND wm.status = 'active' AND wm.role IN ('admin')
        )
    )
"""


def _fmt(r) -> dict:
    return {
        "id": str(r['id']),
        "url": r['url'],
        "filename": r['filename'],
        "size": r['size'],
        "mime_type": r['mime_type'],
        "created_at": r['created_at'].isoformat(),
    }


@router.post("/api/assets/upload")
async def upload_asset(
    file: UploadFile = File(...),
    workspace_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "File type not allowed. Allowed: JPEG, PNG, GIF, WebP, SVG")

    data = await file.read()
    if len(data) / (1024 * 1024) > MAX_SIZE_MB:
        raise HTTPException(400, f"File too large. Maximum size is {MAX_SIZE_MB}MB")

    if workspace_id:
        ws = await db.fetchrow(_WORKSPACE_ACCESS, workspace_id, current_user['id'])
        if not ws:
            raise HTTPException(403, "Access denied to this workspace")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    key = f"uploads/{uuid.uuid4().hex}.{ext}"

    try:
        s3 = get_r2_client()
        s3.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=key,
            Body=data,
            ContentType=file.content_type,
            CacheControl="public, max-age=31536000",
        )
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {str(e)}")

    public_url = f"{settings.R2_PUBLIC_URL}/{key}"

    asset = await db.fetchrow(
        """INSERT INTO assets (workspace_id, user_id, url, filename, size, mime_type)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *""",
        workspace_id, current_user['id'], public_url,
        file.filename, len(data), file.content_type,
    )

    return _fmt(asset)


@router.get("/api/assets")
async def list_assets(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    ws = await db.fetchrow(_WORKSPACE_ACCESS, workspace_id, current_user['id'])
    if not ws:
        raise HTTPException(403, "Access denied to this workspace")

    rows = await db.fetch(
        "SELECT * FROM assets WHERE workspace_id = $1 ORDER BY created_at DESC",
        workspace_id,
    )
    return [_fmt(r) for r in rows]


@router.delete("/api/assets/{asset_id}")
async def delete_asset(
    asset_id: str,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    asset = await db.fetchrow("SELECT * FROM assets WHERE id = $1", asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")

    is_own = str(asset['user_id']) == current_user['id']
    is_admin = False
    if asset['workspace_id']:
        row = await db.fetchrow(_WORKSPACE_ADMIN, str(asset['workspace_id']), current_user['id'])
        is_admin = row is not None

    if not (is_own or is_admin):
        raise HTTPException(403, "Access denied")

    delete_r2_image(asset['url'])
    await db.execute("DELETE FROM assets WHERE id = $1", asset_id)
    return {"ok": True}
