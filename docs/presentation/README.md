# Presentation and demo video

Final materials submitted to NASA Space Apps 2026 (15 Nov 2026).

| File | What it is |
|---|---|
| `Sol_by_Sol_presentation.pdf` | 7-slide deck (1600×900), rebuilt from Dariya's design with fact fixes |
| `slides.html` | Source of the deck (Montserrat from Google Fonts, QR via qrcode-generator from cdnjs) |
| `Sol_by_Sol_demo.mp4` | 29.8 s demo video, also on YouTube: https://youtu.be/Gwsnrwm37Ds |
| `video/` | Scripts that made the video |

## Rebuild the PDF

Open `slides.html` in Chrome or Edge and print to PDF (margins: none, background graphics: on), or headless:

```bash
msedge --headless=new --no-pdf-header-footer --virtual-time-budget=10000 --print-to-pdf=Sol_by_Sol_presentation.pdf slides.html
```

## Rebuild the video

Needs Python 3 and Microsoft Edge. Run from an empty working folder:

```bash
python -m venv vid
vid/Scripts/python -m pip install edge-tts playwright imageio-ffmpeg
vid/Scripts/python -m playwright install ffmpeg
vid/Scripts/python tts.py     # voice-over -> voice/0..6.mp3 (en-US-AvaNeural, AI-generated)
vid/Scripts/python rec.py     # plays the live game (seed 13) in Edge, records rec/*.webm + marks.json
vid/Scripts/python build.py   # cuts 7 scenes, adds captions, subtitles and the "AI-generated voice" label
```

`build.py` expects `font.ttf` (Segoe UI Bold) and `fontr.ttf` (Segoe UI) in the folder; copy them from `C:/Windows/Fonts/segoeuib.ttf` and `segoeui.ttf`.

Seed 13 gives a dust storm on sol 3 and a solar storm from sol 6, so every scene in the script appears early.
The voice-over is AI-generated and must keep its on-screen label (Space Apps rules).
