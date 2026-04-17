import httpx
import json
from bs4 import BeautifulSoup
from datetime import datetime, timezone


def _best_selector(tag) -> str:
    """Return the most useful CSS selector for a BeautifulSoup tag."""
    if tag.get('id'):
        return f"#{tag['id']}"
    classes = [c for c in (tag.get('class') or []) if c and not c.startswith('_')][:2]
    if classes:
        return tag.name + '.' + '.'.join(classes)
    return tag.name


async def scan_page(url: str) -> dict:
    """
    Fetch a page URL and extract structured content blocks.
    Returns a dict with headings, ctas, images, sections, custom_blocks, scanned_at.
    custom_blocks is always [] here — caller merges in existing custom blocks.
    """
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(
                url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; PagePersona/1.0)"}
            )
        html = resp.text
    except Exception as e:
        return {
            "headings": [], "ctas": [], "images": [], "sections": [],
            "custom_blocks": [],
            "scanned_at": None,
            "error": f"Could not fetch page: {str(e)[:120]}"
        }

    soup = BeautifulSoup(html, "html.parser")
    # Remove noise
    for tag in soup(["script", "style", "nav", "footer", "noscript", "svg"]):
        tag.decompose()

    # ── Headings ─────────────────────────────────────────────────────────────
    headings = []
    for tag_name in ["h1", "h2"]:
        for tag in soup.find_all(tag_name):
            text = tag.get_text(strip=True)
            if text and len(text) > 2:
                headings.append({
                    "text": text[:120],
                    "selector": _best_selector(tag),
                    "tag": tag_name
                })
    headings = headings[:10]

    # ── CTAs ─────────────────────────────────────────────────────────────────
    CTA_PATTERNS = ["btn", "button", "cta", "action", "signup", "sign-up",
                    "register", "try", "start", "get-started", "subscribe",
                    "buy", "purchase", "order", "checkout"]
    ctas = []
    seen_cta = set()
    for tag in soup.find_all(["a", "button"]):
        text = tag.get_text(strip=True)
        if not text or len(text) > 60:
            continue
        classes_str = " ".join(tag.get("class") or []).lower()
        tag_id = (tag.get("id") or "").lower()
        is_cta = tag.name == "button" or any(
            p in classes_str or p in tag_id for p in CTA_PATTERNS
        )
        if not is_cta:
            continue
        sel = _best_selector(tag)
        if sel in seen_cta:
            continue
        seen_cta.add(sel)
        ctas.append({
            "text": text[:60],
            "selector": sel,
            "type": "button" if tag.name == "button" else "link"
        })
    ctas = ctas[:10]

    # ── Images ───────────────────────────────────────────────────────────────
    images = []
    seen_img = set()
    for img in soup.find_all("img"):
        alt = (img.get("alt") or "").strip()
        if not alt or len(alt) < 4:
            continue
        sel = _best_selector(img)
        if sel in seen_img:
            continue
        seen_img.add(sel)
        images.append({
            "alt": alt[:80],
            "selector": sel,
        })
    images = images[:8]

    # ── Sections ─────────────────────────────────────────────────────────────
    sections = []
    seen_sec = set()
    for tag in soup.find_all(["section", "div", "article", "main"]):
        sel = _best_selector(tag)
        if sel in ("div", "section", "article", "main"):
            continue
        if sel in seen_sec:
            continue
        preview = tag.get_text(separator=" ", strip=True)[:100]
        if not preview:
            continue
        seen_sec.add(sel)
        sections.append({"selector": sel, "preview": preview})
    sections = sections[:20]

    return {
        "headings": headings,
        "ctas": ctas,
        "images": images,
        "sections": sections,
        "custom_blocks": [],
        "scanned_at": datetime.now(timezone.utc).isoformat()
    }


async def run_scan_and_save(project_id: str, url: str, preserve_custom: list = None):
    """
    Background helper: scan the page and write page_scan to DB.
    Gets its own DB connection from the pool.
    """
    from app.database import get_pool
    import uuid as uuid_mod

    result = await scan_page(url)

    # Preserve any custom_blocks the user has added
    if preserve_custom:
        result["custom_blocks"] = preserve_custom

    pool = await get_pool()
    async with pool.acquire() as db:
        await db.execute(
            "UPDATE projects SET page_scan = $1::jsonb WHERE id = $2",
            json.dumps(result),
            uuid_mod.UUID(project_id)
        )
