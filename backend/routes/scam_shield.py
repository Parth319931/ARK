"""
backend/routes/scam_shield.py
POST /api/scam-shield/analyze — analyzes a pasted message for scam risk.
"""
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from llm import ask_llm, LLMError
from models import User
from schemas import ScamShieldRequest, ScamShieldResponse

router = APIRouter(prefix="/scam-shield", tags=["scam-shield"])

SYSTEM_PROMPT = (
    "You are ArthaRakshak's Scam Shield — an expert at detecting financial "
    "scams, phishing, and fraud in messages sent to Indian users (SMS, "
    "WhatsApp, email). Analyze the message and decide how risky it is."
)


@router.post("/analyze", response_model=ScamShieldResponse)
async def analyze_message(
    body: ScamShieldRequest,
    current_user: User = Depends(get_current_user),
):
    prompt = f"""Analyze the following message for scam/fraud risk.

MESSAGE:
\"\"\"{body.message}\"\"\"

Return a JSON object with exactly these keys:
- "risk_percentage": an integer 0-100, how likely this is a scam.
- "explanations": an array of short strings, each one simple-English
  sentence explaining ONE specific red flag (or, if it looks safe, one
  reassuring reason it looks legitimate). Each item should read like a
  line-by-line reason a non-technical Indian user can understand. Keep
  each explanation under 20 words. Provide 3-6 items.

Respond with ONLY the JSON object."""

    try:
        result = await ask_llm(prompt, system=SYSTEM_PROMPT, json_mode=True, temperature=0.2)
    except LLMError as e:
        raise HTTPException(status_code=502, detail=str(e))

    risk = int(result.get("risk_percentage", 0))
    risk = max(0, min(100, risk))
    explanations = result.get("explanations", [])

    return ScamShieldResponse(
        risk_percentage=risk,
        verdict="risky" if risk > 60 else "safe",
        explanations=explanations,
    )