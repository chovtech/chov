from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
import asyncpg
import httpx
import uuid
from app.database import get_db
from app.core.config import settings
from app.services.auth_service import (
    get_user_by_email, create_session,
    get_workspace_by_owner, generate_slug
)
from app.services.email_service import send_welcome_email
from app.services.mautic_service import subscribe_contact
from app.core.security import hash_password
import secrets
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth/google", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

def get_google_auth_url(state: str, lang: str = "en") -> str:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{GOOGLE_AUTH_URL}?{query}"

@router.get("/login")
async def google_login(request: Request, lang: str = "en", mode: str = "login"):
    """Redirect user to Google OAuth. mode=login or mode=signup."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    state = f"{secrets.token_urlsafe(16)}:{lang}:{mode}"
    auth_url = get_google_auth_url(state, lang)
    return RedirectResponse(url=auth_url)

@router.get("/callback")
async def google_callback(
    request: Request,
    code: str = None,
    state: str = None,
    error: str = None,
    db: asyncpg.Connection = Depends(get_db)
):
    frontend_url = settings.FRONTEND_URL

    if error or not code:
        return RedirectResponse(url=f"{frontend_url}/login?error=google_cancelled")

    # Parse state: token:lang:mode
    lang = "en"
    mode = "login"
    if state:
        parts = state.split(":")
        if len(parts) >= 3:
            _, lang, mode = parts[0], parts[1], parts[2]
        if lang not in ["en", "fr"]:
            lang = "en"
        if mode not in ["login", "signup"]:
            mode = "login"

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        try:
            token_res = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                }
            )
            token_data = token_res.json()

            if "error" in token_data:
                logger.error(f"Google token error: {token_data}")
                return RedirectResponse(url=f"{frontend_url}/{mode}?error=google_failed")

            userinfo_res = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {token_data['access_token']}"}
            )
            userinfo = userinfo_res.json()

        except Exception as e:
            logger.error(f"Google OAuth error: {e}")
            return RedirectResponse(url=f"{frontend_url}/{mode}?error=google_failed")

    google_id = userinfo.get("sub")
    email = userinfo.get("email", "").lower().strip()
    name = userinfo.get("name", "")
    picture = userinfo.get("picture", "")

    if not email:
        return RedirectResponse(url=f"{frontend_url}/{mode}?error=google_no_email")

    # Check if user exists
    existing = await db.fetchrow(
        "SELECT * FROM users WHERE email = $1 OR google_id = $2",
        email, google_id
    )

    # ── LOGIN MODE ─────────────────────────────────────
    if mode == "login":
        if not existing:
            # No account — tell them to sign up
            error_msg = "google_no_account"
            return RedirectResponse(url=f"{frontend_url}/login?error={error_msg}")

        user = dict(existing)
        # Update google_id and avatar if not set
        await db.execute(
            """UPDATE users SET
               google_id = COALESCE(google_id, $1),
               avatar_url = COALESCE(avatar_url, $2),
               email_verified = TRUE,
               updated_at = NOW()
               WHERE id = $3""",
            google_id, picture, user['id']
        )

    # ── SIGNUP MODE ────────────────────────────────────
    elif mode == "signup":
        if existing:
            # Account already exists — tell them to log in
            error_msg = "google_account_exists"
            return RedirectResponse(url=f"{frontend_url}/signup?error={error_msg}")

        # Create new user
        user_id = uuid.uuid4()
        workspace_id = uuid.uuid4()

        base_slug = generate_slug(name or email.split('@')[0])
        slug = base_slug
        counter = 1
        while await db.fetchrow("SELECT id FROM workspaces WHERE slug = $1", slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        await db.execute(
            """INSERT INTO users
               (id, email, name, google_id, avatar_url, email_verified, language, password_hash)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
            user_id, email, name, google_id, picture, True, lang,
            hash_password(secrets.token_urlsafe(32))
        )

        await db.execute(
            """INSERT INTO workspaces (id, name, slug, owner_id)
               VALUES ($1, $2, $3, $4)""",
            workspace_id, name or email.split('@')[0], slug, user_id
        )

        await db.execute(
            """INSERT INTO entitlements
               (id, workspace_id, product_id, plan, source, status)
               VALUES ($1, $2, $3, $4, $5, $6)""",
            uuid.uuid4(), workspace_id, 'pagepersona', 'trial', 'direct', 'active'
        )

        user = dict(await db.fetchrow("SELECT * FROM users WHERE id = $1", user_id))

        # Send welcome email
        try:
            send_welcome_email(email, name, lang=lang)
        except Exception:
            pass

        # Sync to Mautic
        try:
            name_parts = name.split()
            firstname = name_parts[0] if name_parts else email.split('@')[0]
            lastname = name_parts[-1] if len(name_parts) > 1 else ""
            await subscribe_contact(
                email=email,
                firstname=firstname,
                lastname=lastname,
                tags=["pagepersona_signup"],
                company=f"{firstname}'s Workspace"
            )
        except Exception:
            pass

    # Create session and redirect
    ip = request.client.host if request.client else None
    access_token, refresh_token = await create_session(db, str(user['id']), ip)

    redirect_url = (
        f"{frontend_url}/auth/google/callback"
        f"?access_token={access_token}"
        f"&refresh_token={refresh_token}"
    )
    return RedirectResponse(url=redirect_url)
