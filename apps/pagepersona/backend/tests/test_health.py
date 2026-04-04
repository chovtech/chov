import pytest


@pytest.mark.asyncio
async def test_api_is_alive(client):
    response = await client.get("/health")
    assert response.status_code == 200
