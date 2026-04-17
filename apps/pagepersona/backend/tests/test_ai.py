import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import HTTPException
from tests.test_auth import unique_email
from tests.test_projects import auth_headers, create_project


# ── Mock helpers ───────────────────────────────────────────────────────────────

def _mock_anthropic(text: str):
    """Return a mock Anthropic client that always responds with `text`."""
    block = MagicMock()
    block.text = text
    usage = MagicMock()
    usage.input_tokens = 100
    usage.output_tokens = 50
    message = MagicMock()
    message.content = [block]
    message.usage = usage
    client = MagicMock()
    client.messages.create.return_value = message
    return client


COPY_VARIANTS_JSON = (
    '[{"text": "Buy now and save 20%", "rationale": "Urgency drives clicks"},'
    ' {"text": "Claim your discount", "rationale": "Action-oriented"},'
    ' {"text": "Save 20% today only", "rationale": "Time-limited offer"}]'
)

POPUP_JSON = (
    '{"layout": "single", "bg_color": "#1A56DB", "blocks": ['
    '{"type": "text", "role": "headline", "text": "Special Offer"},'
    ' {"type": "button", "btn_label": "Grab the Deal"},'
    ' {"type": "no_thanks", "no_thanks_label": "No thanks"}]}'
)

RULES_JSON = (
    '[{"name": "Engage returning visitors", "description": "Show a special message to returning visitors",'
    ' "conditions": [{"signal": "visitor_type", "operator": "is", "value": "returning"}],'
    ' "condition_operator": "AND",'
    ' "actions": [{"type": "swap_text", "target_block": "h1", "value": "Welcome back!"}]}]'
)

BRAND_EXTRACT_JSON = (
    '{"brand_name": "TestCo", "industry": "SaaS", "tone_of_voice": "Professional",'
    ' "target_audience": "B2B founders", "key_benefits": "Saves time", "about_brand": "TestCo helps founders."}'
)


# ── Coin Balance ───────────────────────────────────────────────────────────────

