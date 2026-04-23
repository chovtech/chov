from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from urllib.parse import urlparse
import asyncpg
from pydantic import BaseModel, EmailStr
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
    get_user_by_reset_token, consume_reset_token,
    create_verification_token, consume_verification_token,
    create_magic_link_token
)
from app.services.email_service import (
    send_welcome_email, send_password_reset_email,
    send_verification_email, send_magic_link_email
)
from app.services.mautic_service import subscribe_contact
from app.core.security import decode_token

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()

_PP_DOMAINS = {'app.usepagepersona.com', 'api.usepagepersona.com', 'localhost', '127.0.0.1'}

async def _branding(db: asyncpg.Connection, request: Request) -> dict:
    origin = request.headers.get('origin') or request.headers.get('referer') or ''
    host = urlparse(origin).hostname or ''
    if not host or host in _PP_DOMAINS or host.startswith('192.168.'):
        return {}
    row = await db.fetchrow(
        "SELECT white_label_brand_name, white_label_logo, white_label_primary_color, hide_powered_by, custom_domain "
        "FROM workspaces WHERE custom_domain = $1 AND white_label_brand_name IS NOT NULL",
        host
    )
    if not row:
        return {}
    return {
        "brand_name": row['white_label_brand_name'],
        "brand_color": row['white_label_primary_color'] or '#1A56DB',
        "logo_url": row['white_label_logo'],
        "hide_powered_by": row['hide_powered_by'] or False,
        "base_url": f"https://{row['custom_domain']}",
    }

class MagicLinkRequest(BaseModel):
    email: EmailStr

def format_user(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user['id']),
        email=user['email'],
        name=user.get('name'),
        avatar_url=user.get('avatar_url'),
        email_verified=user.get('email_verified', False),
        language=user.get('language', 'en'),
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
    lang = data.language or "en"
    if existing:
        msg = "Un compte avec cet e-mail existe déjà" if lang == "fr" else "An account with this email already exists"
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    if len(data.password) < 8:
        msg = "Le mot de passe doit contenir au moins 8 caractères" if lang == "fr" else "Password must be at least 8 characters"
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    user, workspace = await create_user_and_workspace(
        db, data.email, data.name, data.password, data.language
    )

    ip = request.client.host if request.client else None
    access_token, refresh_token = await create_session(
        db, str(user['id']), ip
    )

    name_parts = (data.name or "").split()
    firstname = name_parts[0] if name_parts else data.email.split('@')[0]
    lastname = name_parts[-1] if len(name_parts) > 1 else ""

    # Send verification email (not welcome — verify first)
    try:
        verify_token = await create_verification_token(
            db, str(user['id']), 'email_verification'
        )
        b = await _branding(db, request)
        send_verification_email(data.email, data.name or firstname, verify_token, lang=data.language, **b)
    except Exception:
        pass

    # Sync to Mautic
    try:
        await subscribe_contact(
            email=data.email,
            firstname=firstname,
            lastname=lastname,
            tags=["pagepersona_signup"],
            company=workspace["name"],
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
    lang = user.get('language', 'en') if user else 'en'
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou mot de passe invalide" if lang == "fr" else "Invalid email or password"
        )

    workspace = await get_workspace_by_owner(db, str(user['id']))
    if not workspace:
        # Client users don't own a workspace — look up via workspace_members
        row = await db.fetchrow(
            """SELECT w.* FROM workspaces w
               JOIN workspace_members wm ON wm.workspace_id = w.id
               WHERE wm.user_id = $1 AND wm.status = 'active'
               ORDER BY wm.joined_at ASC LIMIT 1""",
            user['id']
        )
        workspace = dict(row) if row else None
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun espace de travail trouvé" if lang == "fr" else "No workspace found for this account"
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
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

