"""
backend/schemas.py
Shared Pydantic v2 models for request/response validation.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ---------- Auth ----------

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


# ---------- User ----------

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: Optional[str] = None
    language: str
    income_type: Optional[str] = None
    onboarding_complete: bool
    created_at: datetime


# Needed because TokenResponse references UserResponse before it's defined above it.
TokenResponse.model_rebuild()


# ---------- Generic ----------

class MessageResponse(BaseModel):
    message: str

class ScamShieldRequest(BaseModel):
    message: str


class ScamShieldResponse(BaseModel):
    risk_percentage: int
    verdict: str  # "risky" | "safe"
    explanations: list[str]
