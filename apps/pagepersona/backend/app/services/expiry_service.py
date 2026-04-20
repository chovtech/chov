"""
Daily expiry check — sends grace period warning emails.

Runs once per day via background task in main.py.
Tracks which emails have been sent via expiry_notifications table.
"""
import asyncpg
import logging
from datetime import datetime, timezone

from app.services.email_service import send_expiry_warning_email

logger = logging.getLogger(__name__)

PLAN_LABELS = {
    "unlimited":    "Unlimited",
    "professional": "Professional",
    "agency":       "Agency",
}

# Day checkpoints within the grace period at which we send an email
# Key = days_expired threshold, value = notification_type identifier
GRACE_CHECKPOINTS = {
    1: "grace_day1",
    4: "grace_day4",
    7: "grace_day7",
}


async def send_expiry_warning_emails(db: asyncpg.Connection) -> None:
    """
    Find all entitlements in the grace window (expired 1–7 days ago)
    and send the appropriate reminder email if not already sent.
    """
    now = datetime.now(timezone.utc)

    rows = await db.fetch(
        """
        SELECT
            e.id          AS entitlement_id,
            e.plan,
            e.expires_at,
            u.email,
            u.name,
            u.language
        FROM entitlements e
        JOIN workspaces w ON w.id = e.workspace_id AND w.parent_workspace_id IS NULL
        JOIN users u ON u.id = w.owner_id
        WHERE e.product_id = 'pagepersona'
          AND e.status = 'active'
          AND e.expires_at IS NOT NULL
          AND e.expires_at < $1
          AND e.expires_at > ($1 - INTERVAL '7 days')
        """,
        now,
    )

    for row in rows:
        days_expired = max(1, (now - row["expires_at"]).days)
        days_left = max(0, 7 - days_expired)
        plan_label = PLAN_LABELS.get(row["plan"], row["plan"].title())
        ent_id = row["entitlement_id"]

        for threshold, notif_type in GRACE_CHECKPOINTS.items():
            if days_expired < threshold:
                continue

            already_sent = await db.fetchval(
                """SELECT 1 FROM expiry_notifications
                   WHERE entitlement_id = $1 AND notification_type = $2""",
                ent_id, notif_type,
            )
            if already_sent:
                continue

            try:
                send_expiry_warning_email(
                    to_email=row["email"],
                    name=row["name"] or row["email"],
                    plan_label=plan_label,
                    days_ago=days_expired,
                    days_left=days_left,
                    lang=row["language"] or "en",
                )
                await db.execute(
                    """INSERT INTO expiry_notifications (entitlement_id, notification_type)
                       VALUES ($1, $2) ON CONFLICT DO NOTHING""",
                    ent_id, notif_type,
                )
                logger.info(f"Expiry {notif_type} sent to {row['email']} (plan={row['plan']})")
            except Exception as exc:
                logger.error(f"Failed to send {notif_type} to {row['email']}: {exc}")
