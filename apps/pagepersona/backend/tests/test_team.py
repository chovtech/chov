"""
Team management tests — /api/team endpoints.

Tests cover:
- Invite flow (new user + existing user)
- invite-info endpoint
- Accept invite (new user creates account + own workspace)
- Accept invite (existing user just gets linked)
- Update member role (owner only)
- Remove member
- Access control — member can use workspace resources
- Access control — non-member cannot
"""
import uuid
from unittest.mock import patch, AsyncMock, MagicMock
from tests.test_auth import unique_email


# ── Helpers ────────────────────────────────────────────────────────────────────

async def signup(client, email=None) -> tuple[dict, str]:
    """Sign up a user, return (headers, workspace_id)."""
    email = email or unique_email()
    with patch("app.routers.auth.send_verification_email", new_callable=MagicMock), \
         patch("app.routers.auth.subscribe_contact", new_callable=AsyncMock):
        res = await client.post("/api/auth/signup", json={
            "email": email, "password": "TestPass123!", "name": "Test User"
        })
    data = res.json()
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    return headers, data["workspace"]["id"]


async def invite_member(client, headers, email, role="member"):
    """POST /api/team/invite with email patched so no real email is sent."""
    with patch("app.routers.team.send_team_invite_email", return_value=True), \
         patch("app.routers.team.send_team_invite_existing_user_email", return_value=True):
        res = await client.post("/api/team/invite", json={"email": email, "role": role}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


# ── Tests ──────────────────────────────────────────────────────────────────────

async def test_invite_new_member(client):
    """Inviting a new email creates a pending workspace_members row."""
    headers, _ = await signup(client)
    member_email = unique_email()
    member = await invite_member(client, headers, member_email)

    assert member["email"] == member_email
    assert member["status"] == "pending"
    assert member["role"] == "member"
    assert member["user_id"] is None  # not yet accepted


async def test_invite_admin_role(client):
    """Inviting with role=admin stores the admin role."""
    headers, _ = await signup(client)
    member = await invite_member(client, headers, unique_email(), role="admin")
    assert member["role"] == "admin"


async def test_invite_invalid_role(client):
    """Inviting with an invalid role returns 422."""
    headers, _ = await signup(client)
    with patch("app.routers.team.send_team_invite_email", return_value=True):
        res = await client.post("/api/team/invite",
                                json={"email": unique_email(), "role": "superuser"},
                                headers=headers)
    assert res.status_code == 422


async def test_invite_info_returns_workspace_name(client):
    """GET /api/team/invite-info returns workspace name and user_exists=False for new email."""
    headers, _ = await signup(client)
    member_email = unique_email()
    member = await invite_member(client, headers, member_email)

    # Fetch the invite token from DB
    from app.database import get_pool
    pool = await get_pool()
    async with pool.acquire() as db:
        row = await db.fetchrow(
            "SELECT invite_token FROM workspace_members WHERE id = $1",
            member["id"]
        )
    token = row["invite_token"]

    res = await client.get(f"/api/team/invite-info?token={token}")
    assert res.status_code == 200
    data = res.json()
    assert "workspace_name" in data
    assert data["user_exists"] is False
    assert data["email"] == member_email


async def test_accept_invite_new_user(client):
    """Accepting an invite as a new user creates an account + own workspace."""
    headers, _ = await signup(client)
    member_email = unique_email()
    member = await invite_member(client, headers, member_email)

    from app.database import get_pool
    pool = await get_pool()
    async with pool.acquire() as db:
        row = await db.fetchrow(
            "SELECT invite_token FROM workspace_members WHERE id = $1", member["id"]
        )
    token = row["invite_token"]

    res = await client.post("/api/team/accept", json={
        "token": token,
        "name": "New Team Member",
        "password": "TeamPass123!",
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == member_email

    # Their own workspace should have been created
    member_headers = {"Authorization": f"Bearer {data['access_token']}"}
    ws_res = await client.get("/api/workspaces", headers=member_headers)
    workspaces = ws_res.json()
    # They should have at least 2 workspaces: their own + the inviter's
    assert len(workspaces) >= 2


async def test_accept_invite_existing_user(client):
    """Accepting an invite as an existing user just links them — no new account."""
    owner_headers, _ = await signup(client)
    member_email = unique_email()

    # Member already has an account
    member_headers, _ = await signup(client, email=member_email)

    # Owner invites that email
    member = await invite_member(client, owner_headers, member_email)

    from app.database import get_pool
    pool = await get_pool()
    async with pool.acquire() as db:
        row = await db.fetchrow(
            "SELECT invite_token FROM workspace_members WHERE id = $1", member["id"]
        )
    token = row["invite_token"]

    # Accept without name/password (existing user)
    res = await client.post("/api/team/accept", json={"token": token})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data

    # Their workspace list should now include the owner's workspace
    updated_headers = {"Authorization": f"Bearer {data['access_token']}"}
    ws_res = await client.get("/api/workspaces", headers=updated_headers)
    workspaces = ws_res.json()
    assert len(workspaces) >= 2


async def test_accept_invite_activates_member(client):
    """After accepting, the workspace_members row is active with user_id set."""
    headers, _ = await signup(client)
    member_email = unique_email()
    member = await invite_member(client, headers, member_email)

    from app.database import get_pool
    pool = await get_pool()
    async with pool.acquire() as db:
        row = await db.fetchrow(
            "SELECT invite_token FROM workspace_members WHERE id = $1", member["id"]
        )
    token = row["invite_token"]

    await client.post("/api/team/accept", json={
        "token": token, "name": "Joined Member", "password": "JoinPass123!"
    })

    async with pool.acquire() as db:
        updated = await db.fetchrow(
            "SELECT status, user_id FROM workspace_members WHERE id = $1", member["id"]
        )
    assert updated["status"] == "active"
    assert updated["user_id"] is not None


async def test_list_members(client):
    """GET /api/team lists all members for the owner's workspace."""
    headers, _ = await signup(client)
    await invite_member(client, headers, unique_email())
    await invite_member(client, headers, unique_email())

    res = await client.get("/api/team", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 2


async def test_update_member_role(client):
    """Owner can change a member's role."""
    headers, _ = await signup(client)
    member = await invite_member(client, headers, unique_email(), role="member")

    res = await client.patch(f"/api/team/{member['id']}/role",
                             json={"role": "admin"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["role"] == "admin"


async def test_update_role_invalid(client):
    """Changing a role to an invalid value returns 422."""
    headers, _ = await signup(client)
    member = await invite_member(client, headers, unique_email())

    res = await client.patch(f"/api/team/{member['id']}/role",
                             json={"role": "god"}, headers=headers)
    assert res.status_code == 422


async def test_remove_member(client):
    """Owner can remove a team member."""
    headers, _ = await signup(client)
    member = await invite_member(client, headers, unique_email())

    res = await client.delete(f"/api/team/{member['id']}", headers=headers)
    assert res.status_code == 200

    list_res = await client.get("/api/team", headers=headers)
    ids = [m["id"] for m in list_res.json()]
    assert member["id"] not in ids


async def test_member_can_access_workspace_projects(client):
    """An accepted team member can list and create projects in the shared workspace."""
    owner_headers, workspace_id = await signup(client)
    member_email = unique_email()

    # Create a project as owner
    proj_res = await client.post("/api/projects", json={
        "name": "Shared Project", "page_url": "https://shared.com",
        "platform": "html", "workspace_id": workspace_id,
    }, headers=owner_headers)
    project_id = proj_res.json()["id"]

    # Invite and accept
    member = await invite_member(client, owner_headers, member_email)
    from app.database import get_pool
    pool = await get_pool()
    async with pool.acquire() as db:
        row = await db.fetchrow("SELECT invite_token FROM workspace_members WHERE id = $1", member["id"])
    token = row["invite_token"]
    accept_res = await client.post("/api/team/accept", json={
        "token": token, "name": "Team Member", "password": "TeamPass123!"
    })
    member_headers = {"Authorization": f"Bearer {accept_res.json()['access_token']}"}

    # Member should see the project
    list_res = await client.get(f"/api/projects?workspace_id={workspace_id}", headers=member_headers)
    assert list_res.status_code == 200
    ids = [p["id"] for p in list_res.json()]
    assert project_id in ids


async def test_resend_invite_refreshes_token(client):
    """POST /{member_id}/resend generates a new token on the same row."""
    headers, _ = await signup(client)
    email = unique_email()

    m1 = await invite_member(client, headers, email)
    from app.database import get_pool
    pool = await get_pool()
    async with pool.acquire() as db:
        r1 = await db.fetchrow("SELECT invite_token FROM workspace_members WHERE id = $1", m1["id"])
    token1 = r1["invite_token"]

    # Resend via the dedicated endpoint
    with patch("app.routers.team.send_team_invite_email", return_value=True), \
         patch("app.routers.team.send_team_invite_existing_user_email", return_value=True):
        resend_res = await client.post(f"/api/team/{m1['id']}/resend", headers=headers)
    assert resend_res.status_code == 200
    m2 = resend_res.json()

    async with pool.acquire() as db:
        r2 = await db.fetchrow("SELECT invite_token FROM workspace_members WHERE id = $1", m2["id"])
    token2 = r2["invite_token"]

    assert token1 != token2          # token was refreshed
    assert m1["id"] == m2["id"]      # same row, no duplicate


async def test_cannot_invite_self(client):
    """Owner cannot invite their own email address."""
    email = unique_email()
    with patch("app.routers.auth.send_verification_email", new_callable=MagicMock), \
         patch("app.routers.auth.subscribe_contact", new_callable=AsyncMock):
        res = await client.post("/api/auth/signup", json={
            "email": email, "password": "TestPass123!", "name": "Test User"
        })
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    with patch("app.routers.team.send_team_invite_email", return_value=True):
        res = await client.post("/api/team/invite",
                                json={"email": email, "role": "member"},
                                headers=headers)
    assert res.status_code == 400


async def test_accept_invalid_token(client):
    """Accepting with a bogus token returns 404."""
    res = await client.post("/api/team/accept", json={"token": str(uuid.uuid4())})
    assert res.status_code == 404
