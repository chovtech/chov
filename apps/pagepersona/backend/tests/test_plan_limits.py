"""
Tests for plan limit enforcement on create endpoints.
Trial plan: 1 project, 3 rules/project, 1 popup, 1 countdown.
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from tests.test_auth import unique_email


async def _signup(client) -> tuple[dict, str]:
    email = unique_email()
    with patch("app.routers.auth.send_verification_email", new_callable=MagicMock), \
         patch("app.routers.auth.subscribe_contact", new_callable=AsyncMock):
        res = await client.post("/api/auth/signup", json={
            "email": email,
            "password": "TestPass123!",
            "name": "Limit Tester"
        })
    data = res.json()
    return {"Authorization": f"Bearer {data['access_token']}"}, data["workspace"]["id"]


async def _create_project(client, headers, workspace_id, name="P", url="https://ex.com"):
    return await client.post("/api/projects", json={
        "name": name, "page_url": url, "platform": "html", "workspace_id": workspace_id
    }, headers=headers)


async def _create_rule(client, headers, project_id, name="R"):
    return await client.post(f"/api/projects/{project_id}/rules", json={
        "name": name, "conditions": [], "actions": [], "priority": 0
    }, headers=headers)


async def _create_popup(client, headers, workspace_id, name="Popup"):
    return await client.post("/api/popups", json={
        "name": name, "workspace_id": workspace_id
    }, headers=headers)


async def _create_countdown(client, headers, workspace_id, name="CD"):
    return await client.post("/api/countdowns", json={
        "name": name, "workspace_id": workspace_id
    }, headers=headers)


# ── Projects ──────────────────────────────────────────────────────────────────

async def test_trial_project_limit(client):
    headers, workspace_id = await _signup(client)

    # Trial allows 1 project
    r1 = await _create_project(client, headers, workspace_id, "P1", "https://p1.com")
    assert r1.status_code == 200

    r2 = await _create_project(client, headers, workspace_id, "P2", "https://p2.com")
    assert r2.status_code == 402
    body = r2.json()
    assert body["detail"]["error"] == "plan_limit_reached"
    assert body["detail"]["resource"] == "projects"
    assert body["detail"]["limit"] == 1
    assert body["detail"]["plan"] == "trial"


# ── Rules ─────────────────────────────────────────────────────────────────────

async def test_trial_rules_per_project_limit(client):
    headers, workspace_id = await _signup(client)

    r = await _create_project(client, headers, workspace_id, "RuleTest", "https://rules.com")
    assert r.status_code == 200
    project_id = r.json()["id"]

    # Trial allows 3 rules
    for i in range(3):
        res = await _create_rule(client, headers, project_id, f"Rule {i}")
        assert res.status_code == 200, res.text

    res = await _create_rule(client, headers, project_id, "Rule 4 — over limit")
    assert res.status_code == 402
    body = res.json()
    assert body["detail"]["error"] == "plan_limit_reached"
    assert body["detail"]["resource"] == "rules_per_project"
    assert body["detail"]["limit"] == 3


# ── Popups ────────────────────────────────────────────────────────────────────

async def test_trial_popup_limit(client):
    headers, workspace_id = await _signup(client)

    r1 = await _create_popup(client, headers, workspace_id, "Pop1")
    assert r1.status_code == 200

    r2 = await _create_popup(client, headers, workspace_id, "Pop2")
    assert r2.status_code == 402
    body = r2.json()
    assert body["detail"]["error"] == "plan_limit_reached"
    assert body["detail"]["resource"] == "popups"
    assert body["detail"]["limit"] == 1


# ── Countdowns ────────────────────────────────────────────────────────────────

async def test_trial_countdown_limit(client):
    headers, workspace_id = await _signup(client)

    r1 = await _create_countdown(client, headers, workspace_id, "CD1")
    assert r1.status_code == 200

    r2 = await _create_countdown(client, headers, workspace_id, "CD2")
    assert r2.status_code == 402
    body = r2.json()
    assert body["detail"]["error"] == "plan_limit_reached"
    assert body["detail"]["resource"] == "countdowns"
    assert body["detail"]["limit"] == 1
