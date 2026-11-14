"""
Fetch real radiation dose-rate data from NASA OSDR RadLab and write compact JSON
files that the Unity game bundles in Resources/Data/.

Owner: Adlet
Source: https://visualization.osdr.nasa.gov/radlab/gui/data-api/
Usage:  python data-pipeline/fetch_radlab.py
Stdlib only (no pip install needed).
"""
from __future__ import annotations

import csv
import io
import json
import statistics
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path

API = "https://visualization.osdr.nasa.gov/radlab/api"
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "unity" / "MissionTrainer" / "Assets" / "_Project" / "Resources" / "Data"

YEAR = 2017                      # contains the 10-11 Sep 2017 solar particle event
# Per-instrument windows. Baseline = quiet days before the solar activity of early Sep 2017
# (an X9.3 flare on 6 Sep already raised levels near the Moon, so the Moon baseline ends earlier).
SEP_WINDOWS = {
    "MSL-RAD-Surface": {"window": ("2017-09-05", "2017-09-16"), "baseline": ("2017-09-05", "2017-09-10")},
    "CRaTER-D1D2":     {"window": ("2017-09-01", "2017-09-16"), "baseline": ("2017-09-01", "2017-09-05")},
}
SEP_ONSET_SEARCH_FROM = "2017-09-10T12"  # the 10 Sep 2017 event (X8.2 flare + particle storm)


def fetch_csv(params: dict[str, str]) -> list[dict[str, str]]:
    """GET RadLab API as CSV. Comparison operators must stay in the key (e.g. 'timestamp>=')."""
    parts = []
    for key, value in params.items():
        if value == "":
            parts.append(urllib.parse.quote(key, safe="<>=_"))
        else:
            parts.append(urllib.parse.quote(key, safe="<>=_") + urllib.parse.quote(value, safe="-:T|"))
    url = API + "?" + "&".join(parts)
    with urllib.request.urlopen(url, timeout=120) as resp:
        text = resp.read().decode("utf-8")
    return list(csv.DictReader(io.StringIO(text)))


def month_ranges(year: int):
    for m in range(1, 13):
        start = date(year, m, 1)
        end = date(year + (m == 12), (m % 12) + 1, 1)
        yield start.isoformat(), end.isoformat()


def daily_means(instrument_id: str, year: int) -> dict[str, float]:
    by_day: dict[str, list[float]] = defaultdict(list)
    for start, end in month_ranges(year):
        rows = fetch_csv({
            "instrument_id=": instrument_id,
            "timestamp>=": start,
            "timestamp<": end,
            "absorbed_dose_rate": "",
        })
        for r in rows:
            v = r.get("absorbed_dose_rate")
            if v:
                by_day[r["timestamp"][:10]].append(float(v))
        print(f"  {instrument_id} {start}: {len(rows)} rows")
    return {d: round(statistics.fmean(v), 3) for d, v in sorted(by_day.items()) if v}


def sep_profile(instrument_id: str) -> dict:
    """Hourly mean dose rate during the Sep 2017 event, normalised to the quiet baseline."""
    cfg = SEP_WINDOWS[instrument_id]
    rows = fetch_csv({
        "instrument_id=": instrument_id,
        "timestamp>=": cfg["window"][0],
        "timestamp<": cfg["window"][1],
        "absorbed_dose_rate": "",
    })
    hourly: dict[str, list[float]] = defaultdict(list)
    for r in rows:
        v = r.get("absorbed_dose_rate")
        if v:
            hourly[r["timestamp"][:13]].append(float(v))
    hours = sorted(hourly)
    means = [statistics.fmean(hourly[h]) for h in hours]
    base_vals = [m for h, m in zip(hours, means) if cfg["baseline"][0] <= h[:10] < cfg["baseline"][1]]
    baseline = statistics.fmean(base_vals) if base_vals else statistics.median(means)
    # onset = first hour after SEP_ONSET_SEARCH_FROM above 1.3x baseline; peak = max after onset
    onset = next(i for i, (h, m) in enumerate(zip(hours, means))
                 if h >= SEP_ONSET_SEARCH_FROM and m > 1.3 * baseline)
    peak_i = max(range(onset, len(means)), key=means.__getitem__)
    # keep only the active part: from 6 h before onset to return below 1.1x baseline
    end = next((i for i in range(peak_i, len(means)) if means[i] < 1.1 * baseline), len(means) - 1)
    lo, hi = max(0, onset - 6), min(len(means), end + 1)
    return {
        "id": "sep_2017",
        "name": "Solar particle storm",
        "realDate": hours[onset][:10],
        "baselineValue": round(baseline, 3),
        "peakValue": round(means[peak_i], 3),
        "peakTime": hours[peak_i] + ":00Z",
        "peakMultiplier": round(means[peak_i] / baseline, 2),
        "hourlyStart": hours[lo] + ":00Z",
        "hourlyMultiplier": [round(m / baseline, 3) for m in means[lo:hi]],
    }


def build(instrument_id: str, body: str, label: str, location: str, note: str) -> dict:
    print(f"Fetching {instrument_id} daily means for {YEAR}...")
    daily = daily_means(instrument_id, YEAR)
    print(f"Fetching {instrument_id} Sep 2017 event profile...")
    event = sep_profile(instrument_id)
    vals = list(daily.values())
    return {
        "body": body,
        "source": f"NASA OSDR RadLab — {label}",
        "url": "https://visualization.osdr.nasa.gov/radlab/",
        "instrumentId": instrument_id,
        "location": location,
        "note": note,
        "units": "uGy/h (absorbed dose rate)",
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "year": YEAR,
        "stats": {
            "min": round(min(vals), 3),
            "median": round(statistics.median(vals), 3),
            "max": round(max(vals), 3),
        },
        # JsonUtility cannot read dictionaries -> parallel arrays
        "dailyDates": list(daily.keys()),
        "dailyMean": vals,
        "events": [event],
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    mars = build(
        "MSL-RAD-Surface", "mars", "Curiosity rover, RAD instrument",
        "Gale Crater, Mars surface",
        "Measured on the surface of Mars, under the Martian atmosphere.",
    )
    moon = build(
        "CRaTER-D1D2", "moon", "Lunar Reconnaissance Orbiter, CRaTER instrument",
        "Lunar orbit (~50 km above the Moon)",
        "Measured in orbit around the Moon, not on the surface. The surface sees roughly half the sky, so real surface dose is lower. "
        "Event peaks come from a thin, lightly shielded silicon detector and are extreme; cap them in gameplay and verify before quoting.",
    )
    for name, data in (("radiation_mars.json", mars), ("radiation_moon.json", moon)):
        path = OUT_DIR / name
        path.write_text(json.dumps(data, indent=1), encoding="utf-8")
        ev = data["events"][0]
        print(f"Wrote {path.relative_to(ROOT)}: {len(data['dailyMean'])} days, "
              f"median {data['stats']['median']} uGy/h, event peak x{ev['peakMultiplier']} on {ev['realDate']}")


if __name__ == "__main__":
    main()