async def test_coins_balance_returns_shape(client):
    """GET /api/ai/coins returns expected structure."""
    headers, workspace_id = await auth_headers(client)
    res = await client.get(f"/api/ai/coins?workspace_id={workspace_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "balance" in data
    assert "plan" in data
    assert "is_unlimited" in data
    assert "coin_costs" in data
    assert "allocations" in data


async def test_coins_balance_initial_trial(client):
    """New trial workspace starts with 20 coins and is not unlimited."""
    headers, workspace_id = await auth_headers(client)
    res = await client.get(f"/api/ai/coins?workspace_id={workspace_id}", headers=headers)
    data = res.json()
    assert data["plan"] == "trial"
    assert data["is_unlimited"] is False
    assert data["balance"] == 20


async def test_coins_history_initially_empty(client):
    """Coin transaction history is empty for a fresh workspace."""
    headers, workspace_id = await auth_headers(client)
    res = await client.get(f"/api/ai/coins/history?workspace_id={workspace_id}", headers=headers)
    assert res.status_code == 200
    assert res.json() == []


async def test_coins_unauthenticated_returns_401(client):
    """All AI coin endpoints require authentication."""
    res = await client.get("/api/ai/coins")
    assert res.status_code == 401


# ── Brand Knowledge ────────────────────────────────────────────────────────────

async def test_get_brand_empty_for_new_workspace(client):
    """Brand knowledge returns {} for a workspace with no settings saved."""
    headers, workspace_id = await auth_headers(client)
    res = await client.get(f"/api/ai/brand?workspace_id={workspace_id}", headers=headers)
    assert res.status_code == 200
    assert res.json() == {}


async def test_save_and_retrieve_brand(client):
    """PUT /api/ai/brand persists all fields; GET retrieves them."""
    headers, workspace_id = await auth_headers(client)
    payload = {
        "workspace_id": workspace_id,
        "brand_name": "Acme Corp",
        "industry": "SaaS",
        "tone_of_voice": "Professional but friendly",
        "target_audience": "B2B founders aged 30-50",
        "key_benefits": "Saves time, increases revenue",
        "about_brand": "Acme makes founders rich.",
        "website_url": "https://acme.com",
    }
    res = await client.put("/api/ai/brand", json=payload, headers=headers)
    assert res.status_code == 200

    res = await client.get(f"/api/ai/brand?workspace_id={workspace_id}", headers=headers)
    data = res.json()
    assert data["brand_name"] == "Acme Corp"
    assert data["industry"] == "SaaS"
    assert data["tone_of_voice"] == "Professional but friendly"


async def test_save_brand_overwrites_on_second_put(client):
    """Second PUT to /api/ai/brand replaces the first — no duplicate rows."""
    headers, workspace_id = await auth_headers(client)
    await client.put("/api/ai/brand", json={"workspace_id": workspace_id, "brand_name": "Old Name"}, headers=headers)
    await client.put("/api/ai/brand", json={"workspace_id": workspace_id, "brand_name": "New Name"}, headers=headers)

    res = await client.get(f"/api/ai/brand?workspace_id={workspace_id}", headers=headers)
    assert res.json()["brand_name"] == "New Name"


async def test_brand_extract_returns_fields(client):
    """POST /api/ai/brand/extract returns populated brand knowledge fields."""
    headers, workspace_id = await auth_headers(client)

    mock_resp = MagicMock()
    mock_resp.text = "<html><title>Acme Corp</title><h1>The best SaaS for founders</h1></html>"

    with patch("app.routers.ai.httpx.AsyncClient") as mock_http, \
         patch("app.routers.ai.anthropic.Anthropic", return_value=_mock_anthropic(BRAND_EXTRACT_JSON)):
        mock_http.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_resp)
        res = await client.post("/api/ai/brand/extract", json={
            "workspace_id": workspace_id,
            "url": "https://acme.com",
        }, headers=headers)

    assert res.status_code == 200
    data = res.json()
    assert "brand_name" in data
    assert "website_url" in data
    assert data["website_url"] == "https://acme.com"
    assert data["brand_name"] == "TestCo"


async def test_brand_extract_invalid_url_returns_422(client):
    """POST /api/ai/brand/extract returns 422 when the URL cannot be fetched."""
    headers, workspace_id = await auth_headers(client)

    with patch("app.routers.ai.httpx.AsyncClient") as mock_http:
        mock_http.return_value.__aenter__.return_value.get = AsyncMock(
            side_effect=Exception("Connection refused")
        )
        res = await client.post("/api/ai/brand/extract", json={
            "workspace_id": workspace_id,
            "url": "https://this-does-not-exist-12345.com",
        }, headers=headers)

    assert res.status_code == 422


# ── Project Description Extract ────────────────────────────────────────────────

async def test_project_describe_returns_description(client):
    """POST /api/ai/project/extract-description returns a non-empty description string."""
    headers, workspace_id = await auth_headers(client)

    mock_resp = MagicMock()
    mock_resp.text = "<html><title>SaaS Product</title><h1>Increase conversions</h1></html>"

    with patch("app.routers.ai.httpx.AsyncClient") as mock_http, \
         patch("app.routers.ai.anthropic.Anthropic",
               return_value=_mock_anthropic("This SaaS product helps B2B founders boost conversions.")):
        mock_http.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_resp)
        res = await client.post("/api/ai/project/extract-description", json={
            "workspace_id": workspace_id,
            "url": "https://example.com",
        }, headers=headers)

    assert res.status_code == 200
    data = res.json()
    assert "description" in data
    assert len(data["description"]) > 0
    assert "balance" in data


