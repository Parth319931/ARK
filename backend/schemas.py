"""
backend/schemas.py
Shared Pydantic v2 models for request/response validation.
"""
from datetime import datetime
from typing import Optional
from typing import List, Literal
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



# ---------- Onboarding ----------

IncomeSource = Literal["salaried", "gig", "farmer", "pwd", "retired"]
IncomeRegularity = Literal["fixed_monthly", "weekly", "irregular_gig", "seasonal"]
WorryTag = Literal[
    "scams", "loans", "savings", "investments", "govt_schemes", "income_uncertainty"
]


class OnboardingRequest(BaseModel):
    income_source: IncomeSource

    monthly_income: int = Field(ge=0)
    income_regularity: IncomeRegularity
    monthly_expenses: int = Field(ge=0)
    existing_emi: int = Field(ge=0, default=0)
    has_emergency_fund: bool = False
    dependents_count: int = Field(ge=0, default=0)

    top_worries: List[WorryTag] = Field(min_length=1, max_length=3)


class FinancialProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    income_source: str
    monthly_income: int
    income_regularity: str
    monthly_expenses: int
    existing_emi: int
    has_emergency_fund: bool
    dependents_count: int
    top_worries: List[str]
    created_at: datetime
    updated_at: datetime


class OnboardingStatusResponse(BaseModel):
    onboarding_complete: bool
    profile: Optional[FinancialProfileResponse] = None
