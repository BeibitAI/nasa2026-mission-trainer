# Project submission texts

Готовые тексты для страницы проекта на spaceappschallenge.org (My Team → Project → Edit).
Поля и правила взяты из [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) (проверено Сб 14.11).
Ограничений по объёму у полей нет. Всё на странице проекта — **только на английском**.

**ПОДАНО: Вс 15.11.2026 23:29 (Алматы), статус «Project Submitted for Judging».**
Публичная страница: https://www.spaceappschallenge.org/2026/find-a-team/beibitai/?tab=project
Ниже — тексты ровно в том виде, в каком они отправлены.

- [x] Финальное название: **Sol by Sol: Mars Base Trainer**
- [x] Ссылка на видео-демо вставлена, открывается без входа (https://youtu.be/Gwsnrwm37Ds, 29,8 с)
- [x] Описание совпадает с финальной сборкой
- [x] Роли команды проверены (Арыстан — lead engineer)
- [x] ИИ-голос в видео подписан на экране («AI-generated voice») и указан в Use of SI и в описании YouTube
- [x] Нажато **Submit for Judging**

---

## Project Name

> Sol by Sol: Mars Base Trainer

---

## High-Level Project Summary

> Sol by Sol is a free browser game for kids aged 7–12 that turns them into the commander of a small base in Gale Crater on Mars. Every sol (a Mars day), the player splits 10 power units between life support, the greenhouse, a storm shield and rover trips that collect rock samples to send to Earth. Dust storms cut solar power, and solar storms raise radiation. The storm in the game is real: it uses the radiation that NASA's Curiosity rover measured at Gale Crater on 11–12 September 2017. Because radio messages take 4–24 minutes to cross from Earth, players must decide whether to pay power for a local Weather Station that warns them in time. Live NASA DONKI space-weather data changes how likely storms are, and a friendly AI Commander explains in simple words why each choice led to what happened. There is no free safe choice: kids learn the real trade-offs mission planners face, and see the NASA data behind every event.

---

## Link to Project Demo

https://youtu.be/Gwsnrwm37Ds

(29,8 с, запись настоящей игры, английские субтитры, ИИ-голос с пометкой на экране. Файл и сценарий сборки: [presentation/](presentation/README.md).)

## Link to Final Project

https://beibitai.github.io/nasa2026-mission-trainer/

(Сайт со встроенной игрой. Игра отдельно: https://beibitai.github.io/nasa2026-mission-trainer/play/ . Репозиторий указан в Detailed Description.)

---

## Detailed Project Description

> **What it does**
>
> Sol by Sol is a turn-based base-management game that runs in any modern browser, on a computer or a phone, with no download or sign-up. It is available in English and Russian (one button switches the language, including Commander Nova's AI replies). The player survives a 14-sol mission at Gale Crater, Mars, and must send 32 rock samples to Earth.
>
> Each sol has four steps:
> 1. **Briefing** – Commander Nova reports the base status and space weather.
> 2. **Share the power** – 10 power units go to Life Support (air and water), Greenhouse (food), Storm Shield and the Rover (an astronaut drives out for rock samples; a rocket sends them to Earth). A Weather Station can also be switched on for 1 power per sol. A dust storm halves the power.
> 3. **The sol happens** – the base reacts to events: dust storms, and a solar particle storm based on real Curiosity measurements.
> 4. **Debrief** – the Commander explains *why* the bars changed, and a "Real science" card shares a real NASA space-biology study.
>
> **Real trade-offs, no free safe choice**
>
> Every unit of power has a cost. Shielding every sol wastes power and the sample goal is missed. Never shielding lets a storm push the radiation dose over the limit. Every rover trip is work outside and adds radiation dose, so sending too many trips, especially during a storm, is risky. Without the Weather Station, the first storm day can be a surprise – the game's way of teaching the communication delay between Earth and Mars. We balanced the rules with a Python simulation of thousands of random missions, so that planning ahead and reacting to storm warnings is what wins.
>
> **How NASA data drives the game**
>
> - **Curiosity RAD (via NASA OSDR RadLab API):** the solar storm uses the real daily dose rates at Gale Crater on 11–12 Sep 2017 – 2.29× and 1.65× the quiet level (≈ 7.8 µGy/h). A storm that arrives without warning uses the real peak hour, 2.77×.
> - **NASA DONKI:** our server reads the last 30 days of solar eruptions (CME), geomagnetic storms and particle events. Medium or high real-world risk makes storms 1.2× or 1.5× more likely in the player's mission. If live data is unavailable, a saved copy is used and labelled "data as of <date>" — saved data is never shown as live.
> - **NASA OSDR:** five "Real science" cards from studies OSD-476 (plants grown in Apollo lunar soil), OSD-268 (lettuce grown on the ISS), OSD-210 (seeds exposed to cosmic radiation), OSD-342 (mice on the ISS losing muscle and bone) and OSD-418 (Mars-gravity muscle study).
> - **NASA sources** for rock sample return (Perseverance seals rock cores in tubes for return to Earth), the communication delay (4–24 minutes), the 2018 dust storm that silenced the Opportunity rover, and the astronaut radiation limit (NASA-STD-3001).
>
> Every source is listed inside the game (the "Data sources" button) and on our website, with links. Each storm card in the game shows the real number for that day (for example, "×2.3 normal radiation, Curiosity daily average, 11 Sep 2017") with a link to its source. The website also explains exactly what we simplified (for example: dose is shown in game points, not sieverts; storm strength is real).
>
> **AI Commander**
>
> Commander Nova's short briefing before each sol and explanation after it are generated by Google Gemini from the game's own numbers only, and the game labels them "written by AI (Google Gemini)". The model is instructed to use simple words for a 7-year-old, to be encouraging, and never to invent data. Requests go through our server (the API key is never in the browser), with rate limiting and caching. If the AI is unavailable, the game uses pre-written texts, so it always works.
>
> **Safe for children**
>
> No sign-up, no personal data, no free-text chat, no ads. Only game numbers are sent to the AI.
>
> **Benefits and goals**
>
> Space can feel either too abstract or too complicated for children. Sol by Sol lets them *feel* a real mission trade-off in a few minutes, and shows that the events come from real NASA measurements. We hope teachers can use it as a 15-minute classroom activity about Mars, radiation and planning. Next steps: a Moon scenario (we already process LRO CRaTER radiation data from the same 2017 storm), a classroom mode, and more languages (Russian is already in; Kazakh is next).
>
> **Tools and technologies**
>
> - Game: HTML, CSS and JavaScript (no engine, no download). The Mars base is a 3D scene in three.js built from our own Blender models; it reacts to every choice (shield dome, weather mast, rover driving out, rocket launch, dust fog, storm particles). Browsers without WebGL get a flat SVG version. The rules were first prototyped in Unity 6 (C#) and in a Python balance simulation, then ported to JavaScript.
> - Backend: Python, FastAPI, httpx, Google Gemini API (google-genai SDK), hosted on Render.
> - 3D models: Blender (habitat, greenhouse, solar panels, weather station, shelter, battery, astronaut, rocks, and a crewed six-wheel rover), exported as FBX.
> - Data pipeline: Python script that downloads Curiosity RAD data from the NASA OSDR RadLab API.
> - Website and game hosting: GitHub Pages (deployed with GitHub Actions).
> - Demo video: screen recording of the real game; the voice-over is AI-generated (Microsoft neural text-to-speech) and labelled on screen.
> - Code: https://github.com/BeibitAI/nasa2026-mission-trainer
>
> **Team BeibitAI (Kazakhstan):** Adlet (captain, game logic, backend, AI and data), Arystan (lead engineer), Omar (testing and gameplay recording), Bexultan (3D artist), Muhammad (website), Dariya (demo, presentation and texts).

---

## Use of Super Intelligence (SI)

(Это поле судьи не видят, оно для статистики. Но судьи видят пометки в самом проекте — README и раздел на сайте уже есть.)

Отмеченные варианты (8 из 10): генерация идей; исследование и сбор информации; анализ и интерпретация данных; внедрение SI/ML в проект; программирование и отладка; написание, редактирование и перевод текстов; визуальный дизайн; презентация, видео или аудио. Не отмечены: «другие виды» и «не использовали SI».

> **Inside the game:** Google Gemini (model "gemini-flash-lite-latest", via our FastAPI server) writes Commander Nova's short briefings and explanations from the game's own numbers only. Every AI text is labelled in the game as "written by AI (Google Gemini)". Pre-written texts are used if the AI fails.
>
> **During development:** our team chose the challenge and designed the game concept (a Mars base run sol by sol, with real NASA radiation data). We used Claude (Anthropic) as an assistant for planning tasks, researching and checking NASA sources, processing data, writing and reviewing code (JavaScript, Python, C#, HTML/CSS), translating texts into Russian, drafting documentation, and laying out the presentation slides. Team members reviewed, tested and edited everything. AI assistance is acknowledged in the repository README and on our website ("How we used AI").
>
> **Video and audio:** the demo video is a screen recording of the real game. Its voice-over is AI-generated (Microsoft neural text-to-speech) and is labelled on screen ("AI-generated voice") and in the video description.
>
> **Images:** no AI-generated images. All 3D models were made by our team in Blender; the fallback scene is drawn in code with SVG. No NASA logos, flags or mission identifiers were generated or used.

---

## NASA Data

> 1. **Curiosity Mars Science Laboratory – Radiation Assessment Detector (MSL-RAD), via the NASA OSDR RadLab API.** Hourly absorbed dose rate at Gale Crater, 2017. We use the solar particle event of 11–12 Sep 2017 (daily means 2.29× and 1.65× the quiet baseline, peak hour 2.77×) as the game's solar storm. https://visualization.osdr.nasa.gov/radlab/
> 2. **NASA DONKI – Space Weather Database Of Notifications, Knowledge, Information (CCMC), via api.nasa.gov.** Coronal mass ejections, geomagnetic storms, solar energetic particle events and notifications from the last 30 days set the storm risk in each mission. https://ccmc.gsfc.nasa.gov/tools/DONKI/
> 3. **NASA Open Science Data Repository (OSDR).** "Real science" cards from studies OSD-476, OSD-268, OSD-210, OSD-342 and OSD-418. https://osdr.nasa.gov/bio/repo/
> 4. **NASA – Space Communications: 7 Things You Need to Know** (Earth–Mars signal delay). https://www.nasa.gov/missions/tech-demonstration/space-communications-7-things-you-need-to-know/
> 5. **NASA – Opportunity rover mission comes to end** (2018 planet-wide dust storm). https://www.nasa.gov/news-release/nasas-record-setting-opportunity-rover-mission-on-mars-comes-to-end/
> 6. **NASA-STD-3001 radiation protection technical brief** (astronaut radiation limit). https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf
> 7. **NASA – Mars Rock Samples** (Perseverance sample tubes, planned return to Earth). https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/
> 8. *(Processed, planned for the Moon scenario, not in the Mars game yet; not listed on the submission page)* **LRO CRaTER** dose data from the same September 2017 event, via the OSDR RadLab API.

На странице подачи пункты 1–7 добавлены ссылками (поле «Текст ссылки» + URL).

---

## Space Agency Partner Data and Other References

> **Space Agency Partner data:** not used in this version.
>
> **Scientific publications behind the "Real science" cards:**
> - Paul, A.-L. et al. (2022). Plants grown in Apollo lunar regolith present stress-associated transcriptomes that inform prospects for lunar exploration. *Communications Biology*. doi:10.1038/s42003-022-03334-8 (OSD-476)
> - Khodadad, C. L. M. et al. (2020). Microbiological and Nutritional Analysis of Lettuce Crops Grown on the International Space Station. *Frontiers in Plant Science*. doi:10.3389/fpls.2020.00199 (OSD-268)
> - Lee, S.-J. et al. (2020). Targeting myostatin/activin A protects against skeletal muscle and bone loss during spaceflight. *PNAS*. doi:10.1073/pnas.2014716117 (OSD-342)
> - OSD-210 (Approaches for surveying cosmic radiation damage in large populations of *Arabidopsis thaliana* seeds – an Antarctic example) and OSD-418 (gastrocnemius of rats under partial weight bearing mimicking Martian gravity): study pages on NASA OSDR.
>
> **Software and services:** HTML/CSS/JavaScript, three.js r160 (MIT license, 3D rendering), Unity 6 (early prototype), Blender, Python, FastAPI, Uvicorn, Pydantic, httpx, google-genai SDK, Google Gemini API, Render (hosting), GitHub Pages and GitHub Actions.
>
> **Assets:** all game code, 3D models, graphics and the website were made by our team during the hackathon. Third-party code: three.js (MIT license). The game uses no third-party images, fonts, sounds or music (system fonts and emoji only). The presentation slides use the Montserrat font (SIL Open Font License) and qrcode-generator (MIT license); the demo video voice was made with edge-tts (Microsoft neural TTS).
>
> **SI tools:** Google Gemini (in-game AI Commander), Claude by Anthropic (development assistant), Microsoft neural TTS (demo video voice) – see "Use of SI".

Ссылки, добавленные на странице подачи (13):

| Текст ссылки | URL |
|---|---|
| Paul et al. 2022 – Plants grown in Apollo lunar regolith (Communications Biology, OSD-476) | https://doi.org/10.1038/s42003-022-03334-8 |
| Khodadad et al. 2020 – Lettuce grown on the ISS (Frontiers in Plant Science, OSD-268) | https://doi.org/10.3389/fpls.2020.00199 |
| Lee et al. 2020 – Muscle and bone loss in spaceflight (PNAS, OSD-342) | https://doi.org/10.1073/pnas.2014716117 |
| Our source code (GitHub) | https://github.com/BeibitAI/nasa2026-mission-trainer |
| three.js r160 – 3D rendering (MIT license) | https://github.com/mrdoob/three.js |
| Google Gemini API – AI Commander texts | https://ai.google.dev/ |
| FastAPI – backend framework (MIT license) | https://fastapi.tiangolo.com/ |
| Render – backend hosting | https://render.com/ |
| GitHub Pages – website and game hosting | https://pages.github.com/ |
| Blender – 3D models made by our team | https://www.blender.org/ |
| edge-tts – AI voice-over for the demo video (Microsoft neural TTS) | https://github.com/rany2/edge-tts |
| Montserrat font – presentation slides (SIL Open Font License) | https://fonts.google.com/specimen/Montserrat |
| qrcode-generator – QR code on the slides (MIT license) | https://github.com/kazuhikoarase/qrcode-generator |
