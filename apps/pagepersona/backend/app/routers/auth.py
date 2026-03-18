from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncpg
from app.database import get_db
from app.schemas.auth import (
    SignUpRequest, LoginRequest, AuthResponse,
    UserResponse, WorkspaceResponse, MessageResponse,
    ForgotPasswordRequest, ResetPasswordRequest
)
from app.services.auth_service import (
    get_user_by_email, create_user_and_workspace,
    authenticate_user, create_session, get_workspace_by_owner,
    get_user_by_id, create_password_reset_token,
    get_user_by_reset_token, consume_reset_token
)
from app.services.email_service import send_welcome_email, send_password_reset_email
from app.services.mautic_service import subscribe_contact
from app.core.security import decode_token

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()

def format_user(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user['id']),
        email=user['email'],
        name=user.get('name'),
        avatar_url=user.get('avatar_url'),
        email_verified=user.get('email_verified', False),
        created_at=user['created_at']
    )

def format_workspace(workspace: dict) -> WorkspaceResponse:
    return WorkspaceResponse(
        id=str(workspace['id']),
        name=workspace['name'],
        slug=workspace['slug']
    )

# ── SIGNUP ─────────────────────────────────────────────
@router.post("/signup", response_model=AuthResponse)
async def signup(
    data: SignUpRequest,
    request: Request,
    db: asyncpg.Connection = Depends(get_db)
):
    existing = await get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )
    if len(data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )

    user, workspace = await create_user_and_workspace(
        db, data.email, data.name, data.password
    )

    ip = request.client.host if request.client else None
    access_token, refresh_token = await create_session(
        db, str(user['id']), ip
    )

    # Fire and forget — don't fail signup if these fail
    name_parts = (data.name or "").split()
    firstname = name_parts[0] if name_parts else data.email.split('@')[0]
    lastname = name_parts[-1] if len(name_parts) > 1 else ""

    try:
        send_welcome_email(data.email, data.name or firstname)
    except Exception:
        pass

    try:
        await subscribe_contact(
            email=data.email,
            firstname=firstname,
            lastname=lastname,
            tags=["pagepersona_signup"]
        )
    except Exception:
        pass

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=format_user(user),
        workspace=format_workspace(workspace)
    )

# ── LOGIN ──────────────────────────────────────────────
@router.post("/login", response_model=AuthResponse)
async def login(
    data: LoginRequest,
    request: Request,
    db: asyncpg.Connection = Depends(get_db)
):
    user = await authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    workspace = await get_workspace_by_owner(db, str(user['id']))
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No workspace found for this account"
        )

    ip = request.client.host if request.client else None
    access_token, refresh_token = await create_session(
        db, str(user['id']), ip
    )

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=format_user(user),
        workspace=format_workspace(workspace)
    )

# ── GET CURRENT USER ───────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: asyncpg.Connection = Depends(get_db)
):
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

    return format_user(user)

# ── LOGOUT ─────────────────────────────────────────────
@router.post("/logout", response_model=MessageResponse)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: asyncpg.Connection = Depends(get_db)
):
    await db.execute(
        "DELETE FROM sessions WHERE token = $1",
        credentials.credentials
    )
    return MessageResponse(message="Logged out successfully")

# ── FORGOT PASSWORD ────────────────────────────────────
@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: asyncpg.Connection = Depends(get_db)
):
    user = await get_user_by_email(db, data.email)
    # Always return success — never reveal if email exists
    if not user:
        return MessageResponse(message="If that email exists, a reset link has been sent")

    token = await create_password_reset_token(db, str(user['id']))

    try:
        send_password_reset_email(
            to_email=data.email,
            name=user.get('name') or data.email.split('@')[0],
            reset_token=token
        )
    except Exception:
        pass

    return MessageResponse(message="If that email exists, a reset link has been sent")

# ── RESET PASSWORD ─────────────────────────────────────
@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: ResetPasswordRequest,
    db: asyncpg.Connection = Depends(get_db)
):
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )

    success = await consume_reset_token(db, data.token, data.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link"
        )

    return MessageResponse(message="Password updated successfully")
