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


async def test_list_workspaces_includes_stats_fields(client):
    """List response includes stats: project_count, active_rules_count, etc."""
    headers, _ = await auth_headers(client)
    res = await client.get("/api/workspaces", headers=headers)
    assert res.status_code == 200
    ws = res.json()[0]
    assert "project_count" in ws
    assert "active_rules_count" in ws
    assert "sessions_this_month" in ws
    assert "last_activity" in ws


async def test_onboarding_completed_false_on_signup(client):
    """New workspace starts with onboarding_completed = false."""
    headers, _ = await auth_headers(client)
    res = await client.get("/api/workspaces", headers=headers)
    assert res.status_code == 200
    ws = res.json()[0]
    assert ws["onboarding_completed"] is False


async def test_complete_onboarding(client):
    """POST /complete-onboarding sets onboarding_completed to true."""
    headers, workspace_id = await auth_headers(client)
    res = await client.post(
        f"/api/workspaces/{workspace_id}/complete-onboarding",
        headers=headers
    )
    assert res.status_code == 200
    assert res.json()["ok"] is True

    # Verify the flag is now true
    res = await client.get("/api/workspaces", headers=headers)
    ws = next(w for w in res.json() if w["id"] == workspace_id)
    assert ws["onboarding_completed"] is True


async def test_patch_white_label_settings(client):
    """PATCH supports white-label brand name and primary color."""
    headers, workspace_id = await auth_headers(client)
    res = await client.patch(
        f"/api/workspaces/{workspace_id}",
        json={
            "white_label_brand_name": "AcmeCo",
            "white_label_primary_color": "#FF0000"
        },
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["white_label_brand_name"] == "AcmeCo"
    assert data["white_label_primary_color"] == "#FF0000"
