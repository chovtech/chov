"""
AI Router — PagePersona

Endpoints:
  GET  /api/ai/coins            — coin balance + plan info for current workspace
  GET  /api/ai/coins/history    — recent coin transaction log
  GET  /api/ai/brand            — get brand knowledge for workspace
  PUT  /api/ai/brand            — save brand knowledge for workspace
  POST /api/ai/brand/extract    — extract brand profile from website URL (free, Sonnet)
  POST /api/ai/copy/write       — generate 3 copy variants for a swap_text action
  POST /api/ai/image/generate   — generate an image via fal.ai Flux Dev, upload to R2, save to assets
  POST /api/ai/popup/generate   — generate a full popup layout + blocks from a goal description
  POST /api/ai/rules/suggest    — suggest 3–5 personalisation rules based on page scan + brand context
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
import uuid
import asyncpg
import anthropic
import httpx
import fal_client
from bs4 import BeautifulSoup
from app.database import get_db
from app.core.security import get_current_user
from app.core.access import get_accessible_workspace
from app.core.config import settings, AI_MODEL_FAST, AI_MODEL_SMART, AI_IMAGE_MODEL
from app.routers.upload import get_r2_client
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


# ── Project Description Extractor ─────────────────────────────────────────────

class ProjectDescriptionRequest(BaseModel):
    workspace_id: Optional[str] = None
    url: str

@router.post("/project/extract-description")
async def extract_project_description(
    body: ProjectDescriptionRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Fetch a project page URL and extract a concise description of what it sells/does.
    Costs 3 AI coins. Used at project creation and edit.
    """
    workspace = await get_accessible_workspace(db, current_user["id"], body.workspace_id)
    ws_id = str(workspace["id"])

    await check_coins(ws_id, "project_describe", db)

    url = body.url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; PagePersona/1.0)"})
        html = resp.text
    except Exception:
        raise HTTPException(status_code=422, detail="Could not fetch that URL. Make sure it is publicly accessible.")

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    meta_desc = ""
    meta_tag = soup.find("meta", attrs={"name": "description"})
    if meta_tag and meta_tag.get("content"):
        meta_desc = meta_tag["content"].strip()
    headings = " | ".join(h.get_text(strip=True) for h in soup.find_all(["h1", "h2", "h3"])[:8])
    body_text = " ".join(soup.get_text(separator=" ", strip=True).split())[:2500]

    page_content = f"Title: {title}\nMeta description: {meta_desc}\nHeadings: {headings}\nPage content: {body_text}"

    extract_prompt = f"""You are a conversion analyst reviewing a sales or landing page.

Page content:
{page_content}

Write a concise project description (4-6 sentences) that captures:
1. What the product or service is
2. Who it is for (target audience)
3. The core problem it solves or the main benefit it delivers
4. Key offer details, features, or unique angle (pricing, format, guarantee, etc.)
5. The tone and intent of the page (e.g. hard sell, educational, community, urgency-driven)

This description will be used to give an AI copywriter context about this specific page when generating personalised copy variants. Be specific and factual — do not invent details not present in the content.

Return ONLY the description text. No labels, no JSON, no markdown."""

    ai_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = ai_client.messages.create(
        model=AI_MODEL_SMART,
        max_tokens=300,
        messages=[{"role": "user", "content": extract_prompt}],
    )

    description = message.content[0].text.strip()
    tokens_used = message.usage.input_tokens + message.usage.output_tokens

    new_balance = await deduct_coins(
        workspace_id=ws_id,
        action_type="project_describe",
        db=db,
        claude_tokens_used=tokens_used,
        metadata={"url": url},
    )

    return {"description": description, "balance": new_balance}


# ── Copy Writer ───────────────────────────────────────────────────────────────

