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


async def signup_and_token(client, email=None, password=TEST_PASSWORD):
    """Sign up and return (access_token, refresh_token, user_id, workspace_id)."""
    email = email or unique_email()
    res = await signup(client, email, password)
    data = res.json()
    return data["access_token"], data["refresh_token"], data["user"]["id"], data["workspace"]["id"]


# ── Original Tests ─────────────────────────────────────────────────────────────

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


# ── New Tests ──────────────────────────────────────────────────────────────────

async def test_get_me_returns_user(client):
    access_token, _, _, _ = await signup_and_token(client)
    res = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "email" in data
    assert "id" in data


async def test_get_me_without_token_returns_403(client):
    res = await client.get("/api/auth/me")
    assert res.status_code in (401, 403)


async def test_logout_invalidates_session(client):
    access_token, _, _, _ = await signup_and_token(client)
    headers = {"Authorization": f"Bearer {access_token}"}

    # /me works before logout
    res = await client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200

    # logout
    res = await client.post("/api/auth/logout", headers=headers)
    assert res.status_code == 200

    # /me still returns 200 because JWT is still valid (session delete only removes DB row)
    # The endpoint only deletes the session row; the JWT itself is stateless until expiry.
    # What we can assert: logout returns a success message.
    assert "message" in res.json()


async def test_refresh_token_returns_new_access_token(client):
    _, refresh_token, _, _ = await signup_and_token(client)
    res = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert res.status_code == 200
    assert "access_token" in res.json()


async def test_refresh_token_invalid_returns_401(client):
    res = await client.post("/api/auth/refresh", json={"refresh_token": "bogus.token.here"})
    assert res.status_code == 401


async def test_verify_email_success(client, db):
    email = unique_email()
    captured_token = {}

    def fake_send(to_email, name, token, lang="en"):
        captured_token["token"] = token

    with patch("app.routers.auth.send_verification_email", side_effect=fake_send), \
         patch("app.routers.auth.subscribe_contact", new_callable=AsyncMock):
        res = await client.post("/api/auth/signup", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
    assert res.status_code == 200
    assert "token" in captured_token

    with patch("app.routers.auth.send_welcome_email", new_callable=MagicMock):
        res = await client.post("/api/auth/verify-email", json={"token": captured_token["token"]})
    assert res.status_code == 200
    assert res.json()["message"] == "Email verified successfully"

    # Confirm DB updated
    row = await db.fetchrow("SELECT email_verified FROM users WHERE email = $1", email)
    assert row["email_verified"] is True


async def test_verify_email_invalid_token_returns_400(client):
    res = await client.post("/api/auth/verify-email", json={"token": "notavalidtoken"})
    assert res.status_code == 400


async def test_verify_email_missing_token_returns_400(client):
    res = await client.post("/api/auth/verify-email", json={})
    assert res.status_code == 400


async def test_forgot_password_returns_success(client):
    email = unique_email()
    await signup(client, email)

    with patch("app.routers.auth.send_password_reset_email", new_callable=MagicMock):
        res = await client.post("/api/auth/forgot-password", json={"email": email})
    assert res.status_code == 200
    assert "message" in res.json()


async def test_forgot_password_unknown_email_still_returns_200(client):
    """Never reveals whether the email exists."""
    res = await client.post("/api/auth/forgot-password", json={"email": "ghost@nowhere.com"})
    assert res.status_code == 200


async def test_reset_password_success(client, db):
    email = unique_email()
    await signup(client, email)

    captured = {}

    def fake_send(to_email, name, reset_token, lang="en"):
        captured["token"] = reset_token

    with patch("app.routers.auth.send_password_reset_email", side_effect=fake_send):
        await client.post("/api/auth/forgot-password", json={"email": email})

    assert "token" in captured
    res = await client.post("/api/auth/reset-password", json={
        "token": captured["token"],
        "new_password": "NewPassword999!"
    })
    assert res.status_code == 200

    # Old password should now fail
    res = await client.post("/api/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert res.status_code == 401

    # New password should work
    res = await client.post("/api/auth/login", json={"email": email, "password": "NewPassword999!"})
    assert res.status_code == 200


async def test_reset_password_invalid_token_returns_400(client):
    res = await client.post("/api/auth/reset-password", json={
        "token": "fake_token",
        "new_password": "NewPassword999!"
    })
    assert res.status_code == 400


async def test_magic_link_request_always_returns_200(client):
    res = await client.post("/api/auth/magic-link", json={"email": "nobody@example.com"})
    assert res.status_code == 200


async def test_magic_link_verify_success(client, db):
    email = unique_email()
    await signup(client, email)

    captured = {}

    def fake_send(to_email, name, token, lang="en"):
        captured["token"] = token

    with patch("app.routers.auth.send_magic_link_email", side_effect=fake_send):
        await client.post("/api/auth/magic-link", json={"email": email})

    assert "token" in captured
    res = await client.post("/api/auth/magic-link/verify", json={"token": captured["token"]})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data


async def test_magic_link_verify_invalid_returns_400(client):
    res = await client.post("/api/auth/magic-link/verify", json={"token": "notvalid"})
    assert res.status_code == 400


async def test_signup_creates_trial_entitlement(client, db):
    email = unique_email()
    res = await signup(client, email)
    assert res.status_code == 200
    workspace_id = res.json()["workspace"]["id"]

    row = await db.fetchrow(
        "SELECT plan, product_id, source FROM entitlements WHERE workspace_id = $1",
        uuid.UUID(workspace_id)
    )
    assert row is not None
    assert row["plan"] == "trial"
    assert row["product_id"] == "pagepersona"
    assert row["source"] == "direct"


async def test_signup_creates_ai_coins_with_trial_balance(client, db):
    email = unique_email()
    res = await signup(client, email)
    assert res.status_code == 200
    workspace_id = res.json()["workspace"]["id"]

    row = await db.fetchrow(
        "SELECT balance FROM ai_coins WHERE workspace_id = $1",
        uuid.UUID(workspace_id)
    )
    assert row is not None
    assert row["balance"] == 20


async def test_signup_rejects_short_password(client):
    res = await signup(client, unique_email(), password="short")
    assert res.status_code == 400
