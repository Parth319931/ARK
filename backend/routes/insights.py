"""
backend/routes/insights.py
Dashboard score calculation + LLM-generated "financial twin" insights.

Data flow:
- Reads FinancialProfile (written during onboarding) for the current user.
- GET /api/insights/dashboard: pure-math scores + income/expense/savings
  figures. No LLM call — fast, safe to load on every dashboard visit.
- POST /api/insights/twin: same scores, fed into ask_llm() to generate a
  short behavioral-finance "digital twin" profile. Triggered on demand
  (the "View Insights" button) rather than on page load, since LLM calls
  are slow and this data doesn't need to be persisted yet.

PROTECTED: identity always comes from Depends(get_current_user).

SCORE METHODOLOGY (documented inline below, in compute_scores()):
- cash_flow: how much monthly surplus exists relative to income.
- savings: emergency fund presence + savings rate.
- scam_safety: baseline heuristic — there's no ScamHistory table yet, so
  this is intentionally conservative and clearly marked TODO. Once Scam
  Shield has real pass/fail history, swap this for an actual computed rate.
- guardian_score: blends the three above with schemes/trusted-circle held
  at a neutral 50 until those features exist (also marked TODO).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
from models import User, FinancialProfile
from schemas import (
    DashboardSummaryResponse,
    FinancialScoreBreakdown,
    TwinInsightsResponse,
)
from auth import get_current_user
from llm import ask_llm, LLMError

router = APIRouter(prefix="/api/insights", tags=["insights"])


def _clamp(value: float, lo: float = 0, hi: float = 100) -> int:
    return int(round(max(lo, min(hi, value))))


def _get_profile_or_404(current_user: User, db: Session) -> FinancialProfile:
    profile = (
        db.query(FinancialProfile)
        .filter(FinancialProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="onboarding_not_complete",
        )
    return profile


def compute_scores(profile: FinancialProfile) -> dict:
    income = profile.monthly_income
    expenses = profile.monthly_expenses
    emi = profile.existing_emi
    net = income - expenses - emi
    worries = profile.top_worries.split(",") if profile.top_worries else []

    # ---- Cash flow score ----
    # Saving >=30% of income after EMI => excellent (100).
    # 0% to 30% scales linearly from 50 to 100.
    # Negative (spending more than earning) drags down fast toward 0.
    if income <= 0:
        cash_flow = 0
    else:
        ratio = net / income
        if ratio >= 0.3:
            cash_flow = 100
        elif ratio >= 0:
            cash_flow = 50 + (ratio / 0.3) * 50
        else:
            cash_flow = 50 + ratio * 100  # negative ratio pulls below 50 quickly
    cash_flow = _clamp(cash_flow)

    # ---- Savings score ----
    # 40 pts baseline for having an emergency fund at all, up to 60 more
    # pts from the savings rate (net / income), capped so a 40%+ savings
    # rate alone maxes out the rate component.
    savings_rate = (net / income) if income > 0 else 0
    base = 40 if profile.has_emergency_fund else 0
    rate_component = _clamp(savings_rate * 150, 0, 60)
    savings = _clamp(base + rate_component)

    # ---- Scam safety score (TODO: replace with real ScamHistory data) ----
    # Baseline heuristic only — no scam-check history exists yet to compute
    # an actual pass rate. Self-reported "scams" worry and demographics
    # historically more targeted (retired, PWD) nudge the baseline down
    # slightly to bias toward caution rather than false confidence.
    scam_safety = 70
    if "scams" in worries:
        scam_safety -= 10
    if profile.income_source in ("retired", "pwd"):
        scam_safety -= 5
    scam_safety = _clamp(scam_safety)

    financial_health_score = _clamp(
        0.40 * cash_flow + 0.35 * savings + 0.25 * scam_safety
    )

    # Guardian score additionally factors in schemes-matched and trusted
    # circle strength — both held at a neutral 50 until those features
    # write real data. TODO: replace the two 50s once schemes/trusted
    # circle exist.
    guardian_score = _clamp(
        0.30 * cash_flow + 0.25 * savings + 0.25 * scam_safety + 0.10 * 50 + 0.10 * 50
    )

    if guardian_score >= 85:
        archetype = "Financial Sage"
    elif guardian_score >= 70:
        archetype = "Steady Builder"
    elif guardian_score >= 50:
        archetype = "Cautious Navigator"
    else:
        archetype = "Vulnerable Saver"

    return {
        "cash_flow": cash_flow,
        "savings": savings,
        "scam_safety": scam_safety,
        "financial_health_score": financial_health_score,
        "guardian_score": guardian_score,
        "guardian_archetype": archetype,
        "net": net,
        "worries": worries,
    }


@router.get("/dashboard", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _get_profile_or_404(current_user, db)
    s = compute_scores(profile)

    return DashboardSummaryResponse(
        financial_health_score=s["financial_health_score"],
        score_breakdown=FinancialScoreBreakdown(
            cash_flow=s["cash_flow"],
            savings=s["savings"],
            scam_safety=s["scam_safety"],
        ),
        monthly_income=profile.monthly_income,
        monthly_expenses=profile.monthly_expenses,
        monthly_savings=s["net"],
        guardian_score=s["guardian_score"],
        guardian_archetype=s["guardian_archetype"],
    )


@router.post("/twin", response_model=TwinInsightsResponse)
async def generate_twin_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _get_profile_or_404(current_user, db)
    s = compute_scores(profile)

    system_prompt = (
        "You are ArthaRakshak's behavioral-finance engine. Given a user's "
        "financial snapshot, generate a short 'financial digital twin' "
        "profile — a relatable archetype that reflects how this person "
        "actually handles money, written for an Indian audience. Be "
        "specific and grounded in the numbers given, not generic. Keep "
        "each text field to one short sentence. 'advice' should be one "
        "concrete, behavioral nudge (not generic advice like 'save more') "
        "ideally referencing a habit or timing change. Output ONLY a JSON "
        "object with exactly these keys: twin_name (a short evocative "
        "2-3 word persona name), risk_style ('low', 'medium', or 'high'), "
        "spending (one sentence), saving (one sentence), advice (one "
        "sentence), regret_probability (integer 0-100, chance this "
        "person later regrets a current financial habit), "
        "future_confidence (integer 0-100, how on-track they are for "
        "their dependents/goals)."
    )

    prompt = (
        f"Income source: {profile.income_source}\n"
        f"Monthly income: ₹{profile.monthly_income}\n"
        f"Monthly expenses: ₹{profile.monthly_expenses}\n"
        f"Existing EMI/loans: ₹{profile.existing_emi}/month\n"
        f"Net monthly surplus: ₹{s['net']}\n"
        f"Has emergency fund: {profile.has_emergency_fund}\n"
        f"Dependents: {profile.dependents_count}\n"
        f"Self-reported top worries: {', '.join(s['worries']) or 'none stated'}\n"
        f"Computed cash flow score: {s['cash_flow']}/100\n"
        f"Computed savings score: {s['savings']}/100\n"
        f"Computed scam safety score: {s['scam_safety']}/100\n"
        f"Overall guardian archetype tier: {s['guardian_archetype']}"
    )

    try:
        data = await ask_llm(prompt, system=system_prompt, json_mode=True, max_tokens=400)
    except LLMError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not generate insights right now: {e}",
        )

    try:
        return TwinInsightsResponse(
            twin_name=str(data["twin_name"]),
            risk_style=str(data["risk_style"]),
            spending=str(data["spending"]),
            saving=str(data["saving"]),
            advice=str(data["advice"]),
            regret_probability=int(data["regret_probability"]),
            future_confidence=int(data["future_confidence"]),
        )
    except (KeyError, ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM returned an unexpected shape: {e}",
        )