async def test_project_describe_deducts_3_coins(client):
    """Project description extraction costs 3 coins."""
    headers, workspace_id = await auth_headers(client)
    before = (await client.get(f"/api/ai/coins?workspace_id={workspace_id}", headers=headers)).json()["balance"]

    mock_resp = MagicMock()
    mock_resp.text = "<html><title>Test</title></html>"

    with patch("app.routers.ai.httpx.AsyncClient") as mock_http, \
         patch("app.routers.ai.anthropic.Anthropic",
               return_value=_mock_anthropic("A product that helps users.")):
        mock_http.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_resp)
        await client.post("/api/ai/project/extract-description", json={
            "workspace_id": workspace_id,
            "url": "https://example.com",
        }, headers=headers)

    after = (await client.get(f"/api/ai/coins?workspace_id={workspace_id}", headers=headers)).json()["balance"]
    assert after == before - 3


# ── Copy Writer ────────────────────────────────────────────────────────────────

async def test_write_copy_returns_3_variants(client):
    """POST /api/ai/copy/write returns exactly 3 variants with text and rationale."""
    headers, workspace_id = await auth_headers(client)

    with patch("app.routers.ai.anthropic.Anthropic", return_value=_mock_anthropic(COPY_VARIANTS_JSON)):
        res = await client.post("/api/ai/copy/write", json={
            "workspace_id": workspace_id,
            "goal": "Increase signups from Google Ads visitors",
            "context": {"page_url": "https://example.com", "element_selector": "h1"},
        }, headers=headers)

    assert res.status_code == 200
    data = res.json()
    assert len(data["variants"]) == 3
    assert data["variants"][0]["text"]
    assert data["variants"][0]["rationale"]
    assert data["coins_used"] == 5
    assert "balance" in data


async def test_write_copy_deducts_5_coins(client):
    """Coin balance decreases by 5 after a successful copy generation."""
    headers, workspace_id = await auth_headers(client)
    before = (await client.get(f"/api/ai/coins?workspace_id={workspace_id}", headers=headers)).json()["balance"]

    with patch("app.routers.ai.anthropic.Anthropic", return_value=_mock_anthropic(COPY_VARIANTS_JSON)):
        await client.post("/api/ai/copy/write", json={
            "workspace_id": workspace_id,
            "goal": "test goal",
        }, headers=headers)

    after = (await client.get(f"/api/ai/coins?workspace_id={workspace_id}", headers=headers)).json()["balance"]
    assert after == before - 5


async def test_write_copy_logs_transaction(client):
    """A write_copy transaction record appears in coin history after generation."""
    headers, workspace_id = await auth_headers(client)

    with patch("app.routers.ai.anthropic.Anthropic", return_value=_mock_anthropic(COPY_VARIANTS_JSON)):
        await client.post("/api/ai/copy/write", json={
            "workspace_id": workspace_id,
            "goal": "test",
        }, headers=headers)

    res = await client.get(f"/api/ai/coins/history?workspace_id={workspace_id}", headers=headers)
    history = res.json()
    assert len(history) >= 1
    assert history[0]["action_type"] == "write_copy"
    assert history[0]["coins_deducted"] == 5


async def test_write_copy_insufficient_coins_returns_402(client):
    """POST /api/ai/copy/write returns 402 with insufficient_coins error when balance is too low."""
    headers, workspace_id = await auth_headers(client)

    with patch("app.routers.ai.check_coins", new_callable=AsyncMock,
               side_effect=HTTPException(
                   status_code=402,
                   detail={"error": "insufficient_coins", "balance": 0, "required": 5, "action": "write_copy"}
               )):
        res = await client.post("/api/ai/copy/write", json={
            "workspace_id": workspace_id,
            "goal": "test",
        }, headers=headers)

    assert res.status_code == 402
    detail = res.json()["detail"]
    assert detail["error"] == "insufficient_coins"
    assert detail["required"] == 5


async def test_write_copy_bad_ai_response_returns_502(client):
    """POST /api/ai/copy/write returns 502 when AI returns non-JSON."""
    headers, workspace_id = await auth_headers(client)

    with patch("app.routers.ai.anthropic.Anthropic", return_value=_mock_anthropic("not valid json at all")):
        res = await client.post("/api/ai/copy/write", json={
            "workspace_id": workspace_id,
            "goal": "test",
        }, headers=headers)

    assert res.status_code == 502


