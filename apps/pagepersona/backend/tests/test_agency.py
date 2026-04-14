"""
Agency / Client tests — /api/clients + /api/workspaces/{id}/clients endpoints.

Tests cover:
- GET  /api/clients/invite-info          — branding + user_exists flag
- GET  /api/clients/join-info            — branding for self-signup page
- POST /api/clients/invite               — creates pending invite + client workspace
- POST /api/clients/invite               — duplicate active invite returns 400
- POST /api/clients/accept               — new user: creates account, activates invite
- POST /api/clients/accept               — existing user: one-click accept
- POST /api/clients/accept               — invalid token returns 404
- GET  /api/workspaces/{id}/clients      — agency owner sees all client workspaces
- GET  /api/workspaces/{id}/clients      — non-owner gets 404
- DELETE /api/clients/{id}/revoke        — revokes client access
- POST  /api/clients/{id}/restore        — restores revoked access
- GET  /api/clients/join-info            — invalid slug returns 404
- POST /api/clients/self-signup          — creates account + client workspace via slug
- POST /api/clients/self-signup          — invalid slug returns 404
- Full-access client can create a project in their workspace
- View-only client cannot create a project (403)
- Client cannot see agency workspace projects
"""
from unittest.mock import patch, MagicMock, AsyncMock
from tests.test_auth import unique_email


# ── Helpers ────────────────────────────────────────────────────────────────────

async def signup(client, email=None, name="Test User") -> tuple[dict, str]:
    """Sign up a user, return (auth_headers, workspace_id)."""
    email = email or unique_email()
    with patch("app.routers.auth.send_verification_email", new_callable=MagicMock), \
         patch("app.routers.auth.subscribe_contact", new_callable=AsyncMock):
        res = await client.post("/api/auth/signup", json={
            "email": email, "password": "TestPass123!", "name": name,
        })
    assert res.status_code == 200, res.text
    data = res.json()
    return {"Authorization": f"Bearer {data['access_token']}"}, data["workspace"]["id"]


async def invite_client(client, agency_headers, agency_ws_id, client_email) -> dict:
    """POST /api/clients/invite with email patched. Returns invite response."""
    with patch("app.services.email_service.send_client_invite_email", return_value=True), \
         patch("app.services.email_service.send_client_invite_existing_user_email", return_value=True):
        res = await client.post("/api/clients/invite", json={
            "client_email": client_email,
            "workspace_id": agency_ws_id,
        }, headers=agency_headers)
    assert res.status_code == 200, res.text
    return res.json()


# ── invite-info ────────────────────────────────────────────────────────────────

async def test_invite_info_returns_branding(client):
    """invite-info returns brand fields and user_exists=False for unknown email."""
    agency_headers, agency_ws_id = await signup(client)
    client_email = unique_email()
    data = await invite_client(client, agency_headers, agency_ws_id, client_email)

    res = await client.get(f"/api/clients/invite-info?token={data['token']}")
    assert res.status_code == 200
    body = res.json()
    assert body["client_email"] == client_email
    assert body["user_exists"] is False
    assert "white_label_primary_color" in body
    assert "white_label_brand_name" in body


async def test_invite_info_user_exists_true_for_known_email(client):
    """invite-info returns user_exists=True when the invited email already has an account."""
    agency_headers, agency_ws_id = await signup(client)
    existing_email = unique_email()
    await signup(client, email=existing_email)

    data = await invite_client(client, agency_headers, agency_ws_id, existing_email)

    res = await client.get(f"/api/clients/invite-info?token={data['token']}")
    assert res.status_code == 200
    assert res.json()["user_exists"] is True


async def test_invite_info_invalid_token_returns_404(client):
    """invite-info with a bad token returns 404."""
    res = await client.get("/api/clients/invite-info?token=does-not-exist")
    assert res.status_code == 404


# ── invite ─────────────────────────────────────────────────────────────────────

async def test_invite_creates_pending_client_workspace(client):
    """Inviting a client creates a pending invite and a client workspace."""
    agency_headers, agency_ws_id = await signup(client)
    client_email = unique_email()
    data = await invite_client(client, agency_headers, agency_ws_id, client_email)

    assert data["status"] == "pending"
    assert "token" in data
    assert "invite_id" in data
    assert "client_workspace_id" in data


async def test_invite_client_appears_in_clients_list(client):
    """After invite, client workspace appears in agency's client list."""
    agency_headers, agency_ws_id = await signup(client)
    client_email = unique_email()
    await invite_client(client, agency_headers, agency_ws_id, client_email)

    res = await client.get(f"/api/workspaces/{agency_ws_id}/clients", headers=agency_headers)
    assert res.status_code == 200
    emails = [c["client_email"] for c in res.json()]
    assert client_email in emails


