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
import re
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
    lang: Literal["en", "ru"] = "en"


class CommanderReply(BaseModel):
    text: str
    tip: str
    source: Literal["gemini", "cache", "fallback"] = "fallback"


# ---------- prompt ----------

SYSTEM_PROMPT = """You are "Commander Nova", a warm, upbeat mission commander talking to a child (age 7-12)
who is running a small base on {place}.

GAME RULES (the only truth - never contradict them):
- Every sol (a Mars day) the player shares 10 power units between Life Support (air and water),
  Greenhouse (food), Storm Shield and Science.
- Life Support needs 3 units to keep air steady, the Greenhouse needs 2 to keep food steady.
  More makes the bar go up, less makes it drop fast.
- Everyday space radiation (cosmic rays) is always there: the dose goes up a little EVERY sol and
  the shield CANNOT stop it. On a calm sol, never suggest using the shield - that wastes power.
- The Storm Shield only helps during a solar storm: it blocks part of the extra storm radiation.
- Science means working outside: every Science unit adds a little dose on any sol, and much more
  during a solar storm. When the dose is high, the fix is less Science - not the shield.
- A dust storm blocks sunlight, so the base gets only half the power.
- Radio from Earth takes 4 to 24 minutes, so Earth's storm warnings can come too late.
  A Weather Station costs 1 power every sol and warns about storms one sol early.
- The mission lasts 14 sols. To win: keep air and food above 0, keep the dose under 100,
  and reach 32 science points. Nobody wins before the end of sol 14, even with 32 points already.

HOW TO ANSWER:
- Very simple English a 7-year-old can follow: short sentences, everyday words, no jargon.
  If you use a science word like "radiation", explain it in 3-5 words.
- Use ONLY the numbers and facts in the input. Never invent data, dates or statistics.
- Follow the "task" field in the input exactly.
- Be kind and encouraging, never scary: no words about illness, injury or death.
- Vary your first words; do not start with "Great job" every time.
- "text": 2-3 short sentences, at most 30 words. "tip": one concrete suggestion, at most 12 words.
{lang_rule}Reply as JSON: {{"text": "...", "tip": "..."}}"""

LANG_RULES = {
    "en": "",
    "ru": ("LANGUAGE: write \"text\" and \"tip\" in simple Russian for a child, address the player as \"ты\". "
           "Use these game words: сол, Жизнеобеспечение, Теплица, Щит от бури, Наука, Метеостанция, доза радиации. "
           "A power unit is \"единица энергии\" (never узел, топливо or силы). "
           "Write the day as \"сол 6\" or \"на 6-м соле\"; plural is \"14 солов\"; never invent words. "
           "Do not start with \"Привет\" or \"Отличная работа\"; praise only a good choice. "
           "The rules above still apply.\n"),
}

STORM_IDS = {"solar_storm"}
DUST_IDS = {"dust_storm"}


