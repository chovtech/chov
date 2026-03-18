from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import PlainTextResponse
import asyncpg
import hashlib
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.core.config import settings
from app.core.security import hash_password
from app.services.email_service import send_jvzoo_welcome_email
from app.services.mautic_service import subscribe_contact, update_contact_tags
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

def verify_jvzoo_signature(data: dict, secret_key: str) -> bool:
    """Validate JVZoo IPN signature."""
    received_sig = data.get("cverify", "")
    fields = [
        data.get("ctransreceipt", ""),
        data.get("ctransaction", ""),
        data.get("cproditem", ""),
        data.get("ctransamount", ""),
        data.get("ccustemail", ""),
        secret_key,
    ]
    raw = "|".join(fields)
    computed = hashlib.sha1(raw.encode()).hexdigest().upper()
    return computed == received_sig.upper()

@router.post("/jvzoo", response_class=PlainTextResponse)
async def jvzoo_webhook(
    request: Request,
    db: asyncpg.Connection = Depends(get_db)
):
    form = await request.form()
    data = dict(form)
    logger.info(f"JVZoo IPN received: {data}")

    # Verify signature
    if settings.JVZOO_SECRET_KEY:
        if not verify_jvzoo_signature(data, settings.JVZOO_SECRET_KEY):
            logger.warning("JVZoo signature verification failed")
            raise HTTPException(status_code=400, detail="Invalid signature")

    transaction_type = data.get("ctransaction", "")
    email = data.get("ccustemail", "").lower().strip()
    first_name = data.get("ccustfirstname", "")
    last_name = data.get("ccustlastname", "")
    name = f"{first_name} {last_name}".strip() or email.split('@')[0]
    product_id = data.get("cproditem", "")
    receipt = data.get("ctransreceipt", "")

    if not email:
        return "OK"

    # Only process SALE and BILL (recurring) transactions
    if transaction_type not in ("SALE", "BILL"):
        logger.info(f"Skipping transaction type: {transaction_type}")
        return "OK"

    # Check if user exists
    existing_user = await db.fetchrow(
        "SELECT * FROM users WHERE email = $1", email
    )

    if not existing_user:
        # Create new user account
        user_id = uuid.uuid4()
        workspace_id = uuid.uuid4()
        temp_password = secrets.token_urlsafe(16)

        await db.execute(
            """
            INSERT INTO users (id, email, name, email_verified, password_hash)
            VALUES ($1, $2, $3, $4, $5)
            """,
            user_id, email, name, True, hash_password(temp_password)
        )

        # Generate workspace slug
        import re
        base_slug = re.sub(r'[^\w]', '-', name.lower()).strip('-')
        slug = base_slug
        counter = 1
        while await db.fetchrow("SELECT id FROM workspaces WHERE slug = $1", slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        await db.execute(
            """
            INSERT INTO workspaces (id, name, slug, owner_id)
            VALUES ($1, $2, $3, $4)
            """,
            workspace_id, name, slug, user_id
        )

        user_id_str = str(user_id)
        workspace_id_for_entitlement = workspace_id
    else:
        user = dict(existing_user)
        user_id_str = str(user['id'])
        workspace = await db.fetchrow(
            "SELECT * FROM workspaces WHERE owner_id = $1", user['id']
        )
        workspace_id_for_entitlement = workspace['id'] if workspace else uuid.uuid4()

    # Create or update entitlement
    await db.execute(
        """
        INSERT INTO entitlements
            (id, workspace_id, product_id, plan, source, status, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (workspace_id, product_id)
        DO UPDATE SET plan = $4, status = $6, updated_at = NOW()
        """,
        uuid.uuid4(),
        workspace_id_for_entitlement,
        'pagepersona',
        'ltd',
        'jvzoo',
        'active',
        f'{{"receipt":"{receipt}","product_id":"{product_id}"}}'
    )

    # Generate magic login link
    magic_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    await db.execute(
        """
        INSERT INTO verification_tokens (id, user_id, token, type, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        """,
        uuid.uuid4(),
        uuid.UUID(user_id_str),
        magic_token,
        'magic_link',
        expires_at
    )
    magic_link = f"{settings.FRONTEND_URL}/auth/magic?token={magic_token}"

    # Send welcome email
    try:
        send_jvzoo_welcome_email(email, name, magic_link)
    except Exception as e:
        logger.error(f"Failed to send JVZoo welcome email: {e}")

    # Sync to Mautic
    try:
        name_parts = name.split()
        await subscribe_contact(
            email=email,
            firstname=name_parts[0] if name_parts else email.split('@')[0],
            lastname=name_parts[-1] if len(name_parts) > 1 else "",
            tags=["pagepersona_signup", "pagepersona_ltd"]
        )
    except Exception as e:
        logger.error(f"Mautic sync failed: {e}")

    logger.info(f"JVZoo purchase processed for {email}")
    return "OK"