async def test_invite_duplicate_active_returns_400(client):
    """Re-inviting a client who already accepted returns 400."""
    agency_headers, agency_ws_id = await signup(client)
    client_email = unique_email()
    data = await invite_client(client, agency_headers, agency_ws_id, client_email)

    # Accept first
    await client.post("/api/clients/accept", json={
        "token": data["token"], "name": "Client", "password": "TestPass123!",
    })

    # Re-invite the same email — should be blocked
    with patch("app.services.email_service.send_client_invite_email", return_value=True):
        res = await client.post("/api/clients/invite", json={
            "client_email": client_email,
            "workspace_id": agency_ws_id,
        }, headers=agency_headers)
    assert res.status_code == 400


# ── accept ─────────────────────────────────────────────────────────────────────

async def test_accept_new_user_creates_account(client):
    """New user accepting an invite gets an account and JWT tokens."""
    agency_headers, agency_ws_id = await signup(client)
    client_email = unique_email()
    data = await invite_client(client, agency_headers, agency_ws_id, client_email)

    res = await client.post("/api/clients/accept", json={
        "token": data["token"], "name": "New Client", "password": "TestPass123!",
    })
    assert res.status_code == 200
    body = res.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["user"]["email"] == client_email


async def test_accept_new_user_activates_invite(client):
    """After accept, invite status in client list shows active."""
    agency_headers, agency_ws_id = await signup(client)
    client_email = unique_email()
    data = await invite_client(client, agency_headers, agency_ws_id, client_email)

    await client.post("/api/clients/accept", json={
        "token": data["token"], "name": "Client", "password": "TestPass123!",
    })

    list_res = await client.get(f"/api/workspaces/{agency_ws_id}/clients", headers=agency_headers)
    row = next(c for c in list_res.json() if c["client_email"] == client_email)
    assert row["invite_status"] == "active"


async def test_accept_existing_user_no_password_needed(client):
    """Existing user can accept an invite without providing name or password."""
    agency_headers, agency_ws_id = await signup(client)
    existing_email = unique_email()
    await signup(client, email=existing_email)

    data = await invite_client(client, agency_headers, agency_ws_id, existing_email)

    res = await client.post("/api/clients/accept", json={"token": data["token"]})
    assert res.status_code == 200
    assert "access_token" in res.json()


async def test_accept_invalid_token_returns_404(client):
    """Accepting with a bogus token returns 404."""
    res = await client.post("/api/clients/accept", json={
        "token": "bad-token", "name": "X", "password": "TestPass123!",
    })
    assert res.status_code == 404


# ── list clients ───────────────────────────────────────────────────────────────

async def test_list_clients_only_for_owner(client):
    """Non-owner cannot list another agency's clients."""
    agency_headers, agency_ws_id = await signup(client)
    other_headers, _ = await signup(client)

    res = await client.get(f"/api/workspaces/{agency_ws_id}/clients", headers=other_headers)
    assert res.status_code == 404


# ── revoke & restore ───────────────────────────────────────────────────────────

async def test_revoke_client_access(client):
    """Agency can revoke a client; invite_status becomes revoked."""
    agency_headers, agency_ws_id = await signup(client)
    client_email = unique_email()
    data = await invite_client(client, agency_headers, agency_ws_id, client_email)

    await client.post("/api/clients/accept", json={
        "token": data["token"], "name": "Client", "password": "TestPass123!",
    })

    with patch("app.routers.clients.send_client_access_restored_email", return_value=True):
        res = await client.delete(
            f"/api/clients/{data['client_workspace_id']}/revoke",
            headers=agency_headers,
        )
    assert res.status_code == 200

    list_res = await client.get(f"/api/workspaces/{agency_ws_id}/clients", headers=agency_headers)
    row = next(c for c in list_res.json() if c["client_email"] == client_email)
    assert row["invite_status"] == "revoked"


async def test_restore_client_access(client):
    """Agency can restore a revoked client; invite_status becomes active."""
    agency_headers, agency_ws_id = await signup(client)
    client_email = unique_email()
    data = await invite_client(client, agency_headers, agency_ws_id, client_email)

    await client.post("/api/clients/accept", json={
        "token": data["token"], "name": "Client", "password": "TestPass123!",
    })
    client_ws_id = data["client_workspace_id"]

    with patch("app.routers.clients.send_client_access_restored_email", return_value=True):
        await client.delete(f"/api/clients/{client_ws_id}/revoke", headers=agency_headers)
        res = await client.post(f"/api/clients/{client_ws_id}/restore", headers=agency_headers)
    assert res.status_code == 200

    list_res = await client.get(f"/api/workspaces/{agency_ws_id}/clients", headers=agency_headers)
    row = next(c for c in list_res.json() if c["client_email"] == client_email)
    assert row["invite_status"] == "active"


