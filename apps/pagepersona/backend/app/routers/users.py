from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncpg
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.database import get_db
from app.core.security import decode_token, hash_password, verify_password
from app.services.auth_service import get_user_by_id, get_user_by_email
from app.services.mautic_service import update_contact
from app.schemas.auth import UserResponse, MessageResponse

router = APIRouter(prefix="/api/users", tags=["users"])
security = HTTPBearer()

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    language: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: asyncpg.Connection = Depends(get_db)
) -> dict:
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    user = await get_user_by_id(db, payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

# ── UPDATE PROFILE ─────────────────────────────────────
@router.put("/profile", response_model=UserResponse)
async def update_profile(
    data: UpdateProfileRequest,
    db: asyncpg.Connection = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    # Check email not taken if changing email
    if data.email and data.email != user['email']:
        existing = await get_user_by_email(db, data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="That email is already in use"
            )

    name = data.name or user.get('name')
    email = data.email or user['email']

    language = data.language or user.get('language', 'en')
    updated = await db.fetchrow(
        """
        UPDATE users SET name = $1, email = $2, language = $3, updated_at = NOW()
        WHERE id = $4 RETURNING *
        """,
        name, email, language, user['id']
    )

    # Sync to Mautic
    try:
        name_parts = (name or "").split()
        await update_contact(email, {
            "firstname": name_parts[0] if name_parts else "",
            "lastname": name_parts[-1] if len(name_parts) > 1 else "",
        })
    except Exception:
        pass

    u = dict(updated)
    return UserResponse(
        id=str(u['id']),
        email=u['email'],
        name=u.get('name'),
        avatar_url=u.get('avatar_url'),
        email_verified=u.get('email_verified', False),
        language=u.get('language', 'en'),
        created_at=u['created_at']
    )

# ── CHANGE PASSWORD ────────────────────────────────────
@router.put("/password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest,
    db: asyncpg.Connection = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    if not verify_password(data.current_password, user.get('password_hash', '')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )

    hashed = hash_password(data.new_password)
    await db.execute(
        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        hashed, user['id']
    )
    return MessageResponse(message="Password updated successfully")
