import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
import asyncpg
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.config import settings

def generate_slug(name: str) -> str:
    """Convert workspace name to a URL-safe slug."""
    import re
    slug = name.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_-]+', '-', slug)
    slug = slug.strip('-')
    return slug

async def get_user_by_email(db: asyncpg.Connection, email: str) -> Optional[dict]:
    """Find a user by email address."""
    row = await db.fetchrow(
        "SELECT * FROM users WHERE email = $1", email
    )
    return dict(row) if row else None

async def get_user_by_id(db: asyncpg.Connection, user_id: str) -> Optional[dict]:
    """Find a user by ID."""
    row = await db.fetchrow(
        "SELECT * FROM users WHERE id = $1", uuid.UUID(user_id)
    )
    return dict(row) if row else None

async def get_workspace_by_owner(db: asyncpg.Connection, owner_id: str) -> Optional[dict]:
    """Find the primary workspace for a user."""
    row = await db.fetchrow(
        "SELECT * FROM workspaces WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1",
        uuid.UUID(owner_id)
    )
    return dict(row) if row else None

async def create_user_and_workspace(
    db: asyncpg.Connection,
    email: str,
    name: str,
    password: str
) -> tuple[dict, dict]:
    """
    Create a new user and their workspace together.
    This is the Chov account creation — one user, one workspace.
    """
    user_id = uuid.uuid4()
    workspace_id = uuid.uuid4()
    hashed = hash_password(password)

    # Generate unique slug
    base_slug = generate_slug(name or email.split('@')[0])
    slug = base_slug
    counter = 1
    while await db.fetchrow("SELECT id FROM workspaces WHERE slug = $1", slug):
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Create user
    user = await db.fetchrow(
        """
        INSERT INTO users (id, email, name, email_verified)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        """,
        user_id, email, name, False
    )

    # Store password in sessions-adjacent table
    # We store hashed password on the user record via an update
    # In production you would have a separate credentials table
    await db.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT",
    )
    await db.execute(
        "UPDATE users SET password_hash = $1 WHERE id = $2",
        hashed, user_id
    )

    # Create workspace
    workspace = await db.fetchrow(
        """
        INSERT INTO workspaces (id, name, slug, owner_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        """,
        workspace_id,
        name or email.split('@')[0],
        slug,
        user_id
    )

    # Grant PagePersona entitlement
    await db.execute(
        """
        INSERT INTO entitlements (id, workspace_id, product_id, plan, source, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        """,
        uuid.uuid4(),
        workspace_id,
        'pagepersona',
        'trial',
        'direct',
        'active'
    )

    return dict(user), dict(workspace)

async def authenticate_user(
    db: asyncpg.Connection,
    email: str,
    password: str
) -> Optional[dict]:
    """Verify email and password. Return user if valid."""
    row = await db.fetchrow(
        "SELECT * FROM users WHERE email = $1", email
    )
    if not row:
        return None
    user = dict(row)
    password_hash = user.get('password_hash')
    if not password_hash:
        return None
    if not verify_password(password, password_hash):
        return None
    return user

async def create_session(
    db: asyncpg.Connection,
    user_id: str,
    ip_address: Optional[str] = None
) -> tuple[str, str]:
    """Create access and refresh tokens, store session."""
    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})

    expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    await db.execute(
        """
        INSERT INTO sessions (id, user_id, token, ip_address, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        """,
        uuid.uuid4(),
        uuid.UUID(user_id),
        refresh_token,
        ip_address,
        expires_at
    )

    return access_token, refresh_token

async def create_verification_token(
    db: asyncpg.Connection,
    user_id: str,
    token_type: str = "email_verification"
) -> str:
    """Generate a one-time verification token."""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    await db.execute(
        """
        INSERT INTO verification_tokens (id, user_id, token, type, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        """,
        uuid.uuid4(),
        uuid.UUID(user_id),
        token,
        token_type,
        expires_at
    )

    return token
