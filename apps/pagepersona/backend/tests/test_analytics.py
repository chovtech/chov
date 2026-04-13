"""
Analytics endpoint tests — /api/analytics/project, /api/analytics/workspace,
/api/analytics/overview.

Strategy: seed real page_visits and rule_events via the public beacon endpoints
(/api/sdk/visit, /api/sdk/event), then assert the analytics aggregations are correct.
"""
import uuid
from unittest.mock import patch, AsyncMock, MagicMock
from tests.test_auth import unique_email


# ── Helpers ────────────────────────────────────────────────────────────────────

async def auth_headers_and_ids(client) -> tuple[dict, str, str]:
    """Sign up, create an active project. Returns (headers, workspace_id, project)."""
    email = unique_email()
    with patch("app.routers.auth.send_verification_email", new_callable=MagicMock), \
         patch("app.routers.auth.subscribe_contact", new_callable=AsyncMock):
        res = await client.post("/api/auth/signup", json={
            "email": email, "password": "TestPass123!", "name": "Test User"
        })
    data = res.json()
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    workspace_id = data["workspace"]["id"]

    proj_res = await client.post("/api/projects", json={
        "name": "Analytics Test Project",
        "page_url": "https://example.com",
        "platform": "html",
        "workspace_id": workspace_id,
    }, headers=headers)
    project = proj_res.json()

    # Activate project
    await client.put(f"/api/projects/{project['id']}", json={"status": "active"}, headers=headers)

    return headers, workspace_id, project


async def seed_visit(client, script_id, **overrides) -> str:
    """POST a visit beacon. Returns visit_id."""
    payload = {
        "project_id": script_id,
        "session_id": str(uuid.uuid4()),
        "country": "Nigeria",
        "device": "desktop",
        "browser": "Chrome",
        "is_new_visitor": True,
        **overrides,
    }
    res = await client.post("/api/sdk/visit", json=payload)
    assert res.status_code == 200, res.text
    return res.json()["visit_id"]


async def seed_rule(client, headers, project_id) -> str:
    """Create an active rule and return its id."""
    res = await client.post(f"/api/projects/{project_id}/rules", json={
        "name": "Analytics Rule",
        "conditions": [{"signal": "page_view", "operator": "is detected", "value": ""}],
        "condition_operator": "AND",
        "actions": [{"type": "swap_text", "target_block": "#h1", "value": "Hi"}],
        "priority": 0,
    }, headers=headers)
    rule = res.json()
    await client.put(f"/api/projects/{project_id}/rules/{rule['id']}",
                     json={"is_active": True}, headers=headers)
    return rule["id"]


async def seed_event(client, script_id, rule_id, session_id=None):
    """POST a rule-fired event beacon."""
    res = await client.post("/api/sdk/event", json={
        "project_id": script_id,
        "rule_id": rule_id,
        "session_id": session_id or str(uuid.uuid4()),
        "country": "Nigeria",
        "device": "desktop",
    })
    assert res.status_code == 200, res.text


# ── Tests ──────────────────────────────────────────────────────────────────────

