from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
import uuid


class RuleCreate(BaseModel):
    name: str
    conditions: List[Any] = []
    condition_operator: str = 'AND'
    actions: List[Any] = []
    priority: int = 0


class RuleResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    conditions: List[Any]
    condition_operator: str
    actions: List[Any]
    priority: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    conditions: Optional[List[Any]] = None
    condition_operator: Optional[str] = None
    actions: Optional[List[Any]] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
