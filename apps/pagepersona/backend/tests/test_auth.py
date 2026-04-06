import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import uuid


TEST_PASSWORD = "TestPass123!"
TEST_NAME = "Test User"


def unique_email():
    """Fresh email for each test — avoids collisions between runs."""
    return f"test_{uuid.uuid4().hex[:8]}@example.com"


async def signup(client, email, password=TEST_PASSWORD, name=TEST_NAME):
    """Sign up a user, mocking email + Mautic so no real side-effects."""
    with patch("app.routers.auth.send_verification_email", new_callable=MagicMock), \
         patch("app.routers.auth.subscribe_contact", new_callable=AsyncMock):
        return await client.post("/api/auth/signup", json={
            "email": email,
            "password": password,
            "name": name
        })


# ── Tests ──────────────────────────────────────────────────────────────────────

async def test_signup_returns_tokens(client):
    res = await signup(client, unique_email())
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data


async def test_signup_duplicate_email_fails(client):
    email = unique_email()
    await signup(client, email)           # first signup
    res = await signup(client, email)     # same email again
    assert res.status_code == 400


async def test_login_with_correct_credentials(client):
    email = unique_email()
    await signup(client, email)
    res = await client.post("/api/auth/login", json={
        "email": email,
        "password": TEST_PASSWORD
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


async def test_login_wrong_password_fails(client):
    email = unique_email()
    await signup(client, email)
    res = await client.post("/api/auth/login", json={
        "email": email,
        "password": "WrongPassword!"
    })
    assert res.status_code == 401


async def test_login_unknown_email_fails(client):
    res = await client.post("/api/auth/login", json={
        "email": "nobody_xyz@example.com",
        "password": "whatever"
    })
    assert res.status_code == 401