async def test_project_analytics_empty(client):
    """Project analytics returns zeros when no visits have been recorded."""
    headers, workspace_id, project = await auth_headers_and_ids(client)

    res = await client.get(f"/api/analytics/project/{project['id']}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["headline"]["total_visits"] == 0
    assert data["headline"]["unique_visitors"] == 0
    assert data["headline"]["rules_fired"] == 0
    assert data["headline"]["personalisation_rate"] == 0
    assert isinstance(data["daily_series"], list)
    assert len(data["daily_series"]) > 0  # filled date range


async def test_project_analytics_counts_visits(client):
    """total_visits and unique_visitors reflect seeded beacons."""
    headers, workspace_id, project = await auth_headers_and_ids(client)
    script_id = project["script_id"]

    session_a = str(uuid.uuid4())
    session_b = str(uuid.uuid4())

    await seed_visit(client, script_id, session_id=session_a, is_new_visitor=True)
    await seed_visit(client, script_id, session_id=session_b, is_new_visitor=True)
    await seed_visit(client, script_id, session_id=session_a, is_new_visitor=False)  # returning

    res = await client.get(f"/api/analytics/project/{project['id']}", headers=headers)
    data = res.json()

    assert data["headline"]["total_visits"] == 3
    assert data["headline"]["unique_visitors"] == 2
    assert data["headline"]["new_visitors"] == 2


async def test_project_analytics_counts_rules_fired(client):
    """rules_fired and personalisation_rate reflect seeded rule events."""
    headers, workspace_id, project = await auth_headers_and_ids(client)
    script_id = project["script_id"]
    rule_id = await seed_rule(client, headers, project["id"])

    await seed_visit(client, script_id)
    await seed_visit(client, script_id)
    await seed_event(client, script_id, rule_id)

    res = await client.get(f"/api/analytics/project/{project['id']}", headers=headers)
    data = res.json()

    assert data["headline"]["rules_fired"] == 1
    assert data["headline"]["total_visits"] == 2
    assert data["headline"]["personalisation_rate"] == 50.0


async def test_project_analytics_period_filter(client):
    """period query param is returned in the response."""
    headers, workspace_id, project = await auth_headers_and_ids(client)

    res = await client.get(
        f"/api/analytics/project/{project['id']}?period=7", headers=headers
    )
    assert res.status_code == 200
    assert res.json()["period"] == 7


async def test_project_analytics_response_shape(client):
    """Response contains all expected top-level keys."""
    headers, workspace_id, project = await auth_headers_and_ids(client)

    res = await client.get(f"/api/analytics/project/{project['id']}", headers=headers)
    data = res.json()

    assert "headline" in data
    assert "daily_series" in data
    assert "top_countries" in data
    assert "traffic_sources" in data
    assert "device_split" in data
    assert "visitor_split" in data
    assert "rules_performance" in data
    assert "recent_visits" in data


async def test_project_analytics_traffic_sources(client):
    """traffic_sources aggregates utm_source correctly."""
    headers, workspace_id, project = await auth_headers_and_ids(client)
    script_id = project["script_id"]

    await seed_visit(client, script_id, utm_source="google")
    await seed_visit(client, script_id, utm_source="google")
    await seed_visit(client, script_id, utm_source="facebook")

    res = await client.get(f"/api/analytics/project/{project['id']}", headers=headers)
    sources = {s["source"]: s["visits"] for s in res.json()["traffic_sources"]}

    assert sources.get("google") == 2
    assert sources.get("facebook") == 1


async def test_project_analytics_device_split(client):
    """device_split groups visits by device type."""
    headers, workspace_id, project = await auth_headers_and_ids(client)
    script_id = project["script_id"]

    await seed_visit(client, script_id, device="desktop")
    await seed_visit(client, script_id, device="desktop")
    await seed_visit(client, script_id, device="mobile")

    res = await client.get(f"/api/analytics/project/{project['id']}", headers=headers)
    devices = {d["device"]: d["visits"] for d in res.json()["device_split"]}

    assert devices.get("desktop") == 2
    assert devices.get("mobile") == 1


async def test_project_analytics_cannot_access_other_users(client):
    """Project analytics returns 404 for a project owned by another user."""
    headers_a, _, project_a = await auth_headers_and_ids(client)
    headers_b, _, _ = await auth_headers_and_ids(client)

    res = await client.get(f"/api/analytics/project/{project_a['id']}", headers=headers_b)
    assert res.status_code == 404


async def test_workspace_analytics_empty(client):
    """Workspace analytics returns zeros when no visits recorded."""
    headers, workspace_id, project = await auth_headers_and_ids(client)

    res = await client.get(f"/api/analytics/workspace/{workspace_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["headline"]["total_visits"] == 0
    assert data["headline"]["rules_fired"] == 0
    assert isinstance(data["project_performance"], list)


async def test_workspace_analytics_aggregates_across_projects(client):
    """Workspace analytics sums visits from all projects in the workspace."""
    headers, workspace_id, project1 = await auth_headers_and_ids(client)

    # Create a second project in the same workspace
    proj2_res = await client.post("/api/projects", json={
        "name": "Second Project",
        "page_url": "https://second.com",
        "platform": "html",
        "workspace_id": workspace_id,
    }, headers=headers)
    project2 = proj2_res.json()
    await client.put(f"/api/projects/{project2['id']}", json={"status": "active"}, headers=headers)

    await seed_visit(client, project1["script_id"])
    await seed_visit(client, project1["script_id"])
    await seed_visit(client, project2["script_id"])

    res = await client.get(f"/api/analytics/workspace/{workspace_id}", headers=headers)
    data = res.json()

    assert data["headline"]["total_visits"] == 3
    assert len(data["project_performance"]) == 2


async def test_overview_analytics(client):
    """GET /api/analytics/overview resolves workspace from auth token."""
    headers, workspace_id, project = await auth_headers_and_ids(client)
    await seed_visit(client, project["script_id"])

    res = await client.get("/api/analytics/overview", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "headline" in data
    assert data["headline"]["total_visits"] >= 1


async def test_sdk_visit_beacon(client):
    """POST /api/sdk/visit records a visit and returns a visit_id."""
    headers, workspace_id, project = await auth_headers_and_ids(client)
    session = str(uuid.uuid4())

    res = await client.post("/api/sdk/visit", json={
        "project_id": project["script_id"],
        "session_id": session,
        "country": "Nigeria",
        "device": "desktop",
        "browser": "Chrome",
        "is_new_visitor": True,
    })
    assert res.status_code == 200
    assert res.json()["ok"] is True
    assert "visit_id" in res.json()


async def test_sdk_event_beacon(client):
    """POST /api/sdk/event records a rule-fired event."""
    headers, workspace_id, project = await auth_headers_and_ids(client)
    rule_id = await seed_rule(client, headers, project["id"])

    res = await client.post("/api/sdk/event", json={
        "project_id": project["script_id"],
        "rule_id": rule_id,
        "session_id": str(uuid.uuid4()),
    })
    assert res.status_code == 200
    assert res.json()["ok"] is True


async def test_sdk_visit_unknown_script_id(client):
    """Visit beacon with unknown script_id returns 404."""
    res = await client.post("/api/sdk/visit", json={
        "project_id": "PP-NOTREAL",
        "session_id": str(uuid.uuid4()),
    })
    assert res.status_code == 404