class CopyWriteContext(BaseModel):
    page_url: Optional[str] = None
    element_selector: Optional[str] = None
    current_text: Optional[str] = None       # live text from picker selectedEl
    conditions: Optional[list] = None        # [{signal, operator, value}, ...]
    max_words: Optional[int] = None          # enforce short copy (e.g. button labels)
    project_id: Optional[str] = None        # when set, fetches project name + page URL for context

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

    # Fetch project context if project_id provided
    project_context = ""
    if ctx.project_id:
        proj = await db.fetchrow(
            "SELECT name, page_url, description FROM projects WHERE id = $1 AND workspace_id = $2",
            ctx.project_id, ws_id
        )
        if proj:
            if proj["description"]:
                project_context = f"\nPage context:\n- Project: {proj['name']}\n- Page URL: {proj['page_url']}\n- About this page: {proj['description']}\n"
            else:
                project_context = f"\nPage context:\n- Project: {proj['name']}\n- Page URL: {proj['page_url']}\n"

    context_lines = []
    if ctx.page_url and not ctx.project_id:
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
{brand_section}{project_context}
Context:
{context_block}

User's goal: {body.goal}

Write exactly 3 short copy variants for this element. Each variant must be no more than {max_words} words.
Be direct, specific, and conversion-focused.
The brand context above sets the background voice and style — use it as a guide. The user's goal above is the primary directive and always overrides brand tone if there is any conflict.

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

    # Strip markdown code fences if model wrapped the JSON (e.g. ```json ... ```)
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1].lstrip("json").strip() if len(parts) >= 2 else raw

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


# ── Popup Generator ───────────────────────────────────────────────────────────

class PopupGenerateRequest(BaseModel):
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None
    goal: str

