# Concept — Junior Astronaut Mission Trainer

**Challenge:** [Build a Junior Astronaut Mission Trainer](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/) — kids **7–12** run a lunar/Martian outpost, balancing life support, radiation shielding, power, food and **communication delay**. Every choice must have a cost; ground it in real NASA data and attribute sources in-game.

## Core loop — «Sol by Sol» (turn-based)

One turn = one Martian day (sol). A mission = **14 sols** (~6–8 min). Base site: **Gale Crater, next to Curiosity** — radiation numbers in the game were measured right there.

1. **Briefing** — the AI Mission Commander shows the forecast (dust, Sun, base status).
2. **Decide** — 10 power units per sol, split across 🫁 Life Support, 🍅 Greenhouse, 🛡️ Shield, 🔬 Science.
3. **Simulate** — 5–10 s animation of the 3D base, events fire.
4. **Debrief** — the Commander explains in plain words what happened and why. Every few sols: build/upgrade one module.

**Resources:** power = the *decision currency* (not a stockpile). Consequences show on 3 bars — **Air & Water**, **Food**, **Crew Radiation Dose** — plus **Science** (win goal). Lose if Air or Food hits 0 or Dose hits the limit. Win: survive 14 sols with Science ≥ goal.

**Communication delay:** on Mars, the storm warning from Earth arrives a sol late; building a local Weather Station buys the warning time back.

## MVP (must work at demo)
- Public WebGL link, no login, Chrome/Edge desktop
- Mars scenario, full 14-sol loop, 3 bars + science, win/lose, restart
- 3 real-data events: **solar particle storm** (Curiosity RAD profile, 11–12 Sep 2017), **dust storm** (solar output drops), **Real Sun** (NASA DONKI, with data date shown)
- Communication-delay mechanic (simple)
- AI Commander via backend **with offline fallback texts**
- In-game **Data Sources** screen
- 3D base (cubes OK until models arrive)
- Landing page with embedded game, data sources, SI disclosure

## Nice to have (in order)
1. Moon (south pole) scenario — same code, different config
2. Final models + module upgrades
3. Leaderboard (generated nicknames only, no free text)
4. OSDR "Real science" cards
5. End-of-mission recap + mini quiz
6. AI-generated crises

**Cut:** save/load progress (sessions are 8 minutes).

## NASA data → game parameter

✅ verified by query on 2026-11-14 · 🔶 real source, exact numbers still to confirm

| Game parameter | Source | Status |
|---|---|---|
| Mars surface radiation baseline (~5.5–8 µGy/h absorbed) | [OSDR RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) — `MSL-RAD-Surface` (Curiosity) | ✅ |
| Solar storm event: daily mean ~8 → ~18 µGy/h, peak ~23 (11–12 Sep 2017); drop below baseline on 14 Sep | RadLab, same instrument | ✅ |
| Moon radiation (~12–13 µGy/h, **lunar orbit**, labelled as such) | RadLab — `CRaTER` (LRO) | ✅ |
| "On the ISS you'd get…" comparison | RadLab — ISS dosimeters | ✅ |
| Live space weather | [DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) via [api.nasa.gov](https://api.nasa.gov/): CME, GST, SEP, notifications (FLR endpoint currently 404) — server-side only (CORS) | ✅ |
| Crew dose limit (600 mSv career) | NASA-STD-3001 Vol.1 — [NASA tech brief](https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf) | ✅ |
| µGy → mSv conversion (simplified) | Hassler et al. 2014, *Science*, doi:10.1126/science.1244797 | 🔶 |
| O₂/water/food per person per day (~0.82 kg O₂) | NASA BVAD, NASA/TP-2015-218570 | 🔶 |
| Terrain of Gale Crater | [Mars Trek](https://trek.nasa.gov/mars/) | ✅ portal; layer TBD |
| Astronaut health fact cards | [OSDR](https://osdr.nasa.gov/bio/repo/) | 🔶 curate 5–8 studies |
| Greenhouse / food | CSA — [Food production on the Moon](https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/) | ✅ |
| Reactor module (40 kWe) | NASA Fission Surface Power — [NTRS](https://ntrs.nasa.gov/api/citations/20220004670/downloads/40%20kW%20Deployable%20FSP%20Paper_FINAL.pdf) | ✅ |
| Dust storms kill solar power | Opportunity lost in the 2018 global dust storm | 🔶 link TBD |
| Comms delay Mars (minutes) / Moon (~1.3 s) | physics + NASA page | 🔶 link TBD |

In-game the dose bar is scaled to 0–100 for playability; event cards always show the **real measured value**.
