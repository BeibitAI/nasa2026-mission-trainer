import json, subprocess, glob
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
m = json.load(open("marks.json")); V = glob.glob("rec/*.webm")[0]
A = 1.06
def dur(f):
    out = subprocess.run([FF, "-i", f], capture_output=True, text=True).stderr
    h, mi, s = out.split("Duration: ")[1].split(",")[0].split(":"); return int(h)*3600+int(mi)*60+float(s)
SUBS = [
 "Welcome to Sol by Sol, our Mars base mission trainer!",
 "Every Martian day starts with Commander Nova's briefing on the weather.",
 "Share ten power units: life support for air, the greenhouse for food,\nthen the shield, the rover and the weather station.",
 "Run the sol. Oh no, a dust storm cuts solar power in half!",
 "Send rock samples to Earth and watch your crew.\nSurvive all fourteen sols to win!",
 "Real NASA data, like Curiosity's radiation readings, powers every event.",
 "Play Sol by Sol now, and train like a junior astronaut!",
]
CAPS = ["Sol by Sol - Mars Base Trainer", "Briefing: weather & solar update", "Share 10 power units",
        "Run the sol - a dust storm hits!", "Collect samples, watch your crew", "Real NASA data powers the game",
        "Play now: beibitai.github.io/nasa2026-mission-trainer"]
START = [m["title"] - 0.6, m["brief1"] - 0.2, m["alloc1"] - 0.3, m["alloc3"] - 0.6, m["debrief3"] - 0.1, m["alloc7"] - 0.3, m["title"] - 0.6]
files = []
for i in range(7):
    L = dur(f"voice/{i}.mp3") / A + 0.12
    open(f"txt/s{i}.txt", "w", encoding="utf8").write(SUBS[i])
    open(f"txt/c{i}.txt", "w", encoding="utf8").write(CAPS[i])
    big = i == 6
    vf = (f"trim=start={START[i]:.2f}:duration={L:.2f},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=6,trim=duration={L:.2f},fps=30,"
          + ("boxblur=8:2,drawbox=c=black@0.45:t=fill," if big else "")
          + (f"drawtext=fontfile=font.ttf:textfile=txt/c{i}.txt:fontsize={46 if big else 30}:fontcolor=white:box=1:boxcolor=0xE8743B@0.92:boxborderw=14:"
             + (f"x=(w-tw)/2:y=(h-th)/2-40," if big else "x=24:y=78,"))
          + (f"drawtext=fontfile=font.ttf:text='Sol by Sol':fontsize=96:fontcolor=white:x=(w-tw)/2:y=(h-th)/2-160," if big else "")
          + f"drawtext=fontfile=fontr.ttf:textfile=txt/s{i}.txt:fontsize=27:fontcolor=white:line_spacing=6:box=1:boxcolor=black@0.72:boxborderw=12:x=(w-tw)/2:y=h-th-46,"
          + "drawtext=fontfile=fontr.ttf:text='AI-generated voice':fontsize=16:fontcolor=white@0.85:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-tw)/2:y=50,format=yuv420p")
    out = f"seg/{i}.mp4"
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", V, "-i", f"voice/{i}.mp3", "-filter_complex",
                    f"[0:v]{vf}[v];[1:a]atempo={A},aresample=48000,apad,atrim=duration={L:.2f}[a]",
                    "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", out], check=True)
    files.append(out)
open("seg/list.txt", "w").write("".join(f"file '{f.split('/')[1]}'\n" for f in files))
final = "Sol_by_Sol_demo.mp4"
subprocess.run([FF, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "seg/list.txt", "-c", "copy", "-movflags", "+faststart", final], check=True)
print(dur(final))
