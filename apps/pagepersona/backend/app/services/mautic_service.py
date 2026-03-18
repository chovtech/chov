import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_headers():
    return {
        "Content-Type": "application/json",
        "X-App-Token": settings.MAUTIC_API_TOKEN or "",
    }

async def subscribe_contact(
    email: str,
    firstname: str,
    lastname: str = "",
    tags: list = [],
    company: str = ""
):
    """Add contact to PagePersona segment with tags. Creates or updates."""
    if not settings.MAUTIC_API_URL or not settings.MAUTIC_API_TOKEN:
        logger.warning("Mautic not configured — skipping sync")
        return None
    payload = {
        "email": email,
        "firstname": firstname,
        "lastname": lastname,
        "company": company or f"{firstname}'s Workspace",
        "tags": tags,
        "segments": [settings.MAUTIC_PAGEPERSONA_SEGMENT_ID],
    }
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            res = await client.post(
                f"{settings.MAUTIC_API_URL}/subscribe",
                json=payload,
                headers=get_headers(),
            )
            data = res.json()
            if res.status_code == 200 and data.get("success"):
                logger.info(f"Mautic subscribe OK {email}: contact_id={data.get('contact_id')} upsert={data.get('upsert')}")
            else:
                logger.error(f"Mautic subscribe FAILED {email}: status={res.status_code} response={data}")
            return data
        except Exception as e:
            logger.error(f"Mautic subscribe error for {email}: {e}")
            return None

async def update_contact_tags(email: str, add_tags: list = [], remove_tags: list = []):
    """Add or remove tags on a contact."""
    if not settings.MAUTIC_API_URL or not settings.MAUTIC_API_TOKEN:
        return None
    payload = {"email": email, "add": add_tags, "remove": remove_tags}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            res = await client.post(
                f"{settings.MAUTIC_API_URL}/tag",
                json=payload,
                headers=get_headers(),
            )
            data = res.json()
            if res.status_code == 200 and data.get("success"):
                logger.info(f"Mautic tag OK {email}: contact_id={data.get('contact_id')}")
            else:
                logger.error(f"Mautic tag FAILED {email}: status={res.status_code} response={data}")
            return data
        except Exception as e:
            logger.error(f"Mautic tag error for {email}: {e}")
            return None

async def update_contact(email: str, fields: dict):
    """Update contact fields without triggering campaigns."""
    if not settings.MAUTIC_API_URL or not settings.MAUTIC_API_TOKEN:
        return None
    payload = {"email": email, **fields}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            res = await client.post(
                f"{settings.MAUTIC_API_URL}/update",
                json=payload,
                headers=get_headers(),
            )
            data = res.json()
            if res.status_code == 200 and data.get("success"):
                logger.info(f"Mautic update OK {email}: contact_id={data.get('contact_id')}")
            else:
                logger.error(f"Mautic update FAILED {email}: status={res.status_code} response={data}")
            return data
        except Exception as e:
            logger.error(f"Mautic update error for {email}: {e}")
            return None
