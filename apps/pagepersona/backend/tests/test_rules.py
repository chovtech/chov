from unittest.mock import patch, AsyncMock, MagicMock
from tests.test_auth import unique_email


# ── Helpers ────────────────────────────────────────────────────────────────────

async def auth_headers(client) -> tuple[dict, str]:
    email = unique_email()
    with patch("app.routers.auth.send_verification_email", new_callable=MagicMock), \
         patch("app.routers.auth.subscribe_contact", new_callable=AsyncMock):
        res = await client.post("/api/auth/signup", json={
            "email": email, "password": "TestPass123!", "name": "Test User"
        })
    data = res.json()
    return {"Authorization": f"Bearer {data['access_token']}"}, data["workspace"]["id"]


async def create_project(client, headers, workspace_id) -> dict:
    res = await client.post("/api/projects", json={
        "name": "Rule Test Project",
        "page_url": "https://example.com",
        "platform": "html",
        "workspace_id": workspace_id,
    }, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def make_rule(**overrides) -> dict:
    return {
        "name": "Test Rule",
        "conditions": [{"signal": "page_view", "operator": "is detected", "value": ""}],
        "condition_operator": "AND",
        "actions": [{"type": "swap_text", "target_block": "#headline", "value": "Hello"}],
        "priority": 0,
        **overrides,
    }


async def create_rule(client, headers, project_id, **overrides) -> dict:
    res = await client.post(
        f"/api/projects/{project_id}/rules",
        json=make_rule(**overrides),
        headers=headers,
    )
    assert res.status_code == 200, res.text
    return res.json()


# ── Tests ──────────────────────────────────────────────────────────────────────

async def test_create_rule(client):
    """Creating a rule returns it with correct fields."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    rule = await create_rule(client, headers, project["id"])

    assert rule["name"] == "Test Rule"
    assert rule["is_active"] is False  # rules default to inactive on creation
    assert len(rule["conditions"]) == 1
    assert rule["conditions"][0]["signal"] == "page_view"
    assert len(rule["actions"]) == 1
    assert rule["actions"][0]["type"] == "swap_text"


async def test_list_rules(client):
    """List endpoint returns all rules for the project."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    pid = project["id"]

    await create_rule(client, headers, pid, name="Rule Alpha")
    await create_rule(client, headers, pid, name="Rule Beta")

    res = await client.get(f"/api/projects/{pid}/rules", headers=headers)
    assert res.status_code == 200
    names = [r["name"] for r in res.json()]
    assert "Rule Alpha" in names
    assert "Rule Beta" in names


async def test_edit_rule(client):
    """PUT updates rule name, conditions, and actions."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    rule = await create_rule(client, headers, project["id"])
    rule_id = rule["id"]

    res = await client.put(
        f"/api/projects/{project['id']}/rules/{rule_id}",
        json={
            "name": "Updated Rule",
            "conditions": [{"signal": "scroll_depth", "operator": "is greater than", "value": "50"}],
            "condition_operator": "AND",
            "actions": [{"type": "hide_section", "target_block": "#banner", "value": ""}],
            "priority": 1,
            "is_active": True,
        },
        headers=headers,
    )
    assert res.status_code == 200
    updated = res.json()
    assert updated["name"] == "Updated Rule"
    assert updated["conditions"][0]["signal"] == "scroll_depth"
    assert updated["actions"][0]["type"] == "hide_section"


async def test_toggle_rule_active(client):
    """is_active can be toggled off and back on."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    rule = await create_rule(client, headers, project["id"])
    rule_id = rule["id"]
    pid = project["id"]

    res = await client.put(
        f"/api/projects/{pid}/rules/{rule_id}",
        json={"is_active": False},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    res = await client.put(
        f"/api/projects/{pid}/rules/{rule_id}",
        json={"is_active": True},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is True


async def test_delete_rule(client):
    """Deleting a rule removes it from the list."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)
    rule = await create_rule(client, headers, project["id"])
    rule_id = rule["id"]
    pid = project["id"]

    res = await client.delete(f"/api/projects/{pid}/rules/{rule_id}", headers=headers)
    assert res.status_code == 200

    res = await client.get(f"/api/projects/{pid}/rules", headers=headers)
    ids = [r["id"] for r in res.json()]
    assert rule_id not in ids


async def test_cannot_access_other_users_rules(client):
    """Rules are not accessible by a different user."""
    headers_a, workspace_a = await auth_headers(client)
    headers_b, _ = await auth_headers(client)

    project = await create_project(client, headers_a, workspace_a)
    pid = project["id"]

    res = await client.get(f"/api/projects/{pid}/rules", headers=headers_b)
    assert res.status_code == 404


async def test_rule_with_multiple_conditions(client):
    """A rule can be created with multiple conditions and OR operator."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)

    rule = await create_rule(client, headers, project["id"],
        conditions=[
            {"signal": "time_on_page", "operator": "is greater than", "value": "30"},
            {"signal": "scroll_depth", "operator": "is greater than", "value": "50"},
        ],
        condition_operator="OR",
    )
    assert len(rule["conditions"]) == 2
    assert rule["condition_operator"] == "OR"


async def test_rule_with_show_popup_action(client):
    """A rule can be created with a show_popup action."""
    headers, workspace_id = await auth_headers(client)
    project = await create_project(client, headers, workspace_id)

    rule = await create_rule(client, headers, project["id"],
        actions=[{"type": "show_popup", "target_block": "", "value": '{"popup_id": "abc123"}'}],
    )
    assert rule["actions"][0]["type"] == "show_popup"
