from fastapi import APIRouter, Depends, HTTPException
import asyncpg
from app.database import get_db
from app.core.security import get_current_user
from app.schemas.rules import RuleCreate, RuleResponse, RuleUpdate
from app.services.rules_service import (
    create_rule, get_rules, get_rule, update_rule, delete_rule
)
from app.core.plan_limits import enforce_plan_limit

router = APIRouter(prefix="/api/projects/{project_id}/rules", tags=["rules"])


async def verify_project_access(project_id: str, current_user: dict, db: asyncpg.Connection):
    """Return the project if the user can access it (as owner or active team member)."""
    row = await db.fetchrow(
        """SELECT p.* FROM projects p
           JOIN workspaces w ON p.workspace_id = w.id
           WHERE p.id = $1 AND (
               w.owner_id = $2
               OR EXISTS (
                   SELECT 1 FROM workspace_members wm
                   WHERE wm.workspace_id = w.id AND wm.user_id = $2
                     AND wm.status = 'active' AND wm.role != 'revoked'
               )
           )""",
        project_id, current_user['id']
    )
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return dict(row)


@router.post("", response_model=RuleResponse)
async def create(
    project_id: str,
    body: RuleCreate,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    project = await verify_project_access(project_id, current_user, db)
    await enforce_plan_limit("rules_per_project", project_id, db, str(project['workspace_id']))
    rule = await create_rule(
        db=db,
        project_id=project_id,
        name=body.name,
        conditions=body.conditions,
        condition_operator=body.condition_operator,
        actions=body.actions,
        priority=body.priority,
        element_mapped=body.element_mapped
    )
    return rule


@router.get("", response_model=list[RuleResponse])
async def list_rules(
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    return await get_rules(db, project_id)


@router.get("/{rule_id}", response_model=RuleResponse)
async def get_one(
    project_id: str,
    rule_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    rule = await get_rule(db, rule_id, project_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.put("/{rule_id}", response_model=RuleResponse)
async def update(
    project_id: str,
    rule_id: str,
    body: RuleUpdate,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    rule = await update_rule(
        db, rule_id, project_id,
        name=body.name,
        conditions=body.conditions,
        condition_operator=body.condition_operator,
        actions=body.actions,
        priority=body.priority,
        is_active=body.is_active,
        element_mapped=body.element_mapped
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.delete("/{rule_id}")
async def delete(
    project_id: str,
    rule_id: str,
    db: asyncpg.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    deleted = await delete_rule(db, rule_id, project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"message": "Rule deleted"}