@router.post("/popup/generate")
async def generate_popup(
    body: PopupGenerateRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Generate a full popup config (blocks + layout + bg_color) from a goal description.
    AI picks structure and content. Backend applies style defaults per block role.
    Costs 5 AI coins.
    """
    workspace = await get_accessible_workspace(db, current_user["id"], body.workspace_id)
    ws_id = str(workspace["id"])

    await check_coins(ws_id, "popup_content", db)

    # ── Brand context ─────────────────────────────────────────────────────────
    brand_row = await db.fetchrow(
        "SELECT * FROM workspace_ai_settings WHERE workspace_id = $1", ws_id
    )
    brand_lines = []
    if brand_row:
        for key, label in [
            ("brand_name", "Brand name"), ("industry", "Industry"),
            ("tone_of_voice", "Tone of voice"), ("target_audience", "Target audience"),
            ("key_benefits", "Key benefits"), ("about_brand", "About the brand"),
        ]:
            if brand_row.get(key):
                brand_lines.append(f"{label}: {brand_row[key]}")

    # ── Project context ───────────────────────────────────────────────────────
    project_context = ""
    if body.project_id:
        proj = await db.fetchrow(
            "SELECT name, page_url, description FROM projects WHERE id = $1 AND workspace_id = $2",
            body.project_id, ws_id
        )
        if proj:
            project_context = f"\nPage context:\n- Project: {proj['name']}\n- URL: {proj['page_url']}"
            if proj["description"]:
                project_context += f"\n- About this page: {proj['description']}"

    brand_section = "\nBrand context:\n" + "\n".join(brand_lines) + "\n" if brand_lines else ""

    prompt = f"""You are a popup designer. Generate a complete popup for a website based on the goal below.
{brand_section}{project_context}

Goal: {body.goal}

Return ONLY a valid JSON object with this exact shape — no markdown, no explanation:
{{
  "layout": "single",
  "bg_color": "#hex",
  "blocks": [
    {{"type": "text", "role": "headline", "text": "..."}},
    {{"type": "text", "role": "body", "text": "..."}},
    {{"type": "image"}},
    {{"type": "button", "btn_label": "..."}},
    {{"type": "no_thanks", "no_thanks_label": "..."}},
    {{"type": "countdown"}}
  ]
}}

Rules:
- layout must be "single" or "two-column"
- If two-column: replace "blocks" with "left_blocks" and "right_blocks" arrays using the same block shapes
- bg_color must be a valid hex colour that matches the goal's emotion/urgency
- Include only the blocks that make sense for this goal — do not include all of them every time
- For two-column: put image in one side, text+button in the other
- "image" blocks have no other fields — leave them empty for the user to fill
- "countdown" blocks have no other fields
- text roles: "headline" (main hook), "body" (supporting detail), "badge" (short label e.g. "LIMITED TIME")
- btn_label must be action-oriented and specific to the goal
- no_thanks_label must be a polite decline relevant to the offer
- Keep text concise and conversion-focused
- Return ONLY the JSON object"""

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=AI_MODEL_FAST,
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    tokens_used = message.usage.input_tokens + message.usage.output_tokens

    # Strip markdown fences if present
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1].lstrip("json").strip() if len(parts) >= 2 else raw

    try:
        data = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=502, detail="AI returned unexpected format. Please try again.")

    # ── Strict validation ─────────────────────────────────────────────────────
    layout = data.get("layout", "single")
    if layout not in ("single", "two-column"):
        layout = "single"
    bg_color = data.get("bg_color", "#1A56DB")
    if not isinstance(bg_color, str) or not bg_color.startswith("#"):
        bg_color = "#1A56DB"

    # ── Style defaults by role ────────────────────────────────────────────────
    def is_dark(hex_color: str) -> bool:
        try:
            h = hex_color.lstrip("#")
            r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
            return (0.299 * r + 0.587 * g + 0.114 * b) < 128
        except Exception:
            return True

    dark_bg = is_dark(bg_color)
    text_color = "#ffffff" if dark_bg else "#0F172A"
    text_color_muted = "rgba(255,255,255,0.85)" if dark_bg else "#475569"
    btn_color = "#ffffff" if dark_bg else bg_color
    btn_text_color = bg_color if dark_bg else "#ffffff"

    ALLOWED_TYPES = {"text", "image", "button", "no_thanks", "countdown"}

    def build_block(b: dict) -> Optional[dict]:
        btype = b.get("type")
        if btype not in ALLOWED_TYPES:
            return None
        block_id = str(uuid.uuid4())[:8]
        if btype == "text":
            role = b.get("role", "body")
            text_val = b.get("text", "")
            if not isinstance(text_val, str):
                text_val = str(text_val)
            if role == "headline":
                return {"id": block_id, "type": "text", "text": text_val,
                        "font_size": 24, "font_weight": "800", "text_align": "center", "text_color": text_color}
            elif role == "badge":
                return {"id": block_id, "type": "text", "text": text_val,
                        "font_size": 11, "font_weight": "700", "text_align": "center", "text_color": text_color_muted}
            else:  # body
                return {"id": block_id, "type": "text", "text": text_val,
                        "font_size": 14, "font_weight": "400", "text_align": "center", "text_color": text_color_muted}
        elif btype == "image":
            return {"id": block_id, "type": "image", "image_url": "", "image_height": 200, "image_fit": "cover", "image_link": ""}
        elif btype == "button":
            label = b.get("btn_label", "Click Here")
            if not isinstance(label, str):
                label = "Click Here"
            return {"id": block_id, "type": "button", "btn_label": label,
                    "btn_url": "", "btn_action": "link",
                    "btn_color": btn_color, "btn_text_color": btn_text_color,
                    "btn_radius": 10, "btn_bold": True}
        elif btype == "no_thanks":
            label = b.get("no_thanks_label", "No thanks")
            if not isinstance(label, str):
                label = "No thanks"
            return {"id": block_id, "type": "no_thanks", "no_thanks_label": label,
                    "no_thanks_color": text_color_muted, "no_thanks_dont_show": False}
        elif btype == "countdown":
            return {"id": block_id, "type": "countdown", "countdown_id": "",
                    "countdown_expiry_action": "hide", "countdown_expiry_value": ""}
        return None

    def build_blocks(raw_list: list) -> list:
        if not isinstance(raw_list, list):
            return []
        result = []
        for b in raw_list:
            if isinstance(b, dict):
                built = build_block(b)
                if built:
                    result.append(built)
        return result

    # Build final blocks
    if layout == "two-column":
        left = build_blocks(data.get("left_blocks", []))
        right = build_blocks(data.get("right_blocks", []))
        if not left and not right:
            # Fallback: treat blocks as single
            layout = "single"
            final_blocks = build_blocks(data.get("blocks", []))
        else:
            col_id = str(uuid.uuid4())[:8]
            final_blocks = [{"id": col_id, "type": "columns",
                             "col_left": left, "col_right": right}]
    else:
        final_blocks = build_blocks(data.get("blocks", []))

    if not final_blocks:
        raise HTTPException(status_code=502, detail="AI returned no valid blocks. Please try again.")

    # ── Deduct coins ──────────────────────────────────────────────────────────
    new_balance = await deduct_coins(
        workspace_id=ws_id,
        action_type="popup_content",
        db=db,
        claude_tokens_used=tokens_used,
        metadata={"goal": body.goal[:200]},
    )

    return {
        "layout": layout,
        "bg_color": bg_color,
        "blocks": final_blocks,
        "balance": new_balance,
    }


# ── Image Generator ───────────────────────────────────────────────────────────

STYLE_KEYWORDS: dict[str, str] = {
    "photorealistic": "photorealistic, professional photograph, DSLR quality, sharp focus, realistic lighting, high resolution, 8k",
    "illustration":   "digital illustration, clean lines, professional graphic design, flat style",
    "anime":          "anime style, manga illustration, cel shaded",
    "abstract":       "abstract art, artistic, painterly, expressive",
}

class ImageGenerateRequest(BaseModel):
    workspace_id: Optional[str] = None
    prompt: str
    style: str = "photorealistic"
    width: int = 1024
    height: int = 576
    project_id: Optional[str] = None

@router.post("/image/generate")
async def generate_image(
    body: ImageGenerateRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Generate an image via fal.ai Flux Dev, upload to R2, save to assets library.
    Costs 10 AI coins.
    """
    workspace = await get_accessible_workspace(db, current_user["id"], body.workspace_id)
    ws_id = str(workspace["id"])

    await check_coins(ws_id, "generate_image", db)

    # ── Build enhanced prompt ─────────────────────────────────────────────────
    style_suffix = STYLE_KEYWORDS.get(body.style, STYLE_KEYWORDS["photorealistic"])
    final_prompt = f"{body.prompt.strip()}, {style_suffix}"

    # Clamp dimensions to fal.ai supported range (multiples of 8, 256–2048)
    def clamp(v: int) -> int:
        v = max(256, min(2048, v))
        return v - (v % 8)

    width = clamp(body.width)
    height = clamp(body.height)

    # ── Call fal.ai Flux Dev ──────────────────────────────────────────────────
    import os
    os.environ["FAL_KEY"] = settings.FAL_API_KEY or ""

    try:
        result = await fal_client.run_async(
            AI_IMAGE_MODEL,
            arguments={
                "prompt": final_prompt,
                "image_size": {"width": width, "height": height},
                "num_images": 1,
                "enable_safety_checker": True,
            },
        )
        image_url = result["images"][0]["url"]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Image generation failed: {str(e)}")

    # ── Download generated image and upload to R2 ─────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            img_resp = await client.get(image_url)
        img_data = img_resp.content
        content_type = img_resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()
        ext = "jpg" if "jpeg" in content_type else content_type.split("/")[-1]

        key = f"uploads/{uuid.uuid4().hex}.{ext}"
        s3 = get_r2_client()
        s3.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=key,
            Body=img_data,
            ContentType=content_type,
            CacheControl="public, max-age=31536000",
        )
        public_url = f"{settings.R2_PUBLIC_URL}/{key}"
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to store generated image: {str(e)}")

    # ── Save to asset library ─────────────────────────────────────────────────
    filename = f"ai-generated-{uuid.uuid4().hex[:8]}.{ext}"
    await db.execute(
        """INSERT INTO assets (workspace_id, user_id, url, filename, size, mime_type)
           VALUES ($1, $2, $3, $4, $5, $6)""",
        ws_id, current_user["id"], public_url,
        filename, len(img_data), content_type,
    )

    # ── Deduct coins ──────────────────────────────────────────────────────────
    new_balance = await deduct_coins(
        workspace_id=ws_id,
        action_type="generate_image",
        db=db,
        fal_image_generated=True,
        metadata={"prompt": body.prompt[:200], "style": body.style, "width": width, "height": height},
    )

    return {
        "url": public_url,
        "width": width,
        "height": height,
        "balance": new_balance,
    }