async def test_write_copy_with_project_context(client):
    """CopyWriter fetches project description when project_id is supplied."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id,
                                   description="A SaaS product for converting leads.")

    with patch("app.routers.ai.anthropic.Anthropic", return_value=_mock_anthropic(COPY_VARIANTS_JSON)):
        res = await client.post("/api/ai/copy/write", json={
            "workspace_id": workspace_id,
            "goal": "Increase signups",
            "context": {"project_id": project["id"]},
        }, headers=headers)

    assert res.status_code == 200
    assert len(res.json()["variants"]) == 3


# ── Popup Generator ────────────────────────────────────────────────────────────

async def test_popup_generate_returns_blocks(client):
    """POST /api/ai/popup/generate returns layout, bg_color, and non-empty blocks."""
    headers, workspace_id = await auth_headers(client)

    with patch("app.routers.ai.anthropic.Anthropic", return_value=_mock_anthropic(POPUP_JSON)):
        res = await client.post("/api/ai/popup/generate", json={
            "workspace_id": workspace_id,
            "goal": "Capture email leads with a 20% discount offer",
        }, headers=headers)

    assert res.status_code == 200
    data = res.json()
    assert data["layout"] in ("single", "two-column")
    assert data["bg_color"].startswith("#")
    assert isinstance(data["blocks"], list)
    assert len(data["blocks"]) > 0
    assert "balance" in data


async def test_popup_generate_deducts_5_coins(client):
    """Coin balance decreases by 5 after popup generation."""
    headers, workspace_id = await auth_headers(client)
    before = (await client.get(f"/api/ai/coins?workspace_id={workspace_id}", headers=headers)).json()["balance"]

    with patch("app.routers.ai.anthropic.Anthropic", return_value=_mock_anthropic(POPUP_JSON)):
        await client.post("/api/ai/popup/generate", json={
            "workspace_id": workspace_id,
            "goal": "test offer",
        }, headers=headers)

    after = (await client.get(f"/api/ai/coins?workspace_id={workspace_id}", headers=headers)).json()["balance"]
    assert after == before - 5


async def test_popup_generate_applies_style_defaults(client):
    """Backend applies font_size and font_weight defaults to text blocks by role."""
    headers, workspace_id = await auth_headers(client)

    with patch("app.routers.ai.anthropic.Anthropic", return_value=_mock_anthropic(POPUP_JSON)):
        res = await client.post("/api/ai/popup/generate", json={
            "workspace_id": workspace_id,
            "goal": "test",
        }, headers=headers)

    blocks = res.json()["blocks"]
    text_blocks = [b for b in blocks if b.get("type") == "text"]
    assert len(text_blocks) > 0
    # Headline block should have font_size 24 and font_weight 800
    headline = next((b for b in text_blocks if b.get("font_size") == 24), None)
    assert headline is not None
    assert headline["font_weight"] == "800"


async def test_popup_generate_bad_ai_response_returns_502(client):
    """Popup generator returns 502 when AI returns malformed JSON."""
    headers, workspace_id = await auth_headers(client)

    with patch("app.routers.ai.anthropic.Anthropic", return_value=_mock_anthropic("definitely not json")):
        res = await client.post("/api/ai/popup/generate", json={
            "workspace_id": workspace_id,
            "goal": "test",
        }, headers=headers)

    assert res.status_code == 502


# ── Rule Suggester ─────────────────────────────────────────────────────────────

async def test_rule_suggest_returns_rules(client):
    """POST /api/ai/rules/suggest returns a non-empty list of valid rule shapes."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)

    with patch("app.routers.ai.anthropic.Anthropic", return_value=_mock_anthropic(RULES_JSON)):
        res = await client.post("/api/ai/rules/suggest", json={
            "workspace_id": workspace_id,
            "project_id": project["id"],
        }, headers=headers)

    assert res.status_code == 200
    data = res.json()
    assert isinstance(data["rules"], list)
    assert len(data["rules"]) >= 1
    rule = data["rules"][0]
    assert "name" in rule
    assert "conditions" in rule
    assert "actions" in rule
    assert "condition_operator" in rule
    assert "balance" in data


