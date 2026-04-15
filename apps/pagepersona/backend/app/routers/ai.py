"""
AI Router — PagePersona

Endpoints:
  GET  /api/ai/coins          — coin balance + plan info for current workspace
  GET  /api/ai/coins/history  — recent coin transaction log
  POST /api/ai/copy/write     — generate 3 copy variants for a swap_text action
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
import asyncpg
import anthropic
from app.database import get_db
from app.core.security import get_current_user
from app.core.access import get_accessible_workspace
from app.core.config import settings, AI_MODEL_FAST
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

    prompt = f"""You are an expert website conversion copywriter helping personalise a webpage for a specific visitor segment.

Context:
{context_block}

User's goal: {body.goal}

Write exactly 3 short copy variants for this element. Each variant must be no more than {max_words} words.
Be direct, specific, and conversion-focused. Match the tone to the element type.

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