# ── Rule Suggestion ───────────────────────────────────────────────────────────

class RuleSuggestRequest(BaseModel):
    workspace_id: Optional[str] = None
    project_id: str


@router.post("/rules/suggest")
async def suggest_rules(
    body: RuleSuggestRequest,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Use Claude Sonnet to analyse the project's page scan + description + brand context
    and return 3–5 ready-to-use rule suggestions.
    Costs 15 AI coins.
    """
    import uuid as uuid_mod

    workspace = await get_accessible_workspace(db, current_user["id"], body.workspace_id)
    ws_id = str(workspace["id"])

    await check_coins(ws_id, "rule_creation_ai", db)

    # ── Fetch project ─────────────────────────────────────────────────────────
    project = await db.fetchrow(
        "SELECT * FROM projects WHERE id = $1 AND workspace_id = $2",
        uuid_mod.UUID(body.project_id), workspace["id"]
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    page_scan = project.get("page_scan") or {}
    if isinstance(page_scan, str):
        try:
            page_scan = json.loads(page_scan)
        except Exception:
            page_scan = {}

    # ── Fetch brand knowledge ─────────────────────────────────────────────────
    brand_row = await db.fetchrow(
        "SELECT * FROM workspace_ai_settings WHERE workspace_id = $1", workspace["id"]
    )

    # ── Build context strings ─────────────────────────────────────────────────
    brand_lines = []
    if brand_row:
        if brand_row.get("brand_name"):
            brand_lines.append(f"Brand: {brand_row['brand_name']}")
        if brand_row.get("industry"):
            brand_lines.append(f"Industry: {brand_row['industry']}")
        if brand_row.get("tone_of_voice"):
            brand_lines.append(f"Tone: {brand_row['tone_of_voice']}")
        if brand_row.get("target_audience"):
            brand_lines.append(f"Audience: {brand_row['target_audience']}")
        if brand_row.get("key_benefits"):
            brand_lines.append(f"Key benefits: {brand_row['key_benefits']}")
        if brand_row.get("about_brand"):
            brand_lines.append(f"About: {brand_row['about_brand'][:200]}")

    description_line = f"Page description: {project['description']}" if project.get("description") else ""

    # Build page element summary
    elem_lines = []
    for h in (page_scan.get("headings") or [])[:4]:
        elem_lines.append(f"  heading [{h.get('selector')}]: \"{h.get('text','')}\"")
    for c in (page_scan.get("ctas") or [])[:4]:
        elem_lines.append(f"  cta [{c.get('selector')}]: \"{c.get('text','')}\"")
    for img in (page_scan.get("images") or [])[:3]:
        elem_lines.append(f"  image [{img.get('selector')}]: alt=\"{img.get('alt','')}\"")
    for s in (page_scan.get("sections") or [])[:4]:
        elem_lines.append(f"  section [{s.get('selector')}]: \"{s.get('preview','')}\"")
    for cb in (page_scan.get("custom_blocks") or []):
        elem_lines.append(f"  custom [{cb.get('selector')}]: \"{cb.get('label','')}\"")

    elements_context = "\n".join(elem_lines) if elem_lines else "  No scan data — use generic selectors like h1, .btn-primary, .hero"

    prompt = f"""You are an expert at website personalisation. Analyse the following page and suggest 3–5 ready-to-use personalisation rules.

## Page context
{description_line}
{chr(10).join(brand_lines)}

## Detected page elements
{elements_context}

## Available signals
- visit_count: number — operators: is greater than, is less than, equals
- time_on_page: seconds — operators: is greater than, is less than
- scroll_depth: 0-100 % — operators: is greater than, is less than
- exit_intent: operators: is detected (no value needed)
- visitor_type: select: new / returning — operator: is
- utm_source: text — operators: is, contains
- utm_medium: text — operators: is, contains
- utm_campaign: text — operators: is, contains
- referrer_url: text — operators: contains, is
- query_param: text — operators: contains, is
- device_type: select: mobile / tablet / desktop — operator: is
- geo_country: country name e.g. "United States" — operator: is

## Available actions
- swap_text: CSS selector + replacement text (leave as plain string, not JSON)
- swap_image: CSS selector + image URL (leave value as empty string if no image)
- hide_section: CSS selector + empty value
- show_element: CSS selector + empty value
- swap_url: CSS selector + new URL
- show_popup: no selector needed, leave value as empty string
- insert_countdown: CSS selector + empty string

## Rules
1. Return ONLY a valid JSON array — no prose, no markdown, no explanation.
2. Use real selectors from the page elements above wherever possible.
3. If a selector is a guess (not from page scan), use common patterns like h1, .btn-primary, #hero.
4. For show_popup actions, always leave value as "".
5. Make rules practical and business-relevant.

## Required JSON format
Return exactly this structure:
[
  {{
    "name": "...",
    "description": "one sentence — why this rule helps",
    "conditions": [{{"signal": "...", "operator": "...", "value": "..."}}],
    "condition_operator": "AND",
    "actions": [{{"type": "...", "target_block": "...", "value": "..."}}]
  }}
]"""

    # ── Call Claude Sonnet ────────────────────────────────────────────────────
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=AI_MODEL_SMART,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()
    tokens_used = message.usage.input_tokens + message.usage.output_tokens

    # ── Parse + validate ──────────────────────────────────────────────────────
    try:
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        suggestions = json.loads(raw)
        if not isinstance(suggestions, list):
            raise ValueError("Expected list")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"AI returned invalid JSON: {str(e)}")

    VALID_SIGNALS = {
        "visit_count", "time_on_page", "scroll_depth", "exit_intent",
        "visitor_type", "utm_source", "utm_medium", "utm_campaign",
        "referrer_url", "query_param", "device_type", "operating_system",
        "browser", "geo_country", "day_time",
    }
    VALID_ACTIONS = {
        "swap_text", "swap_image", "hide_section", "show_element",
        "swap_url", "show_popup", "insert_countdown",
    }
    VALID_OPERATORS = {
        "is", "is not", "is greater than", "is less than", "equals",
        "contains", "is between", "is detected",
    }

    clean = []
    for rule in suggestions[:5]:
        if not isinstance(rule, dict):
            continue
        name = str(rule.get("name") or "").strip()[:100] or "AI Rule"
        description = str(rule.get("description") or "").strip()[:200]
        cond_op = "AND" if rule.get("condition_operator", "AND") == "AND" else "OR"

        conditions = []
        for c in (rule.get("conditions") or []):
            if not isinstance(c, dict):
                continue
            sig = c.get("signal", "")
            op = c.get("operator", "")
            val = str(c.get("value") or "")
            if sig not in VALID_SIGNALS or op not in VALID_OPERATORS:
                continue
            conditions.append({"signal": sig, "operator": op, "value": val})

        actions = []
        for a in (rule.get("actions") or []):
            if not isinstance(a, dict):
                continue
            atype = a.get("type", "")
            if atype not in VALID_ACTIONS:
                continue
            actions.append({
                "type": atype,
                "target_block": str(a.get("target_block") or "")[:200],
                "value": str(a.get("value") or "")[:500],
            })

        if not conditions or not actions:
            continue

        clean.append({
            "name": name,
            "description": description,
            "conditions": conditions,
            "condition_operator": cond_op,
            "actions": actions,
        })

    if not clean:
        raise HTTPException(status_code=422, detail="AI could not generate valid rules for this page.")

    # ── Deduct coins ──────────────────────────────────────────────────────────
    new_balance = await deduct_coins(
        workspace_id=ws_id,
        action_type="rule_creation_ai",
        db=db,
        claude_tokens_used=tokens_used,
        metadata={"project_id": body.project_id, "rules_count": len(clean)},
    )

    return {"rules": clean, "balance": new_balance}
