"""
backend/routes/memory.py
Onboarding / Guardian Memory foundation route(s).

Data flow:
- POST /api/memory/onboarding: reads OnboardingRequest from body, writes a
  FinancialProfile row (create or update, one per user) and flips
  User.onboarding_complete = True. This snapshot is what Future Self,
  Government Scheme matching, and the financial health score will read from.
- GET /api/memory/onboarding: returns the current user's onboarding status +
  profile (used to resume onboarding or hydrate Guardian Memory/Dashboard).

PROTECTED: identity always comes from Depends(get_current_user), never the body.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from db import get_db
from models import User, FinancialProfile
from schemas import (
    OnboardingRequest,
    FinancialProfileResponse,
    OnboardingStatusResponse,
)
from auth import get_current_user

router = APIRouter(prefix="/api/memory", tags=["memory"])


def _to_response(profile: FinancialProfile) -> FinancialProfileResponse:
    return FinancialProfileResponse(
        income_source=profile.income_source,
        monthly_income=profile.monthly_income,
        income_regularity=profile.income_regularity,
        monthly_expenses=profile.monthly_expenses,
        existing_emi=profile.existing_emi,
        has_emergency_fund=profile.has_emergency_fund,
        dependents_count=profile.dependents_count,
        top_worries=profile.top_worries.split(",") if profile.top_worries else [],
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.post(
    "/onboarding",
    response_model=FinancialProfileResponse,
    status_code=status.HTTP_200_OK,
)
def submit_onboarding(
    payload: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(FinancialProfile)
        .filter(FinancialProfile.user_id == current_user.id)
        .first()
    )

    worries_str = ",".join(payload.top_worries)

    if profile:
        profile.income_source = payload.income_source
        profile.monthly_income = payload.monthly_income
        profile.income_regularity = payload.income_regularity
        profile.monthly_expenses = payload.monthly_expenses
        profile.existing_emi = payload.existing_emi
        profile.has_emergency_fund = payload.has_emergency_fund
        profile.dependents_count = payload.dependents_count
        profile.top_worries = worries_str
    else:
        profile = FinancialProfile(
            user_id=current_user.id,
            income_source=payload.income_source,
            monthly_income=payload.monthly_income,
            income_regularity=payload.income_regularity,
            monthly_expenses=payload.monthly_expenses,
            existing_emi=payload.existing_emi,
            has_emergency_fund=payload.has_emergency_fund,
            dependents_count=payload.dependents_count,
            top_worries=worries_str,
        )
        db.add(profile)

    # Keep User.income_type roughly in sync for any code already reading it
    current_user.income_type = payload.income_source
    current_user.onboarding_complete = True

    db.commit()
    db.refresh(profile)

    return _to_response(profile)


@router.get("/onboarding", response_model=OnboardingStatusResponse)
def get_onboarding_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(FinancialProfile)
        .filter(FinancialProfile.user_id == current_user.id)
        .first()
    )

    return OnboardingStatusResponse(
        onboarding_complete=current_user.onboarding_complete,
        profile=_to_response(profile) if profile else None,
    )