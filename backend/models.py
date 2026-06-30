"""
backend/models.py
SQLAlchemy ORM models for ArthaRakshak.

FOUNDATION SCOPE: only the User model is defined here for now.
Feature tables (ScamHistory, GuardianScore, VoiceHistory, SchemeMatch,
ChatHistory, SimulatorRun, etc.) will be added later in their own
feature-route files, but MUST follow this same pattern:

    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)

NEVER use a string device_id to scope per-user data. The JWT (via
get_current_user) is the only source of truth for identity.
"""
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)

    # Onboarding / profile fields used across the app (kept lightweight here;
    # feature-specific profile detail can live in a separate table later).
    language = Column(String, default="en", nullable=False)
    income_type = Column(String, nullable=True)  # e.g. "salaried", "gig", "student"
    onboarding_complete = Column(Boolean, default=False, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Future relationships (uncomment as feature tables are added):
    # scam_history = relationship("ScamHistory", back_populates="user", cascade="all, delete-orphan")
    # guardian_score = relationship("GuardianScore", back_populates="user", uselist=False, cascade="all, delete-orphan")
    # voice_history = relationship("VoiceHistory", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"

# ---------- Onboarding / Guardian Memory foundation ----------

class FinancialProfile(Base):
    """
    Created once per user during onboarding. Feeds Guardian Memory,
    Future Self simulator, Government Scheme matching, and the
    financial health score calculation.
    """
    __tablename__ = "financial_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False, unique=True)

    # Onboarding Page 1 — How do you earn?
    income_source = Column(String, nullable=False)
    # one of: "salaried", "gig", "farmer", "pwd", "retired"

    # Onboarding Page 2 — Tell us about your money
    monthly_income = Column(Integer, nullable=False)
    income_regularity = Column(String, nullable=False)
    # one of: "fixed_monthly", "weekly", "irregular_gig", "seasonal"
    monthly_expenses = Column(Integer, nullable=False)
    existing_emi = Column(Integer, nullable=False, default=0)
    has_emergency_fund = Column(Boolean, nullable=False, default=False)
    dependents_count = Column(Integer, nullable=False, default=0)

    # Onboarding Page 3 — What worries you most? (max 3)
    # Stored as a comma-joined string of slugs, e.g. "scams,loans,savings"
    top_worries = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", backref="financial_profile", uselist=False)

    def __repr__(self):
        return f"<FinancialProfile user_id={self.user_id} income_source={self.income_source}>"
