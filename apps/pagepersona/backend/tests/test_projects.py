import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from tests.test_auth import signup, unique_email


async def auth_headers(client) -> tuple[dict, str]:
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
    return {"Authorization": f"Bearer {data['access_token']}"}, data["workspace"]["id"]


async def create_project(client, headers, workspace_id, **overrides) -> dict:
    """Helper — create a project and return its JSON."""
    payload = {
        "name": "Test Project",
        "page_url": "https://example.com",
        "platform": "html",
        "workspace_id": workspace_id,
        **overrides
    }
    res = await client.post("/api/projects", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


# ── Tests ──────────────────────────────────────────────────────────────────────

async def test_create_project(client):
    """Creating a project returns it with a unique PP-XXXXXX script ID."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)

    assert project["name"] == "Test Project"
    assert project["page_url"] == "https://example.com"
    assert project["platform"] == "html"
    assert project["script_id"].startswith("PP-")
    assert project["status"] == "draft"
    assert project["script_verified"] is False


async def test_create_project_script_id_is_unique(client):
    """Two projects should never share the same script ID."""
    headers, workspace_id = await auth_headers(client)
    p1 = await create_project(client, headers, workspace_id, name="Project A", page_url="https://a.com")
    p2 = await create_project(client, headers, workspace_id, name="Project B", page_url="https://b.com")
    assert p1["script_id"] != p2["script_id"]


async def test_list_projects(client):
    """List endpoint returns all projects for the workspace."""
    headers, workspace_id = await auth_headers(client)
    await create_project(client, headers, workspace_id, name="Alpha", page_url="https://alpha.com")
    await create_project(client, headers, workspace_id, name="Beta", page_url="https://beta.com")

    res = await client.get(f"/api/projects?workspace_id={workspace_id}", headers=headers)
    assert res.status_code == 200
    names = [p["name"] for p in res.json()]
    assert "Alpha" in names
    assert "Beta" in names


async def test_edit_project_name(client):
    """PUT updates the project name."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    project_id = project["id"]

    res = await client.put(f"/api/projects/{project_id}", json={"name": "Renamed"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Renamed"


async def test_edit_project_platform(client):
    """PUT updates the project platform."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    project_id = project["id"]

    res = await client.put(f"/api/projects/{project_id}", json={"platform": "wordpress"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["platform"] == "wordpress"


async def test_toggle_project_status(client):
    """Toggling status between draft and active works."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    project_id = project["id"]
    assert project["status"] == "draft"

    res = await client.put(f"/api/projects/{project_id}", json={"status": "active"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "active"

    res = await client.put(f"/api/projects/{project_id}", json={"status": "draft"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "draft"


async def test_delete_project(client):
    """Deleting a project removes it from the list."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    project_id = project["id"]

    res = await client.delete(f"/api/projects/{project_id}", headers=headers)
    assert res.status_code == 200

    res = await client.get(f"/api/projects?workspace_id={workspace_id}", headers=headers)
    ids = [p["id"] for p in res.json()]
    assert project_id not in ids


async def test_cannot_access_other_users_project(client):
    """A project is not accessible by a different user."""
    headers_a, workspace_id_a = await auth_headers(client)
    headers_b, _ = await auth_headers(client)

    project = await create_project(client, headers_a, workspace_id_a)
    project_id = project["id"]

    res = await client.put(f"/api/projects/{project_id}", json={"name": "Hacked"}, headers=headers_b)
    assert res.status_code == 404
