import time, json, re
from playwright.sync_api import sync_playwright
URL = "https://beibitai.github.io/nasa2026-mission-trainer/play/?seed=13"
marks = {}
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True, args=["--use-gl=angle", "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport={"width": 1280, "height": 720}, locale="en-US",
                        record_video_dir="rec", record_video_size={"width": 1280, "height": 720})
    page = ctx.new_page()
    t0 = time.monotonic()
    mark = lambda k: marks.setdefault(k, round(time.monotonic() - t0, 2)) if k not in marks else None
    page.goto(URL)
    page.wait_for_selector("#btnStart", timeout=30000)
    page.wait_for_timeout(1500)
    mark("title")
    page.wait_for_timeout(2500)
    page.click("#btnStart")
    def wait_cmd(prev, ms=12000):
        end = time.monotonic() + ms / 1000
        while time.monotonic() < end:
            t = page.inner_text("#cmdText")
            if t and t != prev and "Getting ready" not in t and "…" not in t[-2:]:
                return t
            page.wait_for_timeout(250)
        return page.inner_text("#cmdText")
    got = {"n": 0}
    def plus(k, n=20, slow=0):
        for _ in range(n):
            if k == "science" and got["n"] >= 33: return
            btn = page.locator(f'#panel .step[data-k="{k}"][data-d="1"]')
            if btn.count() == 0 or btn.is_disabled(): return
            btn.click(); page.wait_for_timeout(slow)
            if k == "science": got["n"] += 1
    def minus(k, n=20):
        for _ in range(n):
            btn = page.locator(f'#panel .step[data-k="{k}"][data-d="-1"]')
            if btn.count() == 0 or btn.is_disabled(): return
            btn.click()
    prev = ""
    for sol in range(1, 15):
        page.wait_for_selector("#btnRun", timeout=20000)
        mark(f"brief{sol}")
        prev = wait_cmd(prev)
        mark(f"briefed{sol}")
        page.wait_for_timeout(2500 if sol in (1, 3) else 300)
        mark(f"alloc{sol}")
        body = page.inner_text("#sceneTags") + " " + page.inner_text("#panel")
        storm = sol >= 5 and bool(re.search(r"Space weather warning|Solar (particle )?storm \(day|Solar storm", body))
        print(sol, "storm" if storm else "calm", flush=True)
        if sol == 1 and page.locator("#swStation").count():
            page.click("#swStation"); page.wait_for_timeout(400)
        if storm:
            minus("science"); plus("shield", slow=150 if sol < 4 else 0)
        else:
            plus("science", slow=350 if sol in (1, 3) else 0)
        page.wait_for_timeout(1200 if sol in (1, 3) else 200)
        mark(f"run{sol}")
        page.click("#btnRun")
        page.wait_for_selector("#btnNext", timeout=20000)
        mark(f"debrief{sol}")
        prev = wait_cmd(prev)
        mark(f"debriefed{sol}")
        page.wait_for_timeout(3500 if sol in (1, 3) else 400)
        page.click("#btnNext")
        if page.locator("#btnAgain").count():
            mark("over"); break
        page.wait_for_timeout(300)
    page.wait_for_timeout(500)
    mark("over")
    page.wait_for_timeout(5000)
    mark("end")
    page.screenshot(path="over.png")
    vid = page.video.path()
    ctx.close(); b.close()
print(json.dumps(marks)); print(vid)
json.dump(marks, open("marks.json", "w"))
