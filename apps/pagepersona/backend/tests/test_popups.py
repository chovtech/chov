from unittest.mock import patch, AsyncMock, MagicMock
from tests.test_auth import unique_email


# ── Helpers ────────────────────────────────────────────────────────────────────

async def auth_headers(client) -> dict:
    email = unique_email()
    with patch("app.routers.auth.send_verification_email", new_callable=MagicMock), \
         patch("app.routers.auth.subscribe_contact", new_callable=AsyncMock):
        res = await client.post("/api/auth/signup", json={
            "email": email, "password": "TestPass123!", "name": "Test User"
        })
    data = res.json()
    return {"Authorization": f"Bearer {data['access_token']}"}


SAMPLE_CONFIG = {
    "position": "center",
    "bg_color": "#1A56DB",
    "width": 420,
    "border_radius": 12,
    "padding": 24,
    "frequency": "once",
    "delay": 0,
    "overlay": True,
    "close_button": True,
    "blocks": [
        {"type": "text", "text": "Hello World", "font_size": 16, "text_color": "#ffffff"},
        {"type": "button", "btn_label": "Click Me", "btn_url": "https://example.com"},
    ],
}


async def create_popup(client, headers, name="Test Popup", config=None) -> dict:
    res = await client.post("/api/popups", json={
        "name": name,
        "config": config or SAMPLE_CONFIG,
    }, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


# ── Tests ──────────────────────────────────────────────────────────────────────

async def test_create_popup(client):
    """Creating a popup returns it with correct name and config."""
    headers = await auth_headers(client)
    popup = await create_popup(client, headers)

    assert popup["name"] == "Test Popup"
    assert popup["config"]["position"] == "center"
    assert popup["config"]["bg_color"] == "#1A56DB"
    assert len(popup["config"]["blocks"]) == 2
    assert "id" in popup


async def test_list_popups(client):
    """List endpoint returns all popups for the workspace."""
    headers = await auth_headers(client)
    await create_popup(client, headers, name="Popup Alpha")
    await create_popup(client, headers, name="Popup Beta")

    res = await client.get("/api/popups", headers=headers)
    assert res.status_code == 200
    names = [p["name"] for p in res.json()]
    assert "Popup Alpha" in names
    assert "Popup Beta" in names


async def test_get_popup_by_id(client):
    """GET /api/popups/{id} returns the correct popup."""
    headers = await auth_headers(client)
    popup = await create_popup(client, headers, name="Single Fetch Test")

    res = await client.get(f"/api/popups/{popup['id']}", headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Single Fetch Test"


async def test_edit_popup_name(client):
    """PUT updates the popup name."""
    headers = await auth_headers(client)
    popup = await create_popup(client, headers)

    res = await client.put(f"/api/popups/{popup['id']}", json={"name": "Renamed Popup"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Renamed Popup"


async def test_edit_popup_config(client):
    """PUT updates the popup config blocks."""
    headers = await auth_headers(client)
    popup = await create_popup(client, headers)

    new_config = {**SAMPLE_CONFIG, "bg_color": "#FF0000", "blocks": [
        {"type": "text", "text": "Updated text", "font_size": 18, "text_color": "#ffffff"},
    ]}
    res = await client.put(f"/api/popups/{popup['id']}", json={"config": new_config}, headers=headers)
    assert res.status_code == 200
    updated = res.json()
    assert updated["config"]["bg_color"] == "#FF0000"
    assert updated["config"]["blocks"][0]["text"] == "Updated text"


async def test_delete_popup(client):
    """Deleting a popup removes it from the list."""
    headers = await auth_headers(client)
    popup = await create_popup(client, headers, name="To Delete")

    res = await client.delete(f"/api/popups/{popup['id']}", headers=headers)
    assert res.status_code == 200

    res = await client.get("/api/popups", headers=headers)
    ids = [p["id"] for p in res.json()]
    assert popup["id"] not in ids


async def test_cannot_access_other_users_popup(client):
    """A popup is not accessible by a different user."""
    headers_a = await auth_headers(client)
    headers_b = await auth_headers(client)

    popup = await create_popup(client, headers_a)

    res = await client.get(f"/api/popups/{popup['id']}", headers=headers_b)
    assert res.status_code == 404


async def test_popup_with_countdown_block(client):
    """A popup config can contain a countdown block."""
    headers = await auth_headers(client)
    config = {**SAMPLE_CONFIG, "blocks": [
        {"type": "countdown", "countdown_id": "fake-cd-id",
         "countdown_ends_at": "2030-01-01T00:00:00",
         "countdown_expiry_action": "hide", "countdown_expiry_value": "",
         "countdown_config": {"digit_bg": "#1A56DB", "digit_color": "#fff"}},
    ]}
    popup = await create_popup(client, headers, config=config)
    assert popup["config"]["blocks"][0]["type"] == "countdown"
    assert popup["config"]["blocks"][0]["countdown_id"] == "fake-cd-id"
