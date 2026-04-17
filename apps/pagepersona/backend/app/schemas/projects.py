from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime
import uuid

class ProjectCreate(BaseModel):
    name: str
    page_url: str
    platform: str = 'html'
    workspace_id: Optional[str] = None
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    page_url: str
    platform: str
    script_id: str
    script_verified: bool
    status: str
    thumbnail_url: Optional[str] = None
    description: Optional[str] = None
    page_scan: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    script_verified: Optional[bool] = None
    page_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    platform: Optional[str] = None
    description: Optional[str] = None
