from fastapi import APIRouter, Depends, HTTPException
import asyncpg
from app.database import get_db
from app.core.security import get_current_user
from app.schemas.projects import ProjectCreate, ProjectResponse, ProjectUpdate
from app.routers.upload import delete_r2_image
from app.services.email_service import send_install_email
from pydantic import BaseModel, EmailStr
from app.services.project_service import (
    create_project, get_projects, get_project,
    update_project, delete_project
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse)
async def create(
    body: ProjectCreate,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Get workspace for this user
    workspace = await db.fetchrow(
        "SELECT id FROM workspaces WHERE owner_id = $1",
        current_user['id']
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    project = await create_project(
        db=db,
        workspace_id=str(workspace['id']),
        name=body.name,
        page_url=body.page_url,
        platform=body.platform
    )
    return project


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace = await db.fetchrow(
        "SELECT id FROM workspaces WHERE owner_id = $1",
        current_user['id']
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    projects = await get_projects(db, str(workspace['id']))
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_one(
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace = await db.fetchrow(
        "SELECT id FROM workspaces WHERE owner_id = $1",
        current_user['id']
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    project = await get_project(db, project_id, str(workspace['id']))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update(
    project_id: str,
    body: ProjectUpdate,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace = await db.fetchrow(
        "SELECT id FROM workspaces WHERE owner_id = $1",
        current_user['id']
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if body.thumbnail_url:
        existing = await get_project(db, project_id, str(workspace['id']))
        if existing and existing['thumbnail_url']:
            delete_r2_image(existing['thumbnail_url'])

    project = await update_project(
        db, project_id, str(workspace['id']),
        name=body.name,
        status=body.status,
        script_verified=body.script_verified,
        page_url=body.page_url,
        thumbnail_url=body.thumbnail_url
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}")
async def delete(
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace = await db.fetchrow(
        "SELECT id FROM workspaces WHERE owner_id = $1",
        current_user['id']
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    deleted = await delete_project(db, project_id, str(workspace['id']))
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted"}


class SendInstallEmailRequest(BaseModel):
    developer_email: EmailStr

@router.post("/{project_id}/send-install-email")
async def send_install_email_endpoint(
    project_id: str,
    body: SendInstallEmailRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    workspace = await db.fetchrow(
        "SELECT id FROM workspaces WHERE owner_id = $1",
        current_user['id']
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    project = await get_project(db, project_id, str(workspace['id']))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    script_tag = f'<script async src="https://cdn.usepagepersona.com/pp.js?id={project["script_id"]}"></script>'
    lang = current_user.get('language', 'en')
    sent = send_install_email(body.developer_email, script_tag, project['name'], lang)
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send email")
    return {"message": "Installation email sent"}
