"""
SDK endpoint tests — /api/sdk/ping and /api/sdk/rules.

These are public endpoints (no auth). They require:
- A project with status=active and a known script_id
- A rule attached to that project

We create these via the authenticated APIs, then hit the public SDK endpoints.
"""
import json
from unittest.mock import patch, AsyncMock, MagicMock
from tests.test_auth import unique_email


# ── Helpers ────────────────────────────────────────────────────────────────────

async def auth_headers_and_project(client) -> tuple[dict, dict]:
    """Sign up, create an active project, return (headers, project)."""
    email = unique_email()
    with patch("app.routers.auth.send_verification_email", new_callable=MagicMock), \
         patch("app.routers.auth.subscribe_contact", new_callable=AsyncMock):
        res = await client.post("/api/auth/signup", json={
            "email": email, "password": "TestPass123!", "name": "Test User"
        })
    data = res.json()
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    workspace_id = data["workspace"]["id"]

    project_res = await client.post("/api/projects", json={
        "name": "SDK Test Project",
        "page_url": "https://example.com",
        "platform": "html",
        "workspace_id": workspace_id,
    }, headers=headers)
    assert project_res.status_code == 200, project_res.text
    project = project_res.json()

    # Activate so SDK returns rules (draft projects return empty rules)
    await client.put(f"/api/projects/{project['id']}", json={"status": "active"}, headers=headers)

    return headers, project


