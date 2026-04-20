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

# ── Product ID → (plan, expires_days) ────────────────────────────────────────
# Replace the placeholder strings with your real JVZoo product IDs after setup.
# expires_days=None means lifetime (no expiry).
PRODUCT_PLAN_MAP: dict[str, tuple[str, int | None]] = {
    "JVZOO_FE_PRODUCT_ID":           ("fe",           None),   # Core — lifetime
    "JVZOO_UNLIMITED_PRODUCT_ID":    ("unlimited",    365),    # OTO 1 — yearly
    "JVZOO_PROFESSIONAL_PRODUCT_ID": ("professional", 365),    # OTO 2 — yearly
    "JVZOO_AGENCY_PRODUCT_ID":       ("agency",       365),    # OTO 3 — yearly
    "JVZOO_FASTPASS_PRODUCT_ID":     ("agency",       365),    # FastPass bundle — yearly, highest tier
    "JVZOO_BUNDLE_PRODUCT_ID":       ("agency",       365),    # Webinar bundle — yearly, highest tier
    # Services — no plan granted, just log
    "JVZOO_DFY_PRODUCT_ID":          None,
    "JVZOO_SELFHOSTED_PRODUCT_ID":   None,
}

PLAN_HIERARCHY = {"trial": 0, "fe": 1, "unlimited": 2, "professional": 3, "agency": 4, "owner": 5}


def verify_jvzoo_signature(data: dict, secret_key: str) -> bool:
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

    # Handle refund / chargeback — revoke entitlement
    if transaction_type in ("RFND", "CGBK"):
        await db.execute(
            """UPDATE entitlements SET status = 'refunded', updated_at = NOW()
               WHERE workspace_id = (
                   SELECT w.id FROM workspaces w
                   JOIN users u ON u.id = w.owner_id
                   WHERE u.email = $1 AND w.parent_workspace_id IS NULL
                   LIMIT 1
               ) AND product_id = 'pagepersona'""",
            email,
        )
        logger.info(f"Entitlement revoked for {email} ({transaction_type})")
        return "OK"

    if transaction_type not in ("SALE", "BILL"):
        logger.info(f"Skipping transaction type: {transaction_type}")
        return "OK"

    # Look up product in map
    mapping = PRODUCT_PLAN_MAP.get(product_id)
    if mapping is None:
        if product_id in PRODUCT_PLAN_MAP:
            # Explicitly mapped as a service (None value) — just log
            logger.info(f"Service product {product_id} purchased by {email} — no plan change")
            return "OK"
        # Unknown product ID — log and ignore
        logger.warning(f"Unknown JVZoo product_id: {product_id} for {email}")
        return "OK"

    new_plan, expires_days = mapping
    expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days) if expires_days else None

    # Ensure user exists
    existing_user = await db.fetchrow("SELECT * FROM users WHERE email = $1", email)

    if not existing_user:
        user_id = uuid.uuid4()
        workspace_id = uuid.uuid4()
        temp_password = secrets.token_urlsafe(16)

        await db.execute(
            "INSERT INTO users (id, email, name, email_verified, password_hash) VALUES ($1, $2, $3, $4, $5)",
            user_id, email, name, True, hash_password(temp_password)
        )

        import re
        base_slug = re.sub(r'[^\w]', '-', name.lower()).strip('-')
        slug = base_slug
        counter = 1
        while await db.fetchrow("SELECT id FROM workspaces WHERE slug = $1", slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        await db.execute(
            "INSERT INTO workspaces (id, name, slug, owner_id) VALUES ($1, $2, $3, $4)",
            workspace_id, name, slug, user_id
        )

        workspace_id_for_entitlement = workspace_id
        is_new_user = True
        user_id_str = str(user_id)
    else:
        user = dict(existing_user)
        user_id_str = str(user['id'])
        workspace = await db.fetchrow(
            "SELECT id FROM workspaces WHERE owner_id = $1 AND parent_workspace_id IS NULL ORDER BY created_at ASC LIMIT 1",
            user['id']
        )
        workspace_id_for_entitlement = workspace['id'] if workspace else uuid.uuid4()
        is_new_user = False

    # Determine final plan — never downgrade
    existing_ent = await db.fetchrow(
        "SELECT plan FROM entitlements WHERE workspace_id = $1 AND product_id = 'pagepersona' AND status = 'active'",
        workspace_id_for_entitlement,
    )
    current_plan = existing_ent["plan"] if existing_ent else "trial"
    current_rank = PLAN_HIERARCHY.get(current_plan, 0)
    new_rank = PLAN_HIERARCHY.get(new_plan, 0)
    final_plan = new_plan if new_rank >= current_rank else current_plan

    if transaction_type == "BILL":
        # Renewal — reset expires_at, keep plan
        await db.execute(
            """UPDATE entitlements SET expires_at = $1, updated_at = NOW()
               WHERE workspace_id = $2 AND product_id = 'pagepersona'""",
            expires_at, workspace_id_for_entitlement,
        )
        logger.info(f"Plan renewed for {email}: {current_plan} until {expires_at}")
        return "OK"

    # SALE — upsert entitlement with final (highest) plan
    await db.execute(
        """INSERT INTO entitlements
               (id, workspace_id, product_id, plan, source, status, expires_at, metadata)
           VALUES ($1, $2, 'pagepersona', $3, 'jvzoo', 'active', $4, $5)
           ON CONFLICT (workspace_id, product_id)
           DO UPDATE SET plan = $3, status = 'active', expires_at = $4, updated_at = NOW()""",
        uuid.uuid4(),
        workspace_id_for_entitlement,
        final_plan,
        expires_at,
        f'{{"receipt":"{receipt}","product_id":"{product_id}"}}',
    )

    logger.info(f"Plan set for {email}: {final_plan} (expires: {expires_at})")

    # Send welcome email only for brand-new users
    if is_new_user:
        magic_token = secrets.token_urlsafe(32)
        await db.execute(
            """INSERT INTO verification_tokens (id, user_id, token, type, expires_at)
               VALUES ($1, $2, $3, 'magic_link', $4)""",
            uuid.uuid4(), uuid.UUID(user_id_str), magic_token,
            datetime.now(timezone.utc) + timedelta(hours=24),
        )
        magic_link = f"{settings.FRONTEND_URL}/auth/magic?token={magic_token}"
        try:
            send_jvzoo_welcome_email(email, name, magic_link)
        except Exception as exc:
            logger.error(f"Failed to send JVZoo welcome email to {email}: {exc}")

    # Mautic sync
    try:
        name_parts = name.split()
        await subscribe_contact(
            email=email,
            firstname=name_parts[0] if name_parts else email.split('@')[0],
            lastname=name_parts[-1] if len(name_parts) > 1 else "",
            tags=["pagepersona_signup", f"pagepersona_{final_plan}"]
        )
    except Exception as exc:
        logger.error(f"Mautic sync failed for {email}: {exc}")

    return "OK"
