"""
backend/routes/accessibility.py
GET/PUT /api/accessibility — per-user accessibility preferences,
synced across devices/logins.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from db import get_db
from models import AccessibilitySettings, User
from schemas import AccessibilitySettingsRequest, AccessibilitySettingsResponse

router = APIRouter(prefix="/accessibility", tags=["accessibility"])


@router.get("", response_model=AccessibilitySettingsResponse)
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = (
        db.query(AccessibilitySettings)
        .filter(AccessibilitySettings.user_id == current_user.id)
        .first()
    )
    if not settings:
        # Defaults if user has never saved anything yet.
        return AccessibilitySettingsResponse(
            senior_mode=False, text_size="normal", high_contrast=0, dyslexia_mode=0
        )
    return AccessibilitySettingsResponse(
        senior_mode=settings.senior_mode,
        text_size=settings.text_size,
        high_contrast=settings.high_contrast,
        dyslexia_mode=settings.dyslexia_mode,
    )


@router.put("", response_model=AccessibilitySettingsResponse)
def update_settings(
    body: AccessibilitySettingsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = (
        db.query(AccessibilitySettings)
        .filter(AccessibilitySettings.user_id == current_user.id)
        .first()
    )
    if not settings:
        settings = AccessibilitySettings(user_id=current_user.id)
        db.add(settings)

    settings.senior_mode = body.senior_mode
    settings.text_size = body.text_size
    settings.high_contrast = body.high_contrast
    settings.dyslexia_mode = body.dyslexia_mode

    db.commit()
    db.refresh(settings)

    return AccessibilitySettingsResponse(
        senior_mode=settings.senior_mode,
        text_size=settings.text_size,
        high_contrast=settings.high_contrast,
        dyslexia_mode=settings.dyslexia_mode,
    )