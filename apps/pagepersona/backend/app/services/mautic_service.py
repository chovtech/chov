import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

HEADERS = {
    "Content-Type": "application/json",
    "X-App-Token": settings.MAUTIC_API_TOKEN or "",
}

async def subscribe_contact(email: str, firstname: str, lastname: str = "", tags: list = []):
    """Add contact to PagePersona segment with tags."""
    if not settings.MAUTIC_API_URL:
        logger.warning("Mautic not configured — skipping sync")
        return None
    payload = {
        "email": email,
        "firstname": firstname,
        "lastname": lastname,
        "company": "PagePersona User",
        "tags": tags,
        "segments": [settings.MAUTIC_PAGEPERSONA_SEGMENT_ID],
    }
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            res = await client.post(
                f"{settings.MAUTIC_API_URL}/subscribe",
                json=payload,
                headers=HEADERS,
            )
            logger.info(f"Mautic subscribe {email}: {res.status_code}")
            return res.json()
        except Exception as e:
            logger.error(f"Mautic subscribe error for {email}: {e}")
            return None

async def update_contact_tags(email: str, add_tags: list = [], remove_tags: list = []):
    """Add or remove tags on a contact."""
    if not settings.MAUTIC_API_URL:
        return None
    payload = {"email": email, "add": add_tags, "remove": remove_tags}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            res = await client.post(
                f"{settings.MAUTIC_API_URL}/tag",
                json=payload,
                headers=HEADERS,
            )
            logger.info(f"Mautic tag update {email}: {res.status_code}")
            return res.json()
        except Exception as e:
            logger.error(f"Mautic tag error for {email}: {e}")
            return None

async def update_contact(email: str, fields: dict):
    """Update contact fields without triggering campaigns."""
    if not settings.MAUTIC_API_URL:
        return None
    payload = {"email": email, **fields}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            res = await client.post(
                f"{settings.MAUTIC_API_URL}/update",
                json=payload,
                headers=HEADERS,
            )
            logger.info(f"Mautic update {email}: {res.status_code}")
            return res.json()
        except Exception as e:
            logger.error(f"Mautic update error for {email}: {e}")
            return None
