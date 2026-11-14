"""Settings from environment variables (backend/.env locally, Render dashboard in prod)."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

ALLOWED_ORIGINS = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS", "https://beibitai.github.io,http://localhost:8000").split(",") if o.strip()]
# itch.io serves HTML5 games from *.itch.zone; any localhost port for dev
ALLOWED_ORIGIN_REGEX = r"https://([a-z0-9-]+\.)*itch\.zone|https?://(localhost|127\.0\.0\.1)(:\d+)?"

DATA_DIR = BASE_DIR / "data"
