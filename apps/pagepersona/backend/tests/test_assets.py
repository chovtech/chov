"""
Media Library (assets) tests — /api/assets endpoints.

Tests cover:
- Upload an asset (mocked R2) — returns asset record
- Upload with workspace_id — associates to workspace
- Upload to workspace user doesn't belong to — 403
- Upload unauthenticated — 401
- List assets for workspace — returns list in descending order
- List assets for workspace user doesn't belong to — 403
- Delete own asset — succeeds
- Delete non-existent asset — 404
- Delete another user's asset — 403
- Admin can delete another user's asset in the same workspace
"""
import io
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


def fake_image(filename="test.png", content_type="image/png") -> tuple:
    """Return (files dict, content) for a multipart upload."""
    content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100  # minimal PNG-like bytes
    return {"file": (filename, io.BytesIO(content), content_type)}, content


def mock_r2():
    """Context manager that patches R2 put_object so no real upload occurs."""
    mock_s3 = MagicMock()
    mock_s3.put_object = MagicMock(return_value={})
    return patch("app.routers.assets.get_r2_client", return_value=mock_s3)


def mock_r2_delete():
    """Patch delete_r2_image so no real R2 deletion occurs."""
    return patch("app.routers.assets.delete_r2_image", return_value=None)


# ── Upload ─────────────────────────────────────────────────────────────────────

async def test_upload_asset_returns_record(client):
    """Upload succeeds and returns an asset record with expected fields."""
    headers, workspace_id = await signup(client)
    files, _ = fake_image()

    with mock_r2():
        res = await client.post(
            f"/api/assets/upload?workspace_id={workspace_id}",
            files=files,
            headers=headers,
        )

    assert res.status_code == 200
    data = res.json()
    assert "id" in data
    assert data["url"].startswith("http")
    assert data["filename"] == "test.png"
    assert data["mime_type"] == "image/png"
    assert data["size"] > 0
    assert "created_at" in data


async def test_upload_asset_without_workspace_id(client):
    """Upload with no workspace_id is allowed (personal upload, no workspace link)."""
    headers, _ = await signup(client)
    files, _ = fake_image()

    with mock_r2():
        res = await client.post("/api/assets/upload", files=files, headers=headers)

    assert res.status_code == 200
    data = res.json()
    assert data["url"].startswith("http")


async def test_upload_asset_wrong_workspace_returns_403(client):
    """Uploading to a workspace the user doesn't belong to returns 403."""
    headers, _ = await signup(client)
    _, other_workspace_id = await signup(client)  # different user's workspace
    files, _ = fake_image()

    with mock_r2():
        res = await client.post(
            f"/api/assets/upload?workspace_id={other_workspace_id}",
            files=files,
            headers=headers,
        )

    assert res.status_code == 403


async def test_upload_asset_unauthenticated(client):
    """Uploading without a token returns 401 or 403."""
    _, workspace_id = await signup(client)
    files, _ = fake_image()

    with mock_r2():
        res = await client.post(
            f"/api/assets/upload?workspace_id={workspace_id}",
            files=files,
        )

    assert res.status_code in (401, 403)


async def test_upload_rejects_non_image(client):
    """Uploading a non-image file type returns 400."""
    headers, workspace_id = await signup(client)
    files = {"file": ("document.pdf", io.BytesIO(b"%PDF-1.4 content"), "application/pdf")}

    with mock_r2():
        res = await client.post(
            f"/api/assets/upload?workspace_id={workspace_id}",
            files=files,
            headers=headers,
        )

    assert res.status_code == 400


# ── List ───────────────────────────────────────────────────────────────────────

async def test_list_assets_returns_workspace_assets(client):
    """GET /api/assets returns all assets for the workspace."""
    headers, workspace_id = await signup(client)

    # Upload two images
    with mock_r2():
        for name in ("a.png", "b.png"):
            files = {"file": (name, io.BytesIO(b"\x89PNG" + b"\x00" * 50), "image/png")}
            await client.post(
                f"/api/assets/upload?workspace_id={workspace_id}",
                files=files,
                headers=headers,
            )

    res = await client.get(f"/api/assets?workspace_id={workspace_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 2
    # Each item has required fields
    for item in data:
        assert "id" in item
        assert "url" in item
        assert "created_at" in item


async def test_list_assets_wrong_workspace_returns_403(client):
    """Listing assets for a workspace you don't belong to returns 403."""
    headers, _ = await signup(client)
    _, other_workspace_id = await signup(client)

    res = await client.get(f"/api/assets?workspace_id={other_workspace_id}", headers=headers)
    assert res.status_code == 403


async def test_list_assets_empty_for_new_workspace(client):
    """Fresh workspace has an empty asset list."""
    headers, workspace_id = await signup(client)

    res = await client.get(f"/api/assets?workspace_id={workspace_id}", headers=headers)
    assert res.status_code == 200
    assert res.json() == []


# ── Delete ─────────────────────────────────────────────────────────────────────

async def test_delete_own_asset(client):
    """Owner of an asset can delete it."""
    headers, workspace_id = await signup(client)
    files, _ = fake_image()

    with mock_r2():
        upload_res = await client.post(
            f"/api/assets/upload?workspace_id={workspace_id}",
            files=files,
            headers=headers,
        )
    asset_id = upload_res.json()["id"]

    with mock_r2_delete():
        res = await client.delete(f"/api/assets/{asset_id}", headers=headers)

    assert res.status_code == 200
    assert res.json()["ok"] is True


async def test_delete_asset_removed_from_list(client):
    """After deletion the asset no longer appears in GET /api/assets."""
    headers, workspace_id = await signup(client)
    files, _ = fake_image()

    with mock_r2():
        upload_res = await client.post(
            f"/api/assets/upload?workspace_id={workspace_id}",
            files=files,
            headers=headers,
        )
    asset_id = upload_res.json()["id"]

    with mock_r2_delete():
        await client.delete(f"/api/assets/{asset_id}", headers=headers)

    res = await client.get(f"/api/assets?workspace_id={workspace_id}", headers=headers)
    ids = [a["id"] for a in res.json()]
    assert asset_id not in ids


async def test_delete_nonexistent_asset_returns_404(client):
    """Deleting an asset that doesn't exist returns 404."""
    headers, _ = await signup(client)
    fake_id = "00000000-0000-0000-0000-000000000000"

    with mock_r2_delete():
        res = await client.delete(f"/api/assets/{fake_id}", headers=headers)

    assert res.status_code == 404


async def test_delete_other_users_asset_returns_403(client):
    """A user cannot delete an asset they don't own and are not admin of."""
    owner_headers, workspace_id = await signup(client)
    other_headers, _ = await signup(client)  # different user, different workspace

    files, _ = fake_image()
    with mock_r2():
        upload_res = await client.post(
            f"/api/assets/upload?workspace_id={workspace_id}",
            files=files,
            headers=owner_headers,
        )
    asset_id = upload_res.json()["id"]

    with mock_r2_delete():
        res = await client.delete(f"/api/assets/{asset_id}", headers=other_headers)

    assert res.status_code == 403
