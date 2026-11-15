# Sol by Sol: Mars Base Trainer

A free browser game for kids aged 7–12: run a small base in Gale Crater on Mars, one sol (Mars day) at a time.
Share power between life support, the greenhouse, a storm shield and science — while real NASA data decides
when the storms come. Built by Team BeibitAI (Kazakhstan) for the NASA Space Apps Challenge 2026,
challenge [Build a Junior Astronaut Mission Trainer](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/).

**Play:** https://beibitai.github.io/nasa2026-mission-trainer/ (English and Russian; works on computers and phones; the game alone: [/play/](https://beibitai.github.io/nasa2026-mission-trainer/play/))

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
| `web/play/` | **The game** (HTML/CSS/JS, no build step): `sim.js` rules, `game.js` UI, `i18n.js` EN/RU texts, `scene3d.js` 3D base (three.js r160 in `vendor/`, MIT), `models/` FBX |
| `art-source/blender/` | Blender sources of the 3D models (Bexultan) |
| `unity/MissionTrainer/` | Early Unity 6 prototype. `Assets/_Project/Resources/Data/*.json` is the single source of game data; the Pages workflow copies it into `web/play/data/` |
| `backend/` | FastAPI server on Render: AI Commander (Google Gemini), NASA DONKI proxy with cache |
| `data-pipeline/` | `fetch_radlab.py`: downloads Curiosity RAD / LRO CRaTER data from the OSDR RadLab API |
| `web/` | Website (GitHub Pages) |
| `docs/` | Concept, architecture, requirements check, submission texts |

The game works without the backend: it falls back to bundled data and pre-written texts.

**Run locally:** copy the data next to the game, then serve `web/` (module scripts do not work from `file://`):

```bash
mkdir -p web/play/data && cp unity/MissionTrainer/Assets/_Project/Resources/Data/*.json web/play/data/
python -m http.server 8000 -d web
```

Open http://localhost:8000/play/ (on Windows, if it stays on "Loading", use `npx serve web` instead: some Python setups send `.js` with the wrong type). Add `?seed=7` for a repeatable mission (the storm comes on sol 5) or `?offline` to skip the server.

## Use of AI (Super Intelligence)

- **In the game:** Google Gemini writes the AI Commander's short explanations from the game's own numbers, through our server. If it is unavailable, pre-written texts are used.
- **In development:** the team designed the game. We used Claude (Anthropic) as an assistant for planning, writing and reviewing code (JavaScript, Python, C#, HTML/CSS), documentation and texts. AI-assisted code and documents were reviewed and tested by team members.
- **Images, video, audio:** any SI-generated media carries a visible watermark. No NASA logos or branding were generated or used.

## Team BeibitAI

Adlet (captain, game logic, backend, AI and data) · Arystan (lead engineer) · Omar (testing, gameplay recording) ·
Bexultan (3D artist) · Muhammad (website) · Dariya (demo, presentation, texts)

This is a student hackathon project and is not endorsed by NASA.
