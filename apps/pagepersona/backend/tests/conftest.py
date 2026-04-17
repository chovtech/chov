import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import get_pool


@pytest.fixture(scope="session")
def event_loop():
    """Single event loop for the whole test session — required by asyncpg pool."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def client():
    """Single HTTP client for the whole session — keeps the DB pool alive."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture(scope="session")
async def db():
    """Raw asyncpg connection for direct DB assertions in tests."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn
