from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.database import get_pool, close_pool
from app.routers import auth, users, webhooks, google_auth, projects, rules, sdk, upload, popups

@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    print(f"✓ Connected to PostgreSQL")
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
    allow_origins=["*"],  # SDK endpoints called from external sales pages
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
app.include_router(popups.router)

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
