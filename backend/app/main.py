"""
Mission Trainer backend — FastAPI.
Owner: Adlet

Run locally:  uvicorn app.main:app --reload --port 8080   (from backend/)
Render:       start command  uvicorn app.main:app --host 0.0.0.0 --port $PORT
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.routes import commander, scores, spaceweather

app = FastAPI(title="Junior Astronaut Mission Trainer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_origin_regex=config.ALLOWED_ORIGIN_REGEX,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(commander.router, prefix="/api")
app.include_router(spaceweather.router, prefix="/api")
app.include_router(scores.router, prefix="/api")


@app.get("/health")
def health() -> dict:
    """UptimeRobot pings this every 5 min so Render's free instance stays awake."""
    return {
        "ok": True,
        "gemini": bool(config.GEMINI_API_KEY),
        "nasa": config.NASA_API_KEY != "DEMO_KEY",
        "supabase": bool(config.SUPABASE_URL),
    }
