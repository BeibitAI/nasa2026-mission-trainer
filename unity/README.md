# Unity project — setup (Arystan, ~15 min)

The C# skeleton and bundled data already live in `unity/MissionTrainer/Assets/_Project/`.
Unity Hub refuses to create a project in a non-empty folder, so:

1. Unity Hub → **New project** → template **Universal 3D (URP)** → version **6000.3.8f1** (team version — confirm) →
   location: anywhere temporary, e.g. `C:\tmp\MissionTrainer`. Create, then **close Unity**.
2. Copy **`Assets/`, `Packages/`, `ProjectSettings/`** from the temp project into `unity/MissionTrainer/`
   (merge `Assets/` — our `_Project/` folder stays). Do NOT copy `Library/`.
3. Unity Hub → **Add** → `unity/MissionTrainer` → open.
4. Project Settings → Editor: **Asset Serialization = Force Text**, **Version Control = Visible Meta Files**.
5. File → Build Profiles → **Web** → Switch Platform.
   Player → Publishing Settings: **Compression Format = Gzip**, **Decompression Fallback = ON**.
6. Create `Assets/_Project/Scenes/Game.unity`: add an empty GameObject **"Game"** + component **`GameBootstrap`**.
   Add a Plane (rust-colored material) and a Cube (= habitat placeholder) so the camera sees something.
   Build Profiles → Scene List: `Game` only (add `Boot` later).
7. Press **Play** → the temporary DebugHud appears: allocate power with +/−, "Start the sol", play 14 sols.
8. **Commit everything including the generated `.meta` files** (only you, first — so GUIDs are stable for the team), push, tell the chat.
9. Build → folder **`web/play/`** → commit `[build] M0` → push → check `https://beibitai.github.io/nasa2026-mission-trainer/`.

## What's where

| Folder | Owner | Notes |
|---|---|---|
| `Scripts/Contracts/` | Arystan + Omar | DTOs + interfaces + `Services` locator. Change only by agreement. |
| `Scripts/Core/` | Arystan | `GameBootstrap` (entry), `TurnController` (sol loop) |
| `Scripts/Sim/` | Arystan | `ResourceModel` — pure rules, balance here |
| `Scripts/UI/` | Arystan | `DebugHud` = temporary IMGUI; replace with UGUI |
| `Scripts/View/` | Arystan | `BaseView` — sun dimming, panels; TODO effects |
| `Scripts/Data/` | Omar | Resources JSON loaders |
| `Scripts/Events/` | Omar | `EventDirector` — real storm profile, dust, comms delay, DONKI risk |
| `Scripts/Net/` | Omar | `ApiClient`, HTTP services, `ServiceInstaller` |
| `Scripts/Fakes/` | Omar | Offline services (also the fallback when backend fails) |
| `Resources/Data/` | Omar (format), Adlet (data), Daria (texts) | `config.json` → set `apiBaseUrl` once Render is live |

## Balance (Python port of ResourceModel + EventDirector, 3000 random missions)

Rules: background dose = cosmic rays (shield can't stop it); the shield blocks part of the EXTRA solar-storm dose;
science = work outside, extra dose x storm strength; a storm with no warning hits at the real peak hour (2.77x).

| Strategy (LS/Greenhouse/Shield/Science) | Wins |
|---|---|
| same split every sol (best one: 3/2/1/rest + station) | 47% |
| same split, no station (best: shield 2) | 47% |
| react to warnings (shield 5 + no outside work on storm sols), Weather Station ON | **92%** |
| react to warnings, no station (storm day 1 is a surprise) | 27% |
| heavy shield 3/2/4/1 | 0% — not enough science |
| no shield, max science, ignore warnings | 17% |

Winning needs reacting to events and paying for early warning. Tune in `scenario_mars.json`.