async def add_rule(client, headers, project_id, **overrides) -> dict:
    payload = {
        "name": "SDK Rule",
        "conditions": [{"signal": "page_view", "operator": "is detected", "value": ""}],
        "condition_operator": "AND",
        "actions": [{"type": "swap_text", "target_block": "#headline", "value": "Hello SDK"}],
        "priority": 0,
        **overrides,
    }
    res = await client.post(f"/api/projects/{project_id}/rules", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    rule = res.json()
    # Rules default to inactive — activate so the SDK returns them
    if overrides.get("is_active") is not False:
        await client.put(
            f"/api/projects/{project_id}/rules/{rule['id']}",
            json={"is_active": True},
            headers=headers,
        )
        rule["is_active"] = True
    return rule


# ── Tests ──────────────────────────────────────────────────────────────────────

async def test_sdk_ping_returns_hash(client):
    """GET /api/sdk/ping returns a rules_hash string for a known script_id."""
    headers, project = await auth_headers_and_project(client)
    script_id = project["script_id"]

    res = await client.get(f"/api/sdk/ping?script_id={script_id}")
    assert res.status_code == 200
    data = res.json()
    assert "rules_hash" in data
    assert isinstance(data["rules_hash"], str)
    assert len(data["rules_hash"]) > 0


async def test_sdk_ping_unknown_script_id(client):
    """GET /api/sdk/ping with an unknown script_id returns 404."""
    res = await client.get("/api/sdk/ping?script_id=PP-NOTREAL")
    assert res.status_code == 404


async def test_sdk_rules_returns_rules(client):
    """GET /api/sdk/rules returns rules + hash for an active project."""
    headers, project = await auth_headers_and_project(client)
    await add_rule(client, headers, project["id"])
    script_id = project["script_id"]

    res = await client.get(f"/api/sdk/rules?script_id={script_id}")
    assert res.status_code == 200
    data = res.json()
    assert "rules" in data
    assert "rules_hash" in data
    assert len(data["rules"]) == 1
    assert data["rules"][0]["name"] == "SDK Rule"
    assert data["rules"][0]["conditions"][0]["signal"] == "page_view"


async def test_sdk_rules_draft_project_returns_empty(client):
    """GET /api/sdk/rules for a draft project returns an empty rules list."""
    email = unique_email()
    with patch("app.routers.auth.send_verification_email", new_callable=MagicMock), \
         patch("app.routers.auth.subscribe_contact", new_callable=AsyncMock):
        res = await client.post("/api/auth/signup", json={
            "email": email, "password": "TestPass123!", "name": "Test User"
        })
    data = res.json()
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    workspace_id = data["workspace"]["id"]

    project_res = await client.post("/api/projects", json={
        "name": "Draft Project",
        "page_url": "https://draft.com",
        "platform": "html",
        "workspace_id": workspace_id,
    }, headers=headers)
    project = project_res.json()
    # stays draft — do not activate
    await add_rule(client, headers, project["id"])

    res = await client.get(f"/api/sdk/rules?script_id={project['script_id']}")
    assert res.status_code == 200
    assert res.json()["rules"] == []


async def test_sdk_ping_hash_changes_after_rule_edit(client):
    """Editing a rule changes the rules_hash returned by ping."""
    headers, project = await auth_headers_and_project(client)
    rule = await add_rule(client, headers, project["id"])
    script_id = project["script_id"]
    pid = project["id"]

    res1 = await client.get(f"/api/sdk/ping?script_id={script_id}")
    hash_before = res1.json()["rules_hash"]

    # Edit the rule to change its action value
    await client.put(f"/api/projects/{pid}/rules/{rule['id']}", json={
        "name": "SDK Rule",
        "conditions": [{"signal": "page_view", "operator": "is detected", "value": ""}],
        "condition_operator": "AND",
        "actions": [{"type": "swap_text", "target_block": "#headline", "value": "Changed!"}],
        "priority": 0,
        "is_active": True,
    }, headers=headers)

    res2 = await client.get(f"/api/sdk/ping?script_id={script_id}")
    hash_after = res2.json()["rules_hash"]

    assert hash_before != hash_after


async def test_sdk_rules_no_cache_header(client):
    """SDK rules endpoint sets Cache-Control: no-store."""
    headers, project = await auth_headers_and_project(client)
    res = await client.get(f"/api/sdk/rules?script_id={project['script_id']}")
    assert "no-store" in res.headers.get("cache-control", "")


async def test_sdk_ping_no_cache_header(client):
    """SDK ping endpoint sets Cache-Control: no-store."""
    headers, project = await auth_headers_and_project(client)
    res = await client.get(f"/api/sdk/ping?script_id={project['script_id']}")
    assert "no-store" in res.headers.get("cache-control", "")


async def test_sdk_rules_only_active_rules_returned(client):
    """Inactive rules are not returned by /api/sdk/rules."""
    headers, project = await auth_headers_and_project(client)
    pid = project["id"]

    active_rule = await add_rule(client, headers, pid, name="Active Rule")
    inactive_rule = await add_rule(client, headers, pid, name="Inactive Rule")

    # Deactivate the second rule
    await client.put(f"/api/projects/{pid}/rules/{inactive_rule['id']}", json={
        "is_active": False
    }, headers=headers)

    res = await client.get(f"/api/sdk/rules?script_id={project['script_id']}")
    rule_names = [r["name"] for r in res.json()["rules"]]
    assert "Active Rule" in rule_names
    assert "Inactive Rule" not in rule_names


async def test_sdk_rules_popup_config_resolved_live(client):
    """show_popup action in SDK rules returns live popup config, not a stale snapshot."""
    headers, project = await auth_headers_and_project(client)
    pid = project["id"]

    # Create a popup
    popup_res = await client.post("/api/popups", json={
        "name": "Live Popup",
        "config": {"position": "center", "bg_color": "#000000", "blocks": [], "frequency": "once"},
    }, headers=headers)
    popup = popup_res.json()
    popup_id = popup["id"]

    # Create a rule with show_popup action referencing this popup
    await add_rule(client, headers, pid,
        actions=[{"type": "show_popup", "target_block": "",
                  "value": json.dumps({"popup_id": popup_id})}],
    )

    # Update the popup config
    await client.put(f"/api/popups/{popup_id}", json={
        "config": {"position": "center", "bg_color": "#FF0000", "blocks": [], "frequency": "once"},
    }, headers=headers)

    # SDK rules should return the updated config
    res = await client.get(f"/api/sdk/rules?script_id={project['script_id']}")
    rule = res.json()["rules"][0]
    action_val = json.loads(rule["actions"][0]["value"])
    assert action_val["config"]["bg_color"] == "#FF0000"
