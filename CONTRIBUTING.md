# CONTRIBUTING

## 0. Один раз на каждом компьютере

```bash
git lfs install
git clone https://github.com/BeibitAI/nasa2026-mission-trainer.git
```

- **Unity:** версия **`6000.3.8f1`** (Арыстан, подтверди по `unity/MissionTrainer/ProjectSettings/ProjectVersion.txt`). Создание проекта — по [unity/README.md](unity/README.md). Открывать **только эту** версию — иначе Unity переапгрейдит проект и сломает всем.
- **Python 3.11+** (для бэкенда и скриптов данных).
- Никогда не коммитим `.env` и ключи. Ключи есть только у Адлета и в Render.

## 1. Кто что редактирует (главное правило)

| Путь | Владелец | Остальным |
|---|---|---|
| `Scenes/Game.unity`, `Scenes/Boot.unity`, `ProjectSettings/`, `Packages/` | **Арыстан** | не сохранять изменения |
| `Scripts/Core`, `Sim`, `UI`, `View`, `Prefabs/Modules`, основной UI | **Арыстан** | — |
| `Scenes/Environment.unity`, `Scenes/Dev/Dev_Omar.unity` | **Омар** | — |
| `Scripts/Data`, `Net`, `Events`, `Prefabs/UI/{EventCard,DataSourcesPanel,Leaderboard}*` | **Омар** | — |
| `Scripts/Contracts/` | Арыстан + Омар | **меняем только договорившись в чате** |
| `Art/**`, `art-source/**` | **Бексултан** | — |
| `Resources/Data/*.json` | структура — Омар; данные — Адлет; тексты — Дария | — |
| `backend/`, `data-pipeline/` | **Адлет** | — |
| `web/` (кроме `web/play/`) | **Мухаммад** | — |
| `web/play/` (игра на HTML/JS) | **Адлет** | баги — в чат Адлету |
| `docs/texts/` | **Дария** | — |

Если случайно изменил чужую сцену/префаб — **не коммить**: `git checkout -- <файл>`.
Если конфликт в чужом `.unity`/`.prefab` — бери версию владельца: `git checkout --theirs <файл>` (или `--ours`, если владелец — ты).

## 2. Ветки и PR

- `main` — **всегда собирается**. Сломал `main` — чинишь первым делом.
- Работаем в ветках `имя/кратко`: `arystan/turn-loop`, `omar/api-client`, `bexultan/habitat`, `adlet/commander`.
- Маленькие PR, мерж **каждые 1–2 часа** (длинные ветки = боль).
- Свой PR в своей зоне мержишь сам. PR, меняющий `Contracts/`, `ProjectSettings/` или чужую зону, — только после ок владельца.
- Перед началом работы и перед PR: `git pull origin main`.
- Коммиты: `[area] что сделано` — например `[sim] add food decay`, `[art] habitat v1`, `[backend] donki cache`.
- Бексултан и Дария могут коммитить прямо в `main`, если трогают только свои папки.

## 3. Запуск

### Игра (веб-версия — то, что подаём)
```bash
mkdir -p web/play/data && cp unity/MissionTrainer/Assets/_Project/Resources/Data/*.json web/play/data/
python -m http.server 8000 -d web
```
Открыть `http://localhost:8000/play/` (`?seed=7` — повторяемая партия, `?offline` — без сервера). Если игра висит на «Loading» — на Windows Python может отдавать `.js` с неправильным типом: используй `npx serve web`. Выкатка: push в `main` → GitHub Actions сам копирует данные и деплоит на Pages за ~1 минуту.

### Unity (прототип, не деплоится)
Unity Hub → Add → `unity/MissionTrainer` → открыть сцену `Assets/_Project/Scenes/Boot.unity` → Play.

### Бэкенд (Адлет; локально — кому нужно)
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env          # заполнить ключи (спросить у Адлета, НЕ в общий чат)
uvicorn app.main:app --reload --port 8080
```
Проверка: `http://localhost:8080/health`.

### Лендинг
```bash
python -m http.server 8000 -d web
```
Открыть `http://localhost:8000`. **Не открывать через `file://`** — модули JS так не работают.

## 4. WebGL-сборка (Арыстан) — не используется, игра теперь веб

1. Player Settings → Publishing Settings: **Compression Format = Gzip**, **Decompression Fallback = ON** (без этого не запустится на GitHub Pages).
2. File → Build Profiles → **Web** → Build → папка **`web/play/`** (заменить содержимое).
3. Проверить локально: `python -m http.server 8000 -d web` → `http://localhost:8000/play/`.
4. Коммит **только на вехах** (M0, M1, M2, M3, RC): `[build] M1 playable loop` → push → GitHub Actions выкатит на Pages за 1–2 минуты.
5. itch.io-зеркало:
   ```bash
   butler push web/play beibitai/<game-slug>:html5
   ```
   На itch.io: Kind of project = HTML, «This file will be played in the browser», размер окна 1280×720, включить Fullscreen button.

Цель по размеру сборки: < 40 МБ. Если больше — сжать текстуры (Max Size 1024/512), убрать неиспользуемые ассеты.

## 5. 3D (Бексултан) — коротко

FBX, 1 unit = 1 м, Ctrl+A (Apply All Transforms) перед экспортом, pivot в центре основания, Forward −Z / Up Y, Apply Scalings = FBX Units Scale. Имена: `SM_Module_Habitat.fbx`, `T_Module_Habitat_BaseColor.png`, `M_Module_Habitat.mat`. Подробности — `docs/ARCHITECTURE.md` §5.

## 6. Если всё горит

Пиши в общий чат с тегом **[BLOCKER]** + что пробовал. Не сиди молча больше 20 минут.