async def test_rule_suggest_deducts_15_coins(client):
    """Rule suggestion costs 15 coins."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    before = (await client.get(f"/api/ai/coins?workspace_id={workspace_id}", headers=headers)).json()["balance"]

    with patch("app.routers.ai.anthropic.Anthropic", return_value=_mock_anthropic(RULES_JSON)):
        await client.post("/api/ai/rules/suggest", json={
            "workspace_id": workspace_id,
            "project_id": project["id"],
        }, headers=headers)

    after = (await client.get(f"/api/ai/coins?workspace_id={workspace_id}", headers=headers)).json()["balance"]
    assert after == before - 15


async def test_rule_suggest_unknown_project_returns_404(client):
    """Rule suggest returns 404 when the project_id does not belong to the workspace."""
    headers, workspace_id = await auth_headers(client)

    with patch("app.routers.ai.check_coins", new_callable=AsyncMock):
        res = await client.post("/api/ai/rules/suggest", json={
            "workspace_id": workspace_id,
            "project_id": "00000000-0000-0000-0000-000000000000",
        }, headers=headers)

    assert res.status_code == 404


async def test_rule_suggest_validates_signals_and_actions(client):
    """Rule suggester strips invalid signals and actions from AI output."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)

    # AI returns a rule with an invalid signal — backend should strip it
    bad_rules_json = (
        '[{"name": "Bad rule", "description": "test",'
        ' "conditions": [{"signal": "INVALID_SIGNAL", "operator": "is", "value": "x"}],'
        ' "condition_operator": "AND",'
        ' "actions": [{"type": "swap_text", "target_block": "h1", "value": "hi"}]},'
        ' {"name": "Good rule", "description": "valid",'
        ' "conditions": [{"signal": "visitor_type", "operator": "is", "value": "returning"}],'
        ' "condition_operator": "AND",'
        ' "actions": [{"type": "swap_text", "target_block": "h1", "value": "Welcome back!"}]}]'
    )

    with patch("app.routers.ai.anthropic.Anthropic", return_value=_mock_anthropic(bad_rules_json)):
        res = await client.post("/api/ai/rules/suggest", json={
            "workspace_id": workspace_id,
            "project_id": project["id"],
        }, headers=headers)

    assert res.status_code == 200
    rules = res.json()["rules"]
    # Only the valid rule should survive
    assert len(rules) == 1
    assert rules[0]["name"] == "Good rule"


# ── Image Generator ────────────────────────────────────────────────────────────

async def test_image_generate_returns_url_and_balance(client):
    """POST /api/ai/image/generate saves the image and returns url + dimensions + balance."""
    headers, workspace_id = await auth_headers(client)

    fal_result = {"images": [{"url": "https://fal.ai/fake-generated.jpg"}]}
    mock_s3 = MagicMock()
    mock_s3.put_object = MagicMock()
    mock_img_resp = MagicMock()
    mock_img_resp.content = b"fakeimagebytes"
    mock_img_resp.headers = {"content-type": "image/jpeg"}

    with patch("app.routers.ai.fal_client.run_async", new_callable=AsyncMock, return_value=fal_result), \
         patch("app.routers.ai.get_r2_client", return_value=mock_s3), \
         patch("app.routers.ai.httpx.AsyncClient") as mock_http:
        mock_http.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_img_resp)
        res = await client.post("/api/ai/image/generate", json={
            "workspace_id": workspace_id,
            "prompt": "A happy customer using a SaaS product",
            "style": "photorealistic",
            "width": 1024,
            "height": 576,
        }, headers=headers)

    assert res.status_code == 200
    data = res.json()
    assert "url" in data
    assert data["width"] == 1024
    assert data["height"] == 576
    assert "balance" in data


