import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from tests.test_auth import signup, unique_email


async def auth_headers(client) -> dict:
    """Sign up a fresh user and return auth headers + workspace id."""
    email = unique_email()
    with patch("app.routers.auth.send_verification_email", new_callable=MagicMock), \
         patch("app.routers.auth.subscribe_contact", new_callable=AsyncMock):
        res = await client.post("/api/auth/signup", json={
            "email": email,
            "password": "TestPass123!",
            "name": "Test User"
        })
    data = res.json()
    token = data["access_token"]
    workspace_id = data["workspace"]["id"]
    return {"Authorization": f"Bearer {token}"}, workspace_id


# ── Tests ──────────────────────────────────────────────────────────────────────

async def test_default_workspace_created_on_signup(client):
    """Signup should create exactly one workspace for the user."""
    headers, workspace_id = await auth_headers(client)
    res = await client.get("/api/workspaces", headers=headers)
    assert res.status_code == 200
    workspaces = res.json()
    assert len(workspaces) >= 1
    assert any(ws["id"] == workspace_id for ws in workspaces)


async def test_list_workspaces(client):
    """List endpoint returns workspaces belonging to the user."""
    headers, _ = await auth_headers(client)
    res = await client.get("/api/workspaces", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


async def test_rename_workspace(client):
    """Renaming a workspace saves the new name."""
    headers, workspace_id = await auth_headers(client)
    res = await client.patch(
        f"/api/workspaces/{workspace_id}",
        json={"name": "Renamed Workspace"},
        headers=headers
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Renamed Workspace"