# ── VERIFY EMAIL ───────────────────────────────────────
@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    request: Request,
    db: asyncpg.Connection = Depends(get_db)
):
    body = await request.json()
    token = body.get("token", "")
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")

    user = await consume_verification_token(db, token, 'email_verification')
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    await db.execute(
        "UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1",
        user['id']
    )

    # Send welcome email now that they're verified
    try:
        b = await _branding(db, request)
        send_welcome_email(user['email'], user.get('name') or user['email'].split('@')[0], lang=user.get('language', 'en'), **b)
    except Exception:
        pass

    return MessageResponse(message="Email verified successfully")

# ── RESEND VERIFICATION ────────────────────────────────
@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    data: MagicLinkRequest,
    request: Request,
    db: asyncpg.Connection = Depends(get_db)
):
    user = await get_user_by_email(db, data.email)
    if not user:
        return MessageResponse(message="If that email exists, a verification link has been sent")
    if user.get('email_verified'):
        return MessageResponse(message="Email is already verified")

    # Delete old tokens and create new one
    await db.execute(
        """DELETE FROM verification_tokens
           WHERE user_id = $1 AND type = 'email_verification'""",
        user['id']
    )
    try:
        verify_token = await create_verification_token(
            db, str(user['id']), 'email_verification'
        )
        b = await _branding(db, request)
        send_verification_email(
            user['email'],
            user.get('name') or user['email'].split('@')[0],
            verify_token,
            lang=user.get('language', 'en'),
            **b
        )
    except Exception:
        pass

    return MessageResponse(message="Verification email sent")

# ── MAGIC LINK REQUEST ─────────────────────────────────
@router.post("/magic-link", response_model=MessageResponse)
async def request_magic_link(
    data: MagicLinkRequest,
    db: asyncpg.Connection = Depends(get_db)
):
    user = await get_user_by_email(db, data.email)
    # Always return success — never reveal if email exists
    if not user:
        return MessageResponse(message="If that email exists, a magic link has been sent")

    try:
        token = await create_magic_link_token(db, str(user['id']))
        send_magic_link_email(
            user['email'],
            user.get('name') or '',
            token,
            lang=user.get('language', 'en')
        )
    except Exception:
        pass

    return MessageResponse(message="Magic link sent — check your inbox")

# ── MAGIC LINK VERIFY ──────────────────────────────────
@router.post("/magic-link/verify", response_model=AuthResponse)
async def verify_magic_link(
    request: Request,
    db: asyncpg.Connection = Depends(get_db)
):
    body = await request.json()
    token = body.get("token", "")
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")

    user = await consume_verification_token(db, token, 'magic_link')
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired magic link")

    # Auto-verify email if not already
    if not user.get('email_verified'):
        await db.execute(
            "UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1",
            user['id']
        )

    workspace = await get_workspace_by_owner(db, str(user['id']))
    if not workspace:
        raise HTTPException(status_code=404, detail="No workspace found")

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

# ── REFRESH TOKEN ─────────────────────────────────────
class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/refresh")
async def refresh_token(
    data: RefreshRequest,
    db: asyncpg.Connection = Depends(get_db)
):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")

    # Verify token exists in sessions and is not expired
    session = await db.fetchrow(
        "SELECT id FROM sessions WHERE token = $1 AND expires_at > NOW()",
        data.refresh_token
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or not found")

    from app.core.security import create_access_token
    new_access_token = create_access_token({"sub": user_id})
    return {"access_token": new_access_token}

# ── FORGOT PASSWORD ────────────────────────────────────
@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    request: Request,
    db: asyncpg.Connection = Depends(get_db)
):
    user = await get_user_by_email(db, data.email)
    if not user:
        return MessageResponse(message="If that email exists, a reset link has been sent")

    token = await create_password_reset_token(db, str(user['id']))
    try:
        b = await _branding(db, request)
        send_password_reset_email(
            to_email=data.email,
            name=user.get('name') or data.email.split('@')[0],
            reset_token=token,
            lang=user.get('language', 'en'),
            **b
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
