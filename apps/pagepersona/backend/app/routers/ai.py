"""
AI Router — PagePersona

Endpoints:
  GET  /api/ai/coins            — coin balance + plan info for current workspace
  GET  /api/ai/coins/history    — recent coin transaction log
  GET  /api/ai/brand            — get brand knowledge for workspace
  PUT  /api/ai/brand            — save brand knowledge for workspace
  POST /api/ai/brand/extract    — extract brand profile from website URL (free, Sonnet)
  POST /api/ai/copy/write       — generate 3 copy variants for a swap_text action
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
import asyncpg
import anthropic
import httpx
from bs4 import BeautifulSoup
from app.database import get_db
from app.core.security import get_current_user
from app.core.access import get_accessible_workspace
from app.core.config import settings, AI_MODEL_FAST, AI_MODEL_SMART
from app.services.coin_service import get_balance, check_coins, deduct_coins

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/coins")
async def coins_balance(
    workspace_id: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Return AI coin balance, plan, and cost reference for the workspace."""
    workspace = await get_accessible_workspace(db, current_user["id"], workspace_id)
    return await get_balance(str(workspace["id"]), db)


@router.get("/coins/history")
async def coins_history(
    workspace_id: str | None = Query(default=None),
    limit: int = Query(default=20, le=100),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Return recent AI coin transactions for the workspace."""
    workspace = await get_accessible_workspace(db, current_user["id"], workspace_id)
    rows = await db.fetch(
        """SELECT action_type, coins_deducted, claude_tokens_used,
                  fal_image_generated, metadata, created_at
           FROM ai_coin_transactions
           WHERE workspace_id = $1
           ORDER BY created_at DESC
           LIMIT $2""",
        workspace["id"], limit
    )
    return [dict(r) for r in rows]


# ── Brand Knowledge ──────────────────────────────────────────────────────────

class BrandSettings(BaseModel):
    website_url: Optional[str] = None
    brand_name: Optional[str] = None
    industry: Optional[str] = None
    tone_of_voice: Optional[str] = None
    target_audience: Optional[str] = None
    key_benefits: Optional[str] = None
    about_brand: Optional[str] = None

class BrandSaveRequest(BrandSettings):
    workspace_id: Optional[str] = None

class BrandExtractRequest(BaseModel):
    workspace_id: Optional[str] = None
    url: str


@router.get("/brand")
async def get_brand(
    workspace_id: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Return brand knowledge settings for the workspace."""
    workspace = await get_accessible_workspace(db, current_user["id"], workspace_id)
    row = await db.fetchrow(
        "SELECT * FROM workspace_ai_settings WHERE workspace_id = $1",
        workspace["id"]
    )
    if not row:
        return {}
    return dict(row)


@router.put("/brand")
async def save_brand(
    body: BrandSaveRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Upsert brand knowledge settings for the workspace. Owner/admin only."""
    workspace = await get_accessible_workspace(db, current_user["id"], body.workspace_id)
    ws_id = workspace["id"]

    # Only owner or admin can save brand settings
    member_role = await db.fetchval(
        "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
        ws_id, current_user["id"]
    )
    is_owner = str(workspace["owner_id"]) == str(current_user["id"])
    if not is_owner and member_role not in ("admin",):
        raise HTTPException(status_code=403, detail="Only workspace owners and admins can update brand settings.")

    await db.execute(
        """INSERT INTO workspace_ai_settings
             (workspace_id, website_url, brand_name, industry, tone_of_voice,
              target_audience, key_benefits, about_brand, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
           ON CONFLICT (workspace_id) DO UPDATE SET
             website_url    = EXCLUDED.website_url,
             brand_name     = EXCLUDED.brand_name,
             industry       = EXCLUDED.industry,
             tone_of_voice  = EXCLUDED.tone_of_voice,
             target_audience = EXCLUDED.target_audience,
             key_benefits   = EXCLUDED.key_benefits,
             about_brand    = EXCLUDED.about_brand,
             updated_at     = now()""",
        ws_id,
        body.website_url, body.brand_name, body.industry, body.tone_of_voice,
        body.target_audience, body.key_benefits, body.about_brand,
    )
    return {"ok": True}


@router.post("/brand/extract")
async def extract_brand(
    body: BrandExtractRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Fetch a website URL, extract readable content, and use Sonnet to infer
    brand profile fields. Free — this is a one-time setup action.
    Returns populated fields for the user to review before saving.
    """
    workspace = await get_accessible_workspace(db, current_user["id"], body.workspace_id)

    # ── Fetch page ────────────────────────────────────────────────────────────
    url = body.url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; PagePersona/1.0)"})
        html = resp.text
    except Exception:
        raise HTTPException(status_code=422, detail="Could not fetch that URL. Check it is publicly accessible.")

    # ── Extract readable text ─────────────────────────────────────────────────
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    meta_desc = ""
    meta_tag = soup.find("meta", attrs={"name": "description"})
    if meta_tag and meta_tag.get("content"):
        meta_desc = meta_tag["content"].strip()

    headings = " | ".join(h.get_text(strip=True) for h in soup.find_all(["h1", "h2", "h3"])[:10])
    body_text = soup.get_text(separator=" ", strip=True)
    body_text = " ".join(body_text.split())[:3000]

    page_content = f"Title: {title}\nMeta description: {meta_desc}\nHeadings: {headings}\nPage content: {body_text}"

    # ── Call Sonnet ───────────────────────────────────────────────────────────
    extract_prompt = f"""You are a brand analyst. Extract a structured brand profile from this website content.

Website content:
{page_content}

Return ONLY a valid JSON object with exactly these keys — no markdown, no explanation:
{{
  "brand_name": "company or product name",
  "industry": "industry or niche (e.g. SaaS / Project Management)",
  "tone_of_voice": "how they communicate (e.g. Professional but friendly)",
  "target_audience": "who they sell to (e.g. B2B founders aged 30-50)",
  "key_benefits": "main value propositions, comma-separated",
  "about_brand": "2-3 sentences capturing the brand's story, differentiators, and personality"
}}

If a field cannot be confidently inferred from the content, use an empty string."""

    ai_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = ai_client.messages.create(
        model=AI_MODEL_SMART,
        max_tokens=512,
        messages=[{"role": "user", "content": extract_prompt}],
    )

    raw = message.content[0].text.strip()
    try:
        extracted = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=502, detail="AI returned unexpected format. Please fill in the fields manually.")

    return {
        "website_url": url,
        **extracted,
    }


# ── Copy Writer ───────────────────────────────────────────────────────────────

class CopyWriteContext(BaseModel):
    page_url: Optional[str] = None
    element_selector: Optional[str] = None
    current_text: Optional[str] = None       # live text from picker selectedEl
    conditions: Optional[list] = None        # [{signal, operator, value}, ...]
    max_words: Optional[int] = None          # enforce short copy (e.g. button labels)

class CopyWriteRequest(BaseModel):
    workspace_id: Optional[str] = None
    goal: str
    context: Optional[CopyWriteContext] = None


@router.post("/copy/write")
async def write_copy(
    body: CopyWriteRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Generate 3 personalised copy variants for a swap_text action.
    Costs 5 AI coins. Owner plan bypasses.
    """
    workspace = await get_accessible_workspace(db, current_user["id"], body.workspace_id)
    ws_id = str(workspace["id"])

    await check_coins(ws_id, "write_copy", db)

    # ── Fetch brand knowledge ─────────────────────────────────────────────────
    brand_row = await db.fetchrow(
        "SELECT * FROM workspace_ai_settings WHERE workspace_id = $1", ws_id
    )
    brand_lines = []
    if brand_row:
        if brand_row.get("brand_name"):
            brand_lines.append(f"Brand name: {brand_row['brand_name']}")
        if brand_row.get("industry"):
            brand_lines.append(f"Industry: {brand_row['industry']}")
        if brand_row.get("tone_of_voice"):
            brand_lines.append(f"Tone of voice: {brand_row['tone_of_voice']}")
        if brand_row.get("target_audience"):
            brand_lines.append(f"Target audience: {brand_row['target_audience']}")
        if brand_row.get("key_benefits"):
            brand_lines.append(f"Key benefits: {brand_row['key_benefits']}")
        if brand_row.get("about_brand"):
            brand_lines.append(f"About the brand: {brand_row['about_brand']}")

    # ── Build prompt ──────────────────────────────────────────────────────────
    ctx = body.context or CopyWriteContext()

    context_lines = []
    if ctx.page_url:
        context_lines.append(f"- Page URL: {ctx.page_url}")
    if ctx.element_selector:
        context_lines.append(f"- Target element selector: {ctx.element_selector}")
    if ctx.current_text:
        context_lines.append(f"- Element currently shows: \"{ctx.current_text}\"")
    if ctx.conditions:
        segment = " AND ".join(
            f"{c.get('signal','')} {c.get('operator','')} {c.get('value','')}".strip()
            for c in ctx.conditions if c.get("signal")
        )
        if segment:
            context_lines.append(f"- Visitor segment: {segment}")

    max_words = ctx.max_words or 20
    context_block = "\n".join(context_lines) if context_lines else "No additional context."

    brand_block = "\n".join(brand_lines) if brand_lines else ""
    brand_section = f"\nBrand context:\n{brand_block}\n" if brand_block else ""

    prompt = f"""You are an expert website conversion copywriter helping personalise a webpage for a specific visitor segment.
{brand_section}
Context:
{context_block}

User's goal: {body.goal}

Write exactly 3 short copy variants for this element. Each variant must be no more than {max_words} words.
Be direct, specific, and conversion-focused. Match the tone to the element type and brand voice if provided.

Return ONLY a valid JSON array with this exact shape — no markdown, no explanation:
[
  {{"text": "...", "rationale": "one sentence explaining why this works"}},
  {{"text": "...", "rationale": "one sentence explaining why this works"}},
  {{"text": "...", "rationale": "one sentence explaining why this works"}}
]"""

    # ── Call Haiku ────────────────────────────────────────────────────────────
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=AI_MODEL_FAST,
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    tokens_used = message.usage.input_tokens + message.usage.output_tokens

    try:
        variants = json.loads(raw)
        if not isinstance(variants, list) or len(variants) == 0:
            raise ValueError("Bad shape")
    except Exception:
        raise HTTPException(status_code=502, detail="AI returned unexpected format. Please try again.")

    # ── Deduct coins ──────────────────────────────────────────────────────────
    new_balance = await deduct_coins(
        workspace_id=ws_id,
        action_type="write_copy",
        db=db,
        claude_tokens_used=tokens_used,
        metadata={"goal": body.goal[:200]},
    )

    return {
        "variants": variants[:3],
        "coins_used": 5,
        "balance": new_balance,
    }
