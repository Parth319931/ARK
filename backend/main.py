"""
backend/main.py
FastAPI application entrypoint: app instance, CORS, DB table creation,
seed user creation, and router includes.

Run with: uvicorn main:app --reload
"""
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import Base, engine, SessionLocal
from models import User, FinancialProfile
from auth import hash_password
from routes import auth as auth_routes
from routes import memory as memory_routes
from routes import insights as insights_routes
from routes import scam_shield

load_dotenv()

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
SEED_USER_EMAIL = os.getenv("SEED_USER_EMAIL", "test@gmail.com")
SEED_USER_PASSWORD = os.getenv("SEED_USER_PASSWORD", "test@123")


def init_db():
    """Creates all tables if they don't already exist."""
    Base.metadata.create_all(bind=engine)


def seed_initial_user():
    """
    Seeds one demo user on first run so the team can log in immediately
    without going through signup.

    email:    test@gmail.com
    password: test@123
    """
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == SEED_USER_EMAIL).first()
        if existing:
            return

        seed_user = User(
            email=SEED_USER_EMAIL,
            hashed_password=hash_password(SEED_USER_PASSWORD),
            full_name="Test User",
            language="en",
            income_type="salaried",
            onboarding_complete=False,
        )
        db.add(seed_user)
        db.commit()
        print(f"[seed] Created initial user: {SEED_USER_EMAIL}")
    finally:
        db.close()


app = FastAPI(
    title="ArthaRakshak API",
    description="India's Proactive Financial Guardian AI — backend for Nomura KakushIN 2026",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()
    seed_initial_user()


# ---------- Routers ----------
# Feature routers (scam, voice, schemes, assistant, simulator, dashboard)
# will be added here in later sessions, e.g.:
#   app.include_router(scam_routes.router)
app.include_router(auth_routes.router)
app.include_router(memory_routes.router)
app.include_router(insights_routes.router)
app.include_router(scam_shield.router, prefix="/api")


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": "ArthaRakshak API"}
