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
    "countdown_type": "fixed",
    "digit_bg": "#1A56DB",
    "digit_color": "#ffffff",
    "label_color": "#64748b",
    "show_days": True,
    "show_hours": True,
    "show_minutes": True,
    "show_seconds": True,
    "show_labels": True,
    "digit_size": 32,
    "digit_radius": 6,
    "gap": 10,
}

DURATION_CONFIG = {
    **SAMPLE_CONFIG,
    "countdown_type": "duration",
    "duration_value": 24,
    "duration_unit": "hours",
}


async def create_countdown(client, headers, **overrides) -> dict:
    payload = {
        "name": "Test Countdown",
        "ends_at": "2030-12-31T23:59:59",
        "expiry_action": "hide",
        "expiry_value": "",
        "config": SAMPLE_CONFIG,
        **overrides,
    }
    res = await client.post("/api/countdowns", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


# ── Tests ──────────────────────────────────────────────────────────────────────

async def test_create_countdown_fixed(client):
    """Creating a fixed-date countdown returns it with correct fields."""
    headers = await auth_headers(client)
    cd = await create_countdown(client, headers)

    assert cd["name"] == "Test Countdown"
    assert cd["ends_at"] is not None
    assert cd["expiry_action"] == "hide"
    assert cd["config"]["countdown_type"] == "fixed"
    assert "id" in cd


async def test_create_countdown_duration(client):
    """Creating a duration countdown stores duration config correctly."""
    headers = await auth_headers(client)
    cd = await create_countdown(client, headers,
        name="Duration CD",
        ends_at=None,
        config=DURATION_CONFIG,
    )

    assert cd["name"] == "Duration CD"
    assert cd["ends_at"] is None
    assert cd["config"]["countdown_type"] == "duration"
    assert cd["config"]["duration_value"] == 24
    assert cd["config"]["duration_unit"] == "hours"


async def test_create_countdown_expiry_redirect(client):
    """Expiry action 'redirect' stores URL correctly."""
    headers = await auth_headers(client)
    cd = await create_countdown(client, headers,
        expiry_action="redirect",
        expiry_value="https://example.com/expired",
    )
    assert cd["expiry_action"] == "redirect"
    assert cd["expiry_value"] == "https://example.com/expired"


async def test_create_countdown_expiry_message(client):
    """Expiry action 'message' stores message text correctly."""
    headers = await auth_headers(client)
    cd = await create_countdown(client, headers,
        expiry_action="message",
        expiry_value="Offer has ended",
    )
    assert cd["expiry_action"] == "message"
    assert cd["expiry_value"] == "Offer has ended"


async def test_list_countdowns(client):
    """List endpoint returns all countdowns for the workspace."""
    headers = await auth_headers(client)
    await create_countdown(client, headers, name="CD Alpha")
    await create_countdown(client, headers, name="CD Beta")

    res = await client.get("/api/countdowns", headers=headers)
    assert res.status_code == 200
    names = [c["name"] for c in res.json()]
    assert "CD Alpha" in names
    assert "CD Beta" in names


async def test_edit_countdown(client):
    """PUT updates countdown name, config, and expiry action."""
    headers = await auth_headers(client)
    cd = await create_countdown(client, headers)

    res = await client.put(f"/api/countdowns/{cd['id']}", json={
        "name": "Updated CD",
        "expiry_action": "message",
        "expiry_value": "Time is up!",
        "config": {**SAMPLE_CONFIG, "digit_bg": "#FF0000"},
    }, headers=headers)
    assert res.status_code == 200
    updated = res.json()
    assert updated["name"] == "Updated CD"
    assert updated["expiry_action"] == "message"
    assert updated["expiry_value"] == "Time is up!"
    assert updated["config"]["digit_bg"] == "#FF0000"


async def test_delete_countdown(client):
    """Deleting a countdown removes it from the list."""
    headers = await auth_headers(client)
    cd = await create_countdown(client, headers, name="To Delete")

    res = await client.delete(f"/api/countdowns/{cd['id']}", headers=headers)
    assert res.status_code == 200

    res = await client.get("/api/countdowns", headers=headers)
    ids = [c["id"] for c in res.json()]
    assert cd["id"] not in ids


async def test_cannot_access_other_users_countdown(client):
    """A countdown is not accessible by a different user."""
    headers_a = await auth_headers(client)
    headers_b = await auth_headers(client)

    cd = await create_countdown(client, headers_a)

    res = await client.get(f"/api/countdowns/{cd['id']}", headers=headers_b)
    assert res.status_code == 404
