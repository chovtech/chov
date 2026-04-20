from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
import asyncio
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.database import get_pool, close_pool
from app.services.expiry_service import send_expiry_warning_emails
from app.routers import auth, users, webhooks, google_auth, projects, rules, sdk, upload, assets, popups, countdowns, analytics, sdk_analytics, workspaces, team, clients, ai, reports, billing, coins

logger = logging.getLogger(__name__)

async def _daily_expiry_task():
    """Runs once per day — sends grace period warning emails for expired plans."""
    await asyncio.sleep(60)  # short delay on startup to let the pool warm up
    while True:
        try:
            pool = await get_pool()
            async with pool.acquire() as db:
                await send_expiry_warning_emails(db)
            logger.info("Daily expiry email check complete")
        except Exception as exc:
            logger.error(f"Daily expiry task error: {exc}")
        await asyncio.sleep(24 * 60 * 60)  # 24 hours


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    print(f"✓ Connected to PostgreSQL")
    asyncio.create_task(_daily_expiry_task())
    yield
    await close_pool()
    print("✓ Database connections closed")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.usepagepersona.com",
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_origin_regex=r"https?://.*",  # SDK called from any external sales page
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Static files (pp.js SDK)
_static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
os.makedirs(_static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=_static_dir), name="static")

# Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(webhooks.router)
app.include_router(google_auth.router)
app.include_router(projects.router)
app.include_router(rules.router)
app.include_router(sdk.router)
app.include_router(upload.router)
app.include_router(assets.router)
app.include_router(popups.router)
app.include_router(countdowns.router)
app.include_router(analytics.router)
app.include_router(sdk_analytics.router)
app.include_router(workspaces.router)
app.include_router(team.router)
app.include_router(clients.router)
app.include_router(ai.router)
app.include_router(reports.router)
app.include_router(billing.router)
app.include_router(coins.router)

@app.get("/")
async def root():
    return {
        "product": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}
