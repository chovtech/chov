from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.database import get_pool, close_pool
from app.routers import auth, users, webhooks, google_auth, projects

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
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(webhooks.router)
app.include_router(google_auth.router)
app.include_router(projects.router)

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
