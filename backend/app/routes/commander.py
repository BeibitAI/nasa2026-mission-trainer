"""
POST /api/commander — the AI Mission Commander.
Owner: Adlet

Flow: rate limit -> cache -> Gemini (5 s budget) -> fallback template. Always returns 200.
Gemini only rephrases the numbers/facts the game sends; it must not invent science.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import random
import time
from collections import defaultdict, deque
from typing import Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app import config

router = APIRouter()

# ---------- contract (mirror of Unity Scripts/Contracts/Dto.cs) ----------


class Allocation(BaseModel):
    lifeSupport: int = 0
    greenhouse: int = 0
    shield: int = 0
    science: int = 0


class Snapshot(BaseModel):
    air: float = 100
    food: float = 100
    dose: float = 0
    science: float = 0


class EventInfo(BaseModel):
    id: str
    fact: str = ""


class CommanderRequest(BaseModel):
    sessionId: str = ""
    scenario: Literal["mars", "moon"] = "mars"
    sol: int = 1
    phase: Literal["briefing", "debrief"] = "debrief"
    allocation: Allocation = Field(default_factory=Allocation)
    before: Snapshot = Field(default_factory=Snapshot)
    after: Snapshot = Field(default_factory=Snapshot)
    events: list[EventInfo] = Field(default_factory=list)
    outcome: Literal["ok", "warning", "fail", "win"] = "ok"


class CommanderReply(BaseModel):
    text: str
    tip: str
    source: Literal["gemini", "cache", "fallback"] = "fallback"


# ---------- prompt ----------

SYSTEM_PROMPT = """You are "Commander Nova", a warm, upbeat mission commander talking to a child (age 8-12)
who is running a small base on {place}. Rules:
- Simple English, short sentences, no jargon (if you must use a science word, explain it in 3-5 words).
- Use ONLY the numbers and facts given in the input. Never invent data, dates or statistics.
- Explain WHY things changed: connect the player's power choices to what happened.
- Never scary or gloomy. Mistakes are learning moments.
- "text": at most 35 words. "tip": one actionable suggestion for the next sol, at most 15 words.
Reply as JSON: {{"text": "...", "tip": "..."}}"""


def build_user_prompt(req: CommanderRequest) -> str:
    d = {
        "phase": req.phase,
        "sol": req.sol,
        "powerChoice": req.allocation.model_dump(),
        "before": req.before.model_dump(),
        "after": req.after.model_dump(),
        "events": [e.model_dump() for e in req.events],
        "outcome": req.outcome,
        "barsMeaning": "air/food 0-100 (0 = mission over), dose 0-100 (100 = crew must go home), science = points toward goal",
    }
    return json.dumps(d)


# ---------- rate limit + cache ----------

_RATE: dict[str, deque] = defaultdict(deque)
RATE_MAX, RATE_WINDOW_S = 40, 300  # per IP
_CACHE: dict[str, CommanderReply] = {}
CACHE_MAX = 2000


def _rate_ok(ip: str) -> bool:
    now = time.time()
    q = _RATE[ip]
    while q and now - q[0] > RATE_WINDOW_S:
        q.popleft()
    if len(q) >= RATE_MAX:
        return False
    q.append(now)
    return True


def _bucket(v: float) -> int:
    return int(v // 20)  # 0-19 -> 0, 20-39 -> 1, ...


def _cache_key(req: CommanderRequest) -> str:
    a = req.allocation
    key = (req.scenario, req.phase, req.outcome, tuple(sorted(e.id for e in req.events)),
           (a.lifeSupport, a.greenhouse, a.shield, a.science),
           _bucket(req.after.air), _bucket(req.after.food), _bucket(req.after.dose))
    return hashlib.sha1(repr(key).encode()).hexdigest()


# ---------- fallback ----------

FALLBACK = {
    "win": [("Mission complete! You kept the crew safe and finished the science. Real mission planners would be proud!",
             "Try again with a different strategy!")],
    "fail": [("The base ran out of something important. That's how real planners learn: every resource matters.",
              "Next time, keep an eye on the lowest bar.")],
    "warning": [("Careful, Commander! One of our bars is getting low. Every power choice has a cost.",
                 "Give a little more power to the lowest bar.")],
    "ok": [("Nice work! The base is running smoothly and the crew is happy.",
            "Could you spare one power unit for science?")],
    "briefing": [("Good morning, Commander! You have 10 power units today. How will you share them?",
                  "Life support keeps the crew breathing. Start there.")],
}


def fallback_reply(req: CommanderRequest) -> CommanderReply:
    key = "briefing" if req.phase == "briefing" else req.outcome
    text, tip = random.choice(FALLBACK[key])
    if req.events and req.phase == "debrief" and req.events[0].fact:
        text = f"{req.events[0].fact} {text}"
    return CommanderReply(text=text, tip=tip, source="fallback")


# ---------- Gemini ----------

_client = None


def _gemini():
    global _client
    if _client is None and config.GEMINI_API_KEY:
        from google import genai  # imported lazily so the app boots even without the SDK/key
        from google.genai import types
        # v1beta: needed for "-latest" model aliases and newer models
        _client = genai.Client(api_key=config.GEMINI_API_KEY,
                               http_options=types.HttpOptions(api_version="v1beta"))
    return _client


async def ask_gemini(req: CommanderRequest) -> CommanderReply | None:
    client = _gemini()
    if client is None:
        return None
    from google.genai import types

    place = "Mars (Gale Crater)" if req.scenario == "mars" else "the Moon (south pole)"
    resp = await client.aio.models.generate_content(
        model=config.GEMINI_MODEL,
        contents=build_user_prompt(req),
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT.format(place=place),
            response_mime_type="application/json",
            temperature=0.7,
        ),
    )
    data = json.loads(resp.text)
    text, tip = str(data.get("text", "")).strip(), str(data.get("tip", "")).strip()
    if not text:
        return None
    return CommanderReply(text=text[:300], tip=tip[:120], source="gemini")


@router.post("/commander", response_model=CommanderReply)
async def commander(req: CommanderRequest, request: Request) -> CommanderReply:
    ip = request.client.host if request.client else "unknown"
    key = _cache_key(req)
    if key in _CACHE:
        return _CACHE[key].model_copy(update={"source": "cache"})
    if not _rate_ok(ip):
        return fallback_reply(req)
    try:
        reply = await asyncio.wait_for(ask_gemini(req), timeout=5.0)
    except Exception as exc:  # timeout, quota, bad JSON, network...
        print(f"[commander] gemini failed: {type(exc).__name__}: {exc}")
        reply = None
    if reply is None:
        return fallback_reply(req)
    if len(_CACHE) >= CACHE_MAX:
        _CACHE.pop(next(iter(_CACHE)))
    _CACHE[key] = reply
    return reply
