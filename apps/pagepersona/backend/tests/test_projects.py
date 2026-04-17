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


async def test_create_project_with_description(client):
    """Project can be created with an optional description field."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id, description="My landing page")
    assert project["description"] == "My landing page"


async def test_edit_project_description(client):
    """PUT updates the project description."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    project_id = project["id"]

    res = await client.put(f"/api/projects/{project_id}", json={"description": "Updated desc"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["description"] == "Updated desc"


async def test_trigger_scan_returns_scan_started(client):
    """POST /scan immediately returns {'message': 'Scan started'}."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    project_id = project["id"]

    with patch("app.routers.projects.run_scan_and_save", new_callable=AsyncMock):
        res = await client.post(f"/api/projects/{project_id}/scan", headers=headers)
    assert res.status_code == 200
    assert res.json()["message"] == "Scan started"


async def test_add_custom_block(client):
    """POST /scan/custom-blocks adds a new block to page_scan."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    project_id = project["id"]

    res = await client.post(
        f"/api/projects/{project_id}/scan/custom-blocks",
        json={"selector": "#hero", "label": "Hero Section", "type": "custom"},
        headers=headers
    )
    assert res.status_code == 200
    custom_blocks = res.json()["page_scan"]["custom_blocks"]
    assert any(b["selector"] == "#hero" for b in custom_blocks)


async def test_add_custom_block_no_duplicate(client):
    """Adding the same selector twice returns the existing scan unchanged."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    project_id = project["id"]

    await client.post(
        f"/api/projects/{project_id}/scan/custom-blocks",
        json={"selector": "#unique-el", "label": "Label 1", "type": "custom"},
        headers=headers
    )
    res = await client.post(
        f"/api/projects/{project_id}/scan/custom-blocks",
        json={"selector": "#unique-el", "label": "Label 2", "type": "custom"},
        headers=headers
    )
    assert res.status_code == 200
    blocks = res.json()["page_scan"]["custom_blocks"]
    assert sum(1 for b in blocks if b["selector"] == "#unique-el") == 1


async def test_bulk_add_blocks(client):
    """POST /scan/bulk-add-blocks adds multiple blocks at once."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    project_id = project["id"]

    res = await client.post(
        f"/api/projects/{project_id}/scan/bulk-add-blocks",
        json={"blocks": [
            {"selector": ".block-a", "label": "Block A", "type": "custom"},
            {"selector": ".block-b", "label": "Block B", "type": "custom"},
        ]},
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["added"] == 2
    selectors = [b["selector"] for b in data["page_scan"]["custom_blocks"]]
    assert ".block-a" in selectors
    assert ".block-b" in selectors


async def test_update_block(client):
    """PUT /scan/blocks/{selector} updates label and type."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    project_id = project["id"]

    # Add a block first
    await client.post(
        f"/api/projects/{project_id}/scan/custom-blocks",
        json={"selector": ".cta-btn", "label": "Old Label", "type": "custom"},
        headers=headers
    )
    res = await client.put(
        f"/api/projects/{project_id}/scan/blocks/.cta-btn",
        json={"label": "New Label", "type": "cta"},
        headers=headers
    )
    assert res.status_code == 200
    blocks = res.json()["page_scan"]["custom_blocks"]
    updated = next((b for b in blocks if b["selector"] == ".cta-btn"), None)
    assert updated is not None
    assert updated["label"] == "New Label"
    assert updated["type"] == "cta"


async def test_delete_block(client):
    """DELETE /scan/blocks/{selector} removes the block."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    project_id = project["id"]

    await client.post(
        f"/api/projects/{project_id}/scan/custom-blocks",
        json={"selector": ".to-remove", "label": "Remove Me", "type": "custom"},
        headers=headers
    )
    res = await client.delete(
        f"/api/projects/{project_id}/scan/blocks/.to-remove",
        headers=headers
    )
    assert res.status_code == 200
    blocks = res.json()["page_scan"].get("custom_blocks", [])
    assert not any(b["selector"] == ".to-remove" for b in blocks)


async def test_import_blocks_from_rules(client):
    """POST /scan/import-from-rules adds rule target_block selectors as custom blocks."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    project_id = project["id"]

    # Create a rule with an action that has a target_block
    await client.post(f"/api/projects/{project_id}/rules", json={
        "name": "Show Popup Rule",
        "conditions": [],
        "actions": [{"type": "show_popup", "target_block": ".my-popup-target"}],
        "priority": 0
    }, headers=headers)

    res = await client.post(f"/api/projects/{project_id}/scan/import-from-rules", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["imported"] >= 1
    blocks = data["page_scan"]["custom_blocks"]
    assert any(b["selector"] == ".my-popup-target" for b in blocks)
