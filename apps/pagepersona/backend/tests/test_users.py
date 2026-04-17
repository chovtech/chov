import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import uuid
from tests.test_auth import signup, unique_email, TEST_PASSWORD, TEST_NAME


async def auth_headers(client) -> dict:
    """Sign up a fresh user and return auth headers."""
    email = unique_email()
    res = await signup(client, email)
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── Tests ──────────────────────────────────────────────────────────────────────

async def test_update_profile_name(client):
    headers = await auth_headers(client)
    with patch("app.routers.users.update_contact", new_callable=AsyncMock):
        res = await client.put("/api/users/profile", json={"name": "New Name"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "New Name"


async def test_update_profile_email_duplicate_rejected(client):
    """Cannot change email to one already taken by another user."""
    email_a = unique_email()
    email_b = unique_email()
    await signup(client, email_a)
    headers_b = (await signup(client, email_b)).json()
    token = headers_b["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    with patch("app.routers.users.update_contact", new_callable=AsyncMock):
        res = await client.put("/api/users/profile", json={"email": email_a}, headers=headers)
    assert res.status_code == 400


async def test_change_password_success(client):
    headers = await auth_headers(client)
    res = await client.put("/api/users/password", json={
        "current_password": TEST_PASSWORD,
        "new_password": "NewSecurePass99!"
    }, headers=headers)
    assert res.status_code == 200
    assert res.json()["message"] == "Password updated successfully"


async def test_change_password_wrong_current(client):
    headers = await auth_headers(client)
    res = await client.put("/api/users/password", json={
        "current_password": "WrongCurrentPass!",
        "new_password": "NewSecurePass99!"
    }, headers=headers)
    assert res.status_code == 400


async def test_update_language(client):
    headers = await auth_headers(client)
    with patch("app.routers.users.update_contact", new_callable=AsyncMock):
        res = await client.put("/api/users/profile", json={"language": "fr"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["language"] == "fr"


async def test_change_password_short_new_password_rejected(client):
    headers = await auth_headers(client)
    res = await client.put("/api/users/password", json={
        "current_password": TEST_PASSWORD,
        "new_password": "short"
    }, headers=headers)
    assert res.status_code == 400
