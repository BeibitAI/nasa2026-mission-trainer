# Sol by Sol: Mars Base Trainer

A free browser game for kids aged 7–12: run a small base in Gale Crater on Mars, one sol (Mars day) at a time.
Share power between life support, the greenhouse, a storm shield and science — while real NASA data decides
when the storms come. Built by Team BeibitAI (Kazakhstan) for the NASA Space Apps Challenge 2026,
challenge [Build a Junior Astronaut Mission Trainer](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/).

**Play:** https://beibitai.github.io/nasa2026-mission-trainer/

## NASA data used

| Data | What it does in the game |
|---|---|
| Curiosity RAD dose rate, Gale Crater, Sep 2017 ([NASA OSDR RadLab](https://visualization.osdr.nasa.gov/radlab/)) | The solar storm: 2.29× and 1.65× the quiet level, peak hour 2.77× |
| [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) (last 30 days) | Real space-weather risk changes how likely storms are |
| [NASA OSDR](https://osdr.nasa.gov/bio/repo/) studies OSD-476, 268, 210, 342, 418 | "Real science" cards after each sol |
| NASA pages on Earth–Mars signal delay, the 2018 Opportunity dust storm, NASA-STD-3001 | Weather Station choice, dust storms, radiation limit |

What we simplified is explained on the website, section "Data & Science".

## Repository

| Folder | Contents |
|---|---|
| `unity/MissionTrainer/` | Unity 6 (URP) game, built for WebGL into `web/play/` |
| `backend/` | FastAPI server: AI Commander (Google Gemini), NASA DONKI proxy with cache, leaderboard |
| `data-pipeline/` | `fetch_radlab.py`: downloads Curiosity RAD / LRO CRaTER data from the OSDR RadLab API |
| `web/` | Website (GitHub Pages) |
| `docs/` | Concept, architecture, requirements check, submission texts |

The game works without the backend: it falls back to bundled data and pre-written texts.

## Use of AI (Super Intelligence)

- **In the game:** Google Gemini writes the AI Commander's short explanations from the game's own numbers, through our server. If it is unavailable, pre-written texts are used.
- **In development:** the team designed the game. We used Claude (Anthropic) as an assistant for planning, writing and reviewing code (C#, Python, HTML/CSS/JS), documentation and texts. AI-assisted code and documents were reviewed and tested by team members.
- **Images, video, audio:** any SI-generated media carries a visible watermark. No NASA logos or branding were generated or used.

## Team BeibitAI

Adlet (captain, backend, AI and data) · Arystan (game developer) · Omar (game data, events, environment) ·
Bexultan (3D artist) · Muhammad (website) · Dariya (demo, presentation, texts)

This is a student hackathon project and is not endorsed by NASA.
