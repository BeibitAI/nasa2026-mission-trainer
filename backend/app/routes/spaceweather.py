"""
GET /api/spaceweather?days=30 — real space weather from NASA DONKI, summarised for the game.
Owner: Adlet

Uses DONKI CME, GST, SEP and notifications via api.nasa.gov.
NOTE: the DONKI FLR (flares) endpoint on api.nasa.gov returned 404 for every date range
when checked on 2026-11-14, so we don't depend on it.

Snapshot (bundled fallback for the backend AND the Unity game):
    py -m app.routes.spaceweather          (from backend/)
"""
from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Query

from app import config

router = APIRouter()

DONKI = "https://api.nasa.gov/DONKI"
CACHE_TTL_S = 6 * 3600
SNAPSHOT = config.DATA_DIR / "donki_snapshot.json"
UNITY_SNAPSHOT = (config.BASE_DIR.parent / "unity" / "MissionTrainer" / "Assets" / "_Project"
                  / "Resources" / "Data" / "spaceweather_snapshot.json")

_cache: dict[int, tuple[float, dict]] = {}


async def _get(client: httpx.AsyncClient, endpoint: str, start: str, end: str) -> list:
    r = await client.get(f"{DONKI}/{endpoint}",
                         params={"startDate": start, "endDate": end, "api_key": config.NASA_API_KEY})
    r.raise_for_status()
    return r.json() if r.content else []


def _risk(sep_recent: int, max_kp: float, fastest_cme: float) -> str:
    if sep_recent > 0 or max_kp >= 7:
        return "high"
    if fastest_cme >= 1000 or max_kp >= 5:
        return "medium"
    return "low"


async def fetch_summary(days: int = 30) -> dict:
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days)
    s, e = start.isoformat(), end.isoformat()
    async with httpx.AsyncClient(timeout=20) as client:
        cme, gst, sep, notes = await asyncio.gather(
            _get(client, "CME", s, e), _get(client, "GST", s, e),
            _get(client, "SEP", s, e), _get(client, "notifications", s, e),
        )

    speeds = [a.get("speed") or 0 for c in cme for a in (c.get("cmeAnalyses") or [])]
    kps = [k.get("kpIndex") or 0 for g in gst for k in (g.get("allKpIndex") or [])]
    week_ago = (end - timedelta(days=7)).isoformat()
    sep_recent = sum(1 for x in sep if (x.get("eventTime") or "")[:10] >= week_ago)
    fastest, max_kp = max(speeds, default=0), max(kps, default=0)

    return {
        "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "live": True,
        "source": "NASA DONKI (CCMC) via api.nasa.gov",
        "url": "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
        "days": days,
        "cmeCount": len(cme),
        "fastestCmeKmS": round(fastest),
        "gstCount": len(gst),
        "maxKp": max_kp,
        "sepCount": len(sep),
        "recentNotifications": [
            {"type": n.get("messageType", ""), "time": n.get("messageIssueTime", "")}
            for n in notes[-5:]
        ],
        "riskLevel": _risk(sep_recent, max_kp, fastest),
    }


def _load_snapshot() -> dict:
    data = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    data["live"] = False
    return data


@router.get("/spaceweather")
async def spaceweather(days: int = Query(30, ge=1, le=60)) -> dict:
    hit = _cache.get(days)
    if hit and time.time() - hit[0] < CACHE_TTL_S:
        return hit[1]
    try:
        data = await fetch_summary(days)
        _cache[days] = (time.time(), data)
        return data
    except Exception as exc:
        print(f"[spaceweather] DONKI failed: {type(exc).__name__}: {exc}")
        if hit:
            return hit[1]
        return _load_snapshot()


if __name__ == "__main__":
    snap = asyncio.run(fetch_summary(30))
    snap["live"] = False  # a snapshot is never live
    text = json.dumps(snap, indent=1)
    for path in (SNAPSHOT, UNITY_SNAPSHOT):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        print("wrote", path)
    print(text)
