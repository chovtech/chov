from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# ── REQUEST SCHEMAS (what the frontend sends) ──────────

class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class MagicLinkRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# ── RESPONSE SCHEMAS (what we send back) ───────────────

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    avatar_url: Optional[str]
    email_verified: bool
    created_at: datetime

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
    workspace: WorkspaceResponse

class MessageResponse(BaseModel):
    message: str