def _task(req: CommanderRequest, storm: bool, dust: bool, surprise: bool) -> str:
    if req.phase == "briefing":
        if storm:
            return ("Morning briefing. The player has NOT chosen yet. Warn that a solar storm is coming today: "
                    "suggest more Storm Shield and less outside Science today. Do not praise or judge any choice.")
        if dust:
            return ("Morning briefing. The player has NOT chosen yet. Say a dust storm means only half the power today: "
                    "keep Life Support and Greenhouse fed first. Do not praise or judge any choice.")
        return ("Morning briefing. The player has NOT chosen yet. Briefly say how the base is doing and what to "
                "think about today (lowest bar, science goal). Calm sol: no storm, so the shield is not needed. "
                "Do not praise or judge any choice.")
    if req.outcome == "win":
        return ("The mission is over and the player WON. Celebrate the whole 14-sol mission. "
                "Tip: invite them to play again and try a different strategy. Do not give advice for tomorrow.")
    if req.outcome == "fail":
        return ("The mission is over: the player lost (see failReason). Kindly explain the main reason in one sentence, "
                "using the rules. Tip: one idea for their NEXT MISSION (not tomorrow).")
    parts = ["Debrief after the sol. Explain WHY the bars changed, using the power choice and the rules."]
    a = req.after
    danger = ("air" if a.air < 30 else "food" if a.food < 30 else "radiation dose" if a.dose > 70 else None)
    if req.outcome == "warning" and danger:
        parts.append(f"Gently warn that the {danger} is getting close to the limit; that is the most important point.")
        if danger == "radiation dose":
            parts.append("Tip: suggest less outside Science to slow the dose (not the shield, not more Science).")
    if a.science >= 32:
        parts.append("The science goal is already reached, but the mission is not won yet: "
                     "now the job is to stay safe until the end of sol 14.")
    if surprise:
        parts.append("The storm was a surprise because Earth's warning came too late (radio delay). "
                     "Mention that a Weather Station would have warned them.")
    elif storm:
        parts.append("There was a solar storm: say how the shield and outside science affected the dose.")
    elif dust:
        parts.append("A dust storm cut the power in half: that is why there was less to share.")
    else:
        parts.append("Calm sol: the small dose rise is everyday radiation the shield cannot stop. "
                     "Do not tell the player to use the shield.")
    parts.append("Tip: one suggestion for the next sol.")
    return " ".join(parts)


def _fail_reason(req: CommanderRequest) -> str | None:
    a = req.after
    if a.air <= 0:
        return "air ran out"
    if a.food <= 0:
        return "food ran out"
    if a.dose >= 100:
        return "radiation dose reached 100, the crew must go home"
    if req.outcome == "fail":
        return "the 14 sols ended before reaching 32 science points"
    return None


def build_user_prompt(req: CommanderRequest) -> str:
    ids = {e.id for e in req.events}
    storm, dust, surprise = bool(ids & STORM_IDS), bool(ids & DUST_IDS), "comms_delay" in ids
    d: dict = {"task": _task(req, storm, dust, surprise), "sol": req.sol, "solsInMission": 14}
    if req.phase == "briefing":
        # The allocation sent with a briefing is only the default, not a choice -> leave it out.
        d["baseNow"] = req.before.model_dump()
    else:
        b, a = req.before, req.after
        d["powerChoice"] = req.allocation.model_dump()
        d["before"] = b.model_dump()
        d["after"] = a.model_dump()
        d["change"] = {k: round(getattr(a, k) - getattr(b, k), 1) for k in ("air", "food", "dose", "science")}
        d["outcome"] = req.outcome
        if req.outcome == "fail":
            d["failReason"] = _fail_reason(req)
    d["events"] = [e.model_dump() for e in req.events]
    d["bars"] = "air and food: 0-100 (0 = mission over); dose: 0-100 (100 = crew must go home); science: goal 32"
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
    key = (req.lang, req.scenario, req.phase, req.outcome, tuple(sorted(e.id for e in req.events)),
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
            system_instruction=SYSTEM_PROMPT.format(place=place, lang_rule=LANG_RULES[req.lang]),
            response_mime_type="application/json",
            temperature=0.7,
        ),
    )
    data = json.loads(resp.text)
    text, tip = str(data.get("text", "")).strip(), str(data.get("tip", "")).strip()
    if not text:
        return None
    return CommanderReply(text=_clip(text, 35), tip=_clip(tip, 15), source="gemini")


def _clip(s: str, max_words: int) -> str:
    """Keep whole sentences that fit in max_words (fallback: hard word cut)."""
    if len(s.split()) <= max_words:
        return s
    out = ""
    for sent in re.split(r"(?<=[.!?])\s+", s):
        if len((out + " " + sent).split()) > max_words:
            break
        out = (out + " " + sent).strip()
    return out or " ".join(s.split()[:max_words]) + "..."


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