# ── join-info & self-signup ────────────────────────────────────────────────────

async def test_join_info_returns_branding(client):
    """join-info returns brand fields for a valid agency slug."""
    agency_headers, _ = await signup(client)

    ws_res = await client.get("/api/workspaces", headers=agency_headers)
    slug = ws_res.json()[0]["slug"]

    res = await client.get(f"/api/clients/join-info?slug={slug}")
    assert res.status_code == 200
    body = res.json()
    assert "brand_name" in body
    assert "agency_workspace_id" in body


async def test_join_info_invalid_slug_returns_404(client):
    """join-info with a non-existent slug returns 404."""
    res = await client.get("/api/clients/join-info?slug=no-such-agency-xyz")
    assert res.status_code == 404


async def test_self_signup_creates_account_and_client_workspace(client):
    """Client self-signup creates account and appears in agency's client list."""
    agency_headers, agency_ws_id = await signup(client)
    ws_res = await client.get("/api/workspaces", headers=agency_headers)
    slug = ws_res.json()[0]["slug"]

    new_email = unique_email()
    with patch("app.routers.auth.send_verification_email", new_callable=MagicMock), \
         patch("app.routers.auth.subscribe_contact", new_callable=AsyncMock):
        res = await client.post("/api/clients/self-signup", json={
            "slug": slug,
            "name": "Self Signed",
            "email": new_email,
            "password": "TestPass123!",
        })
    assert res.status_code == 200
    assert "access_token" in res.json()

    list_res = await client.get(f"/api/workspaces/{agency_ws_id}/clients", headers=agency_headers)
    emails = [c["client_email"] for c in list_res.json()]
    assert new_email in emails


async def test_self_signup_invalid_slug_returns_404(client):
    """Self-signup with a non-existent slug returns 404."""
    with patch("app.routers.auth.send_verification_email", new_callable=MagicMock), \
         patch("app.routers.auth.subscribe_contact", new_callable=AsyncMock):
        res = await client.post("/api/clients/self-signup", json={
            "slug": "no-such-agency",
            "name": "Ghost",
            "email": unique_email(),
            "password": "TestPass123!",
        })
    assert res.status_code == 404


# ── client workspace access ────────────────────────────────────────────────────

async def test_full_access_client_can_create_project(client):
    """Full-access client can create a project in their client workspace."""
    agency_headers, agency_ws_id = await signup(client)
    client_email = unique_email()
    data = await invite_client(client, agency_headers, agency_ws_id, client_email)

    accept_res = await client.post("/api/clients/accept", json={
        "token": data["token"], "name": "Client", "password": "TestPass123!",
    })
    client_headers = {"Authorization": f"Bearer {accept_res.json()['access_token']}"}
    client_ws_id = data["client_workspace_id"]

    res = await client.post("/api/projects", json={
        "name": "Client Project",
        "page_url": "https://example.com",
        "platform": "html",
        "workspace_id": client_ws_id,
    }, headers=client_headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Client Project"


async def test_view_only_client_cannot_create_project(client):
    """View-only client gets 403 when trying to create a project."""
    agency_headers, agency_ws_id = await signup(client)
    client_email = unique_email()
    data = await invite_client(client, agency_headers, agency_ws_id, client_email)

    accept_res = await client.post("/api/clients/accept", json={
        "token": data["token"], "name": "Client", "password": "TestPass123!",
    })
    client_headers = {"Authorization": f"Bearer {accept_res.json()['access_token']}"}
    client_ws_id = data["client_workspace_id"]

    # Downgrade to view_only
    await client.patch(f"/api/workspaces/{client_ws_id}",
                       json={"client_access_level": "view_only"},
                       headers=agency_headers)

    res = await client.post("/api/projects", json={
        "name": "Blocked Project",
        "page_url": "https://example.com",
        "platform": "html",
        "workspace_id": client_ws_id,
    }, headers=client_headers)
    assert res.status_code == 403


async def test_client_cannot_see_agency_projects(client):
    """Client cannot fetch a project that belongs to the agency workspace."""
    agency_headers, agency_ws_id = await signup(client)

    proj_res = await client.post("/api/projects", json={
        "name": "Agency Project",
        "page_url": "https://example.com",
        "platform": "html",
        "workspace_id": agency_ws_id,
    }, headers=agency_headers)
    agency_project_id = proj_res.json()["id"]

    client_email = unique_email()
    data = await invite_client(client, agency_headers, agency_ws_id, client_email)
    accept_res = await client.post("/api/clients/accept", json={
        "token": data["token"], "name": "Client", "password": "TestPass123!",
    })
    client_headers = {"Authorization": f"Bearer {accept_res.json()['access_token']}"}

    res = await client.get(f"/api/projects/{agency_project_id}", headers=client_headers)
    assert res.status_code == 404
