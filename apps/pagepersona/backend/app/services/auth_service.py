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
    password: str,
    language: str = "en"
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
        INSERT INTO users (id, email, name, email_verified, language)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        """,
        user_id, email, name, False, language
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
        VALUES ($1, $2, $3, $4, $5)
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

async def create_password_reset_token(
    db: asyncpg.Connection,
    user_id: str
) -> str:
    """Generate a password reset token valid for 1 hour."""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    await db.execute(
        "DELETE FROM password_reset_tokens WHERE user_id = $1",
        uuid.UUID(user_id)
    )
    await db.execute(
        """
        INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        """,
        uuid.uuid4(),
        uuid.UUID(user_id),
        token,
        expires_at
    )
    return token

async def get_user_by_reset_token(
    db: asyncpg.Connection,
    token: str
) -> Optional[dict]:
    """Validate reset token and return user if valid."""
    row = await db.fetchrow(
        """
        SELECT u.* FROM users u
        JOIN password_reset_tokens t ON t.user_id = u.id
        WHERE t.token = $1 AND t.expires_at > NOW() AND t.used_at IS NULL
        """,
        token
    )
    return dict(row) if row else None

async def consume_reset_token(
    db: asyncpg.Connection,
    token: str,
    new_password: str
) -> bool:
    """Mark token used and update password."""
    user = await get_user_by_reset_token(db, token)
    if not user:
        return False
    hashed = hash_password(new_password)
    await db.execute(
        "UPDATE users SET password_hash = $1 WHERE id = $2",
        hashed, user['id']
    )
    await db.execute(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1",
        token
    )
    return True

async def create_magic_link_token(
    db: asyncpg.Connection,
    user_id: str
) -> str:
    """Generate a magic link token valid for 24 hours."""
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
        'magic_link',
        expires_at
    )
    return token

async def consume_verification_token(
    db: asyncpg.Connection,
    token: str,
    token_type: str
) -> Optional[dict]:
    """Validate and consume a verification token. Returns user if valid."""
    row = await db.fetchrow(
        """
        SELECT u.*, vt.id as token_id FROM users u
        JOIN verification_tokens vt ON vt.user_id = u.id
        WHERE vt.token = $1
          AND vt.type = $2
          AND vt.expires_at > NOW()
          AND vt.used_at IS NULL
        """,
        token, token_type
    )
    if not row:
        return None
    user = dict(row)
    # Mark token as used
    await db.execute(
        "UPDATE verification_tokens SET used_at = NOW() WHERE id = $1",
        user['token_id']
    )
    return user
