import uuid
import boto3
from botocore.config import Config
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.core.security import get_current_user
from app.core.config import settings

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
MAX_SIZE_MB = 10

def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )

@router.post("/api/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "File type not allowed. Allowed: JPEG, PNG, GIF, WebP, SVG")

    data = await file.read()
    size_mb = len(data) / (1024 * 1024)
    if size_mb > MAX_SIZE_MB:
        raise HTTPException(400, f"File too large. Maximum size is {MAX_SIZE_MB}MB")

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
    return {
        "url": public_url,
        "key": key,
        "size": len(data),
        "type": file.content_type,
    }
