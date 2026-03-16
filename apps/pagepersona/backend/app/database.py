import asyncpg
from app.core.config import settings

# Connection pool — reuses connections efficiently
_pool = None

async def get_pool():
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            settings.DATABASE_URL,
            min_size=2,
            max_size=10
        )
    return _pool

async def get_db():
    pool = await get_pool()
    async with pool.acquire() as connection:
        yield connection

async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