async def test_image_generate_deducts_10_coins(client):
    """Image generation costs 10 coins."""
    headers, workspace_id = await auth_headers(client)
    before = (await client.get(f"/api/ai/coins?workspace_id={workspace_id}", headers=headers)).json()["balance"]

    fal_result = {"images": [{"url": "https://fal.ai/fake-generated.jpg"}]}
    mock_s3 = MagicMock()
    mock_img_resp = MagicMock()
    mock_img_resp.content = b"fakeimagebytes"
    mock_img_resp.headers = {"content-type": "image/jpeg"}

    with patch("app.routers.ai.fal_client.run_async", new_callable=AsyncMock, return_value=fal_result), \
         patch("app.routers.ai.get_r2_client", return_value=mock_s3), \
         patch("app.routers.ai.httpx.AsyncClient") as mock_http:
        mock_http.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_img_resp)
        await client.post("/api/ai/image/generate", json={
            "workspace_id": workspace_id,
            "prompt": "test image",
            "style": "photorealistic",
        }, headers=headers)

    after = (await client.get(f"/api/ai/coins?workspace_id={workspace_id}", headers=headers)).json()["balance"]
    assert after == before - 10


async def test_image_generate_saved_to_asset_library(client):
    """Generated image appears in the workspace asset library."""
    headers, workspace_id = await auth_headers(client)

    fal_result = {"images": [{"url": "https://fal.ai/fake-generated.jpg"}]}
    mock_s3 = MagicMock()
    mock_img_resp = MagicMock()
    mock_img_resp.content = b"fakeimagebytes"
    mock_img_resp.headers = {"content-type": "image/jpeg"}

    with patch("app.routers.ai.fal_client.run_async", new_callable=AsyncMock, return_value=fal_result), \
         patch("app.routers.ai.get_r2_client", return_value=mock_s3), \
         patch("app.routers.ai.httpx.AsyncClient") as mock_http:
        mock_http.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_img_resp)
        gen_res = await client.post("/api/ai/image/generate", json={
            "workspace_id": workspace_id,
            "prompt": "hero image for landing page",
            "style": "illustration",
        }, headers=headers)

    generated_url = gen_res.json()["url"]

    assets_res = await client.get(f"/api/assets?workspace_id={workspace_id}", headers=headers)
    assert assets_res.status_code == 200
    urls = [a["url"] for a in assets_res.json()]
    assert generated_url in urls


async def test_image_generate_fal_failure_returns_502(client):
    """POST /api/ai/image/generate returns 502 when fal.ai call fails."""
    headers, workspace_id = await auth_headers(client)

    with patch("app.routers.ai.fal_client.run_async", new_callable=AsyncMock,
               side_effect=Exception("fal.ai timeout")), \
         patch("app.routers.ai.check_coins", new_callable=AsyncMock):
        res = await client.post("/api/ai/image/generate", json={
            "workspace_id": workspace_id,
            "prompt": "test",
            "style": "photorealistic",
        }, headers=headers)

    assert res.status_code == 502


async def test_image_generate_clamps_dimensions(client):
    """Dimensions outside fal.ai range are clamped to valid multiples of 8."""
    headers, workspace_id = await auth_headers(client)

    fal_result = {"images": [{"url": "https://fal.ai/fake.jpg"}]}
    mock_s3 = MagicMock()
    mock_img_resp = MagicMock()
    mock_img_resp.content = b"img"
    mock_img_resp.headers = {"content-type": "image/jpeg"}

    with patch("app.routers.ai.fal_client.run_async", new_callable=AsyncMock, return_value=fal_result), \
         patch("app.routers.ai.get_r2_client", return_value=mock_s3), \
         patch("app.routers.ai.httpx.AsyncClient") as mock_http:
        mock_http.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_img_resp)
        res = await client.post("/api/ai/image/generate", json={
            "workspace_id": workspace_id,
            "prompt": "test",
            "style": "photorealistic",
            "width": 9999,   # above 2048 max
            "height": 100,   # below 256 min
        }, headers=headers)

    assert res.status_code == 200
    data = res.json()
    assert data["width"] <= 2048
    assert data["height"] >= 256
    assert data["width"] % 8 == 0
    assert data["height"] % 8 == 0
