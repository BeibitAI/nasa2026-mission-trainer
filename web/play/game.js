// Mars Base Trainer: browser UI. Rules live in sim.js; data comes from data/*.json
// (copied from unity/MissionTrainer/Assets/_Project/Resources/Data by the Pages workflow).
import { SYSTEMS, availablePower, simulate, makeRng, EventDirector, pickFact } from "./sim.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const r1 = (v) => Math.round(v * 10) / 10;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const params = new URLSearchParams(location.search);
const OFFLINE = params.has("offline");

const SYS_UI = {
  lifeSupport: { ico: "💨", name: "Life Support", hint: (c) => `Air & water. Needs ${c.systems.lifeSupport.upkeep} to stay steady.` },
  greenhouse: { ico: "🌱", name: "Greenhouse", hint: (c) => `Food. Needs ${c.systems.greenhouse.upkeep} to stay steady.` },
  shield: { ico: "🛡️", name: "Storm Shield", hint: () => "Blocks extra radiation, only in solar storms." },
  science: { ico: "🔬", name: "Science", hint: () => "Work outside: +1 point per power." },
};
const FAIL_TEXT = {
  air: "The air ran out.",
  food: "The food ran out.",
  dose: "Too much radiation: the crew had to go home.",
  science: "Time is up before the science goal.",
};

let D = {};   // loaded data
let G = null; // current game

// ---------------------------------------------------------------- data
async function loadJson(name) {
  const res = await fetch(`data/${name}.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${name}.json: HTTP ${res.status}`);
  return res.json();
}

async function fetchWithTimeout(url, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), (D.config?.requestTimeoutSec || 6) * 1000);
  try {
    const res = await fetch(url, { ...opts, signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function loadSpaceWeather() {
  if (OFFLINE) return D.snapshot;
  try {
    const sw = await fetchWithTimeout(`${D.config.apiBaseUrl}/api/spaceweather?days=30`);
    if (sw && typeof sw.cmeCount === "number") return sw;
  } catch { /* fall through to the bundled snapshot */ }
  return { ...D.snapshot, live: false };
}

// ---------------------------------------------------------------- game state
function newGame() {
  const seed = params.has("seed") ? Number(params.get("seed")) : (Math.random() * 2 ** 32) >>> 0;
  G = {
    seed,
    sessionId: `web-${seed.toString(36)}-${Date.now().toString(36)}`,
    director: new EventDirector(D.scenario, D.events, D.radiation, D.sw, makeRng(seed)),
    state: { ...D.scenario.start },
    sol: 0,
    station: false,       // powered this sol
    stationFrom: Infinity, // first sol the station gives warnings
    alloc: null, cond: null, result: null, history: [], phase: "allocate", reqId: 0,
  };
  startSol(1);
}

const hasStation = (sol) => G.station && G.stationFrom <= sol;
const stationCost = () => (G.station ? D.scenario.weatherStationPowerCost : 0);
const totalPower = () => Math.max(0, availablePower(D.scenario, G.cond) - stationCost());
const used = () => SYSTEMS.reduce((n, k) => n + G.alloc[k], 0);
const free = () => totalPower() - used();

function defaultAlloc() {
  const s = D.scenario.systems;
  const a = { lifeSupport: s.lifeSupport.upkeep, greenhouse: s.greenhouse.upkeep, shield: 0, science: 0 };
  let over = a.lifeSupport + a.greenhouse - totalPower();
  while (over > 0 && a.greenhouse > 0) { a.greenhouse--; over--; }
  while (over > 0 && a.lifeSupport > 0) { a.lifeSupport--; over--; }
  return a;
}

function startSol(sol) {
  G.sol = sol;
  G.cond = G.director.beginSol(sol, hasStation(sol));
  if (G.station && availablePower(D.scenario, G.cond) < D.scenario.weatherStationPowerCost) { G.station = false; G.stationFrom = Infinity; }
  G.alloc = defaultAlloc();
  G.result = null;
  G.phase = "allocate";
  render();
  askCommander("briefing");
}

function runSol() {
  if (G.phase !== "allocate") return;
  G.result = simulate(D.scenario, G.state, G.alloc, G.cond);
  G.history.push(G.result);
  G.phase = "simulate";
  render();
  const dur = matchMedia("(prefers-reduced-motion: reduce)").matches ? 400 : 1700;
  setTimeout(() => {
    G.state = { ...G.result.after };
    G.phase = "debrief";
    render();
    askCommander("debrief");
  }, dur);
}

function nextSol() {
  const out = G.result?.outcome;
  if (out === "fail" || out === "win") { showOver(); return; }
  startSol(G.sol + 1);
}

function setStation(on) {
  if (on === G.station) return;
  if (on) {
    if (free() < D.scenario.weatherStationPowerCost) return;
    G.station = true;
    G.stationFrom = G.sol + 1;
  } else {
    G.station = false;
    G.stationFrom = Infinity;
  }
  render();
}

function changeAlloc(key, delta) {
  if (G.phase !== "allocate") return;
  if (delta > 0 && free() <= 0) return;
  if (delta < 0 && G.alloc[key] <= 0) return;
  G.alloc[key] += delta;
  render();
}

// ---------------------------------------------------------------- commander
const surpriseIn = (r) => r?.conditions.active.some((a) => !a.known);

function commanderEvents(phase) {
  if (phase === "briefing") return G.cond.active.filter((a) => a.known).map((a) => ({ id: a.def.id, fact: a.def.fact }));
  const ev = G.result.conditions.active.map((a) => ({ id: a.def.id, fact: a.def.fact }));
  if (surpriseIn(G.result)) ev.push({ id: "comms_delay", fact: D.scenario.commsDelayFact });
  return ev;
}

function localReply(phase, outcome, events) {
  const fb = D.fallback;
  let text = pick(fb[phase === "briefing" ? "briefing" : outcome] || fb.ok);
  if (phase === "debrief" && events[0]?.fact) text = `${events[0].fact} ${text}`;
  return { text, tip: pick(fb.tips), source: "local" };
}

async function askCommander(phase) {
  const id = ++G.reqId;
  const events = commanderEvents(phase);
  const r = G.result;
  const outcome = phase === "debrief" ? r.outcome : "ok";
  showCommander({ text: "Commander Nova is thinking…", tip: "", source: "wait" });
  const body = {
    sessionId: G.sessionId, scenario: "mars", sol: G.sol, phase,
    allocation: phase === "debrief" ? r.allocation : G.alloc,
    before: phase === "debrief" ? r.before : G.state,
    after: phase === "debrief" ? r.after : G.state,
    events, outcome,
  };
  let reply = null;
  if (!OFFLINE) {
    try {
      reply = await fetchWithTimeout(`${D.config.apiBaseUrl}/api/commander`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!reply?.text) reply = null;
    } catch { reply = null; }
  }
  if (id !== G.reqId) return; // a newer request replaced this one
  showCommander(reply || localReply(phase, outcome, events));
}

function showCommander(rep) {
  const box = $("commander");
  box.classList.toggle("thinking", rep.source === "wait");
  $("cmdText").textContent = rep.text;
  $("cmdTip").textContent = rep.tip ? `💡 ${rep.tip}` : "";
  const ai = rep.source === "gemini" || rep.source === "cache";
  $("cmdBadge").textContent = rep.source === "wait" ? "" : ai ? "written by AI (Google Gemini)" : "built-in message";
  const over = $("overCmd");
  if (over && rep.source !== "wait") over.textContent = rep.text;
}

// ---------------------------------------------------------------- rendering
function render() {
  $("app").dataset.phase = G.phase;
  renderHeader();
  renderBars();
  renderScene();
  renderPanel();
}

function renderHeader() {
  const n = D.scenario.sols;
  $("solLabel").textContent = `Sol ${G.sol} of ${n}`;
  const lost = G.result?.outcome === "fail" && G.phase !== "simulate";
  $("solDots").innerHTML = Array.from({ length: n }, (_, i) => {
    const s = i + 1;
    const cls = s < G.sol ? "done" : s === G.sol ? (lost ? "lost" : "now") : "";
    return `<li class="${cls}" title="Sol ${s}"></li>`;
  }).join("");
}

function renderBars() {
  const st = G.state, cfg = D.scenario, goal = cfg.systems.science.goal;
  const bar = (label, value, max, color, cls, extra = "") => `
    <div class="bar ${cls}">
      <div class="bar-head"><span>${label}</span><span class="v">${value}</span></div>
      <div class="track"><div class="fill" style="width:${Math.min(100, (parseFloat(value) / max) * 100)}%;background:${color}"></div>${extra}</div>
    </div>`;
  const lvl = (v) => (v < 30 ? "danger" : v < 50 ? "low" : "");
  const dose = st.dose;
  $("bars").innerHTML =
    bar("💨 Air & water", Math.round(st.air), 100, "var(--air)", lvl(st.air)) +
    bar("🌱 Food", Math.round(st.food), 100, "var(--food)", lvl(st.food)) +
    bar("☢️ Radiation", `${Math.round(dose)} / ${cfg.doseLimit}`, cfg.doseLimit, "var(--dose)",
      dose > cfg.doseLimit * 0.7 ? "danger" : dose > cfg.doseLimit * 0.5 ? "low" : "") +
    bar("🔬 Science", `${st.science} / ${goal}`, goal, "var(--science)", "");
}

function stormState() {
  // Storm visuals: during allocation only what the crew knows; after the sol runs, the truth.
  const act = G.cond.active.filter((a) => G.phase !== "allocate" || a.known);
  return {
    solar: act.some((a) => a.def.useRealRadiationProfile),
    dust: act.some((a) => a.def.solarFactor < 1),
  };
}

function renderScene() {
  const a = G.alloc, sf = G.cond.solarFactor;
  const { solar, dust } = stormState();
  const station = G.station;
  const sky = dust ? ["#6b3d22", "#d0925a"] : ["#2a1530", "#c46a42"];
  const stars = dust ? "" : [[40, 30], [120, 60], [200, 25], [300, 50], [380, 20], [450, 70], [90, 100], [610, 110]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#fff" opacity=".55"/>`).join("");
  const plants = Array.from({ length: Math.min(6, a.greenhouse * 2) }, (_, i) =>
    `<ellipse cx="${448 + i * 12}" cy="${246 - (i % 2) * 3}" rx="5" ry="8" fill="#5fcf6a"/>`).join("");
  const rays = solar ? Array.from({ length: 18 }, (_, i) =>
    `<line class="ray" x1="${300 + i * 20}" y1="${-10 + (i % 4) * 25}" x2="${286 + i * 20}" y2="${6 + (i % 4) * 25}" style="animation-delay:${(i * 0.06).toFixed(2)}s"/>`).join("") : "";
  const dustLines = dust ? Array.from({ length: 9 }, (_, i) =>
    `<line class="dust-line" x1="0" y1="${130 + i * 17}" x2="${30 + (i % 3) * 14}" y2="${130 + i * 17}" style="animation-delay:${(i * 0.27).toFixed(2)}s"/>`).join("") : "";
  const shieldOp = a.shield > 0 ? 0.12 + a.shield * 0.05 : 0;
  const winOn = G.state.air > 0 ? "#ffe39a" : "#555";

  $("scene").innerHTML = `
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b35a2e"/><stop offset="1" stop-color="#7a3518"/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stop-color="#fff3c4" stop-opacity=".8"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="640" height="300" fill="url(#sky)"/>
    ${stars}
    <g opacity="${(0.3 + 0.7 * sf).toFixed(2)}">
      <circle cx="560" cy="62" r="60" fill="url(#glow)"/>
      <circle cx="560" cy="62" r="22" fill="#fff0c0"/>
    </g>
    <path d="M0 205 L70 182 L150 192 L235 160 L300 128 L345 118 L395 140 L470 150 L545 178 L640 168 L640 300 L0 300Z" fill="#8c4224"/>
    <path d="M0 222 Q160 208 320 218 T640 214 L640 300 L0 300Z" fill="url(#ground)"/>
    ${dust ? '<rect width="640" height="300" fill="#d79a5f" opacity=".28"/>' : ""}
    ${solar ? '<rect class="blink" width="640" height="300" fill="#ff4d6d" opacity=".14"/>' : ""}

    <!-- solar panels -->
    <g>
      ${[0, 1, 2].map((i) => `<g transform="translate(${30 + i * 52} 236)">
        <line x1="20" y1="10" x2="20" y2="24" stroke="#555" stroke-width="3"/>
        <polygon points="0,10 40,10 46,-4 6,-4" fill="#1d3a6b" stroke="#8fb3ff" stroke-width="1"/>
        <polygon points="0,10 40,10 46,-4 6,-4" fill="#9cc4ff" opacity="${(0.35 * sf).toFixed(2)}"/></g>`).join("")}
    </g>

    <!-- weather station -->
    ${station ? `<g>
      <line x1="225" y1="250" x2="225" y2="170" stroke="#ddd" stroke-width="3"/>
      <ellipse class="spin" cx="225" cy="166" rx="12" ry="5" fill="none" stroke="#ddd" stroke-width="2"/>
      <circle class="blink" cx="225" cy="158" r="4" fill="#9d8cff"/>
    </g>` : ""}

    <!-- habitat -->
    <g>
      <path d="M262 252 A68 52 0 0 1 398 252 Z" fill="#ece5da" stroke="#a89f94" stroke-width="2"/>
      <rect x="258" y="250" width="144" height="8" rx="3" fill="#a89f94"/>
      <circle cx="305" cy="228" r="7" fill="${winOn}"/><circle cx="330" cy="220" r="7" fill="${winOn}"/><circle cx="355" cy="228" r="7" fill="${winOn}"/>
      <rect x="320" y="236" width="20" height="16" rx="4" fill="#6e6158"/>
    </g>

    <!-- greenhouse -->
    <g>
      <path d="M432 254 L432 236 A26 20 0 0 1 528 236 L528 254 Z" fill="#9ee6a8" fill-opacity="${a.greenhouse > 0 ? 0.35 : 0.15}" stroke="#d9ffe0" stroke-width="2"/>
      ${plants}
    </g>

    <!-- storm shield -->
    ${shieldOp ? `<ellipse cx="330" cy="250" rx="118" ry="88" fill="#9d8cff" fill-opacity="${shieldOp.toFixed(2)}" stroke="#c4b9ff" stroke-width="2" stroke-dasharray="6 5"/>` : ""}

    <!-- astronaut doing science -->
    ${a.science > 0 ? `<g transform="translate(540 232)"><g class="walker">
        <circle cx="0" cy="0" r="7" fill="#f4f4f4"/><circle cx="2" cy="-1" r="4" fill="#3a4a6a"/>
        <rect x="-6" y="6" width="12" height="15" rx="4" fill="#f4f4f4"/>
        <rect x="-5" y="20" width="4" height="9" fill="#ddd"/><rect x="1" y="20" width="4" height="9" fill="#ddd"/>
        <rect x="-10" y="8" width="4" height="9" rx="2" fill="#ccc"/>
      </g></g>` : ""}

    ${dustLines}
    ${rays}`;

  const tags = [];
  if (solar) tags.push('<span class="tag storm">☢️ Solar storm!</span>');
  if (dust) tags.push('<span class="tag dust">🌪️ Dust storm: half power</span>');
  if (!solar && !dust) tags.push('<span class="tag">☀️ Calm sol</span>');
  if (station) tags.push(`<span class="tag station">📡 Weather Station${hasStation(G.sol + 1) && !hasStation(G.sol) ? " (ready next sol)" : ""}</span>`);
  $("sceneTags").innerHTML = tags.join("");
}

function renderPanel() {
  const p = $("panel");
  if (G.phase === "allocate") p.innerHTML = allocateHtml();
  else if (G.phase === "simulate") p.innerHTML = `
    <div class="running"><h2>Sol ${G.sol} is running…</h2>
      <div class="progress" style="--dur:1.7s"><div></div></div>
      <p class="muted small">The crew is following your plan.</p></div>`;
  else p.innerHTML = debriefHtml();
  bindPanel();
}

function allocateHtml() {
  const cfg = D.scenario, total = totalPower(), base = availablePower(cfg, G.cond);
  const notes = G.cond.notes
    .filter((n) => n.kind !== "intro") // intro text is on the start screen
    .map((n) => `<div class="note ${n.kind}${n.id ? ` event-${n.id}` : ""}">${esc(n.text)}</div>`).join("");
  const tokens = Array.from({ length: total }, (_, i) => `<span class="token${i >= free() ? " used" : ""}"></span>`).join("");
  const cards = SYSTEMS.map((k) => {
    const ui = SYS_UI[k];
    return `<div class="sys ${k}">
      <span class="ico" aria-hidden="true">${ui.ico}</span><span class="name">${ui.name}</span><span class="hint">${esc(ui.hint(cfg))}</span>
      <div class="ctrl">
        <button class="step" data-k="${k}" data-d="-1" aria-label="Less power to ${ui.name}" ${G.alloc[k] <= 0 ? "disabled" : ""}>−</button>
        <span class="val" aria-live="polite">${G.alloc[k]}</span>
        <button class="step" data-k="${k}" data-d="1" aria-label="More power to ${ui.name}" ${free() <= 0 ? "disabled" : ""}>+</button>
      </div></div>`;
  }).join("");
  const cost = cfg.weatherStationPowerCost;
  const canOn = G.station || free() >= cost;
  const s = cfg.systems;
  let hint = "";
  if (G.alloc.lifeSupport < s.lifeSupport.upkeep) hint = "⚠️ Life Support is below 3: the air will drop.";
  else if (G.alloc.greenhouse < s.greenhouse.upkeep) hint = "⚠️ Greenhouse is below 2: the food will drop.";
  else if (free() > 0) hint = `You still have ${free()} power left.`;

  return `
    <div class="notes">${notes}</div>
    <div class="power"><span class="power-label">⚡ Power: ${free()} of ${total} left</span><span class="tokens">${tokens}</span></div>
    ${base < cfg.powerPerSol ? `<div class="muted small">The dust blocks the Sun: only ${base} power today.</div>` : ""}
    <div class="systems">${cards}</div>
    <div class="station">
      <span class="ico" style="font-size:26px" aria-hidden="true">📡</span>
      <div class="txt"><b>Weather Station</b><br>Costs ${cost} power every sol. Warns about solar storms one sol early (starts next sol).</div>
      <button class="switch" id="swStation" role="switch" aria-checked="${G.station}" aria-label="Weather Station" ${canOn ? "" : "disabled"}></button>
    </div>
    ${hint ? `<div class="hint-line">${esc(hint)}</div>` : ""}
    <button class="go" id="btnRun">▶ Run sol ${G.sol}</button>`;
}

const srcById = (id) => D.sources.sources.find((s) => s.id === id);
const srcLink = (id) => {
  const s = srcById(id);
  return s ? `<a class="src" href="${esc(s.url)}" target="_blank" rel="noopener">Source: ${esc(s.provider)} — ${esc(s.title)}</a>` : "";
};
const fmtDate = (iso, plusDays) => new Date(Date.parse(iso) + plusDays * 864e5)
  .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function debriefHtml() {
  const r = G.result, cfg = D.scenario, s = cfg.systems;
  const d = (k) => r1(r.after[k] - r.before[k]);
  const sign = (v) => (v > 0 ? `+${v}` : `${v}`);
  const cls = (v, good = 1) => (v === 0 ? "same" : v * good > 0 ? "up" : "down");
  const chg = (label, k, good = 1) => `<div class="chg">${label} <b class="${k === "dose" ? (d(k) > 0 ? "dose-up" : "same") : cls(d(k), good)}">${sign(d(k))}</b></div>`;

  const a = r.allocation;
  const m = r.conditions.radiationMultiplier, storm = Math.max(0, m - 1);
  const everyday = cfg.baseDosePerSol;
  const stormExtra = cfg.baseDosePerSol * storm * (1 - r.shieldReduction);
  const outside = cfg.outsideDosePerScienceUnit * a.science * m;
  const why = [
    `💨 Life Support got <b>${a.lifeSupport}</b> (needs ${s.lifeSupport.upkeep}) → air ${sign(d("air"))}.`,
    `🌱 Greenhouse got <b>${a.greenhouse}</b> (needs ${s.greenhouse.upkeep}) → food ${sign(d("food"))}.`,
    `☢️ Everyday space radiation: +${r1(everyday)}${storm > 0 ? `. Solar storm extra: +${r1(stormExtra)}${r.shieldReduction > 0 ? ` (the shield blocked ${Math.round(r.shieldReduction * 100)}%)` : " (no shield!)"}` : ""}${outside > 0 ? `. Working outside: +${r1(outside)}` : ""}.`,
  ];
  if (storm === 0 && a.shield > 0) why.push("🛡️ No storm today, so the shield had nothing to block.");

  const events = r.conditions.active.map((ev) => {
    const real = ev.def.useRealRadiationProfile;
    const rd = D.radiation.events?.[0];
    const realLine = real && rd ? `<p><b>Today: ×${r1(ev.radiationMultiplier)} normal radiation</b> (${ev.known ? `Curiosity daily average, ${fmtDate(rd.realDate, ev.dayIndex)}` : `Curiosity's real peak hour, ${fmtDate(rd.realDate, 0)}`}).</p>` : "";
    const surprise = !ev.known ? `<p class="surprise">⚡ Surprise! ${esc(cfg.commsDelayFact)}</p>${srcLink("comms_delay")}<br>` : "";
    return `<div class="event-card ${ev.def.id}"><h3>${ev.def.id === "dust_storm" ? "🌪️" : "☢️"} ${esc(ev.def.title)} (day ${ev.dayIndex + 1} of ${ev.def.durationSols})</h3>
      ${realLine}<p>${esc(ev.def.fact)}</p>${surprise}${srcLink(ev.def.sourceId)}</div>`;
  }).join("");

  const f = pickFact(D.facts.facts, r);
  const fact = f ? `<a class="science-card" href="${esc(f.url)}" target="_blank" rel="noopener">
      <div class="k">🧪 Real science</div><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p>
      <div class="src">NASA OSDR study ${esc(f.studyId)} ↗</div></a>` : "";

  const end = r.outcome === "fail" || r.outcome === "win";
  const head = r.outcome === "win" ? "🏆 Mission complete!" : r.outcome === "fail" ? `🛰️ ${FAIL_TEXT[r.failReason] || "Mission over."}` : `Sol ${G.sol} report`;
  return `
    <h2>${head}</h2>
    <div class="changes">${chg("💨 Air", "air")}${chg("🌱 Food", "food")}${chg("☢️ Dose", "dose")}${chg("🔬 Science", "science")}</div>
    <div class="why">${why.join("<br>")}</div>
    ${events}
    ${fact}
    <button class="go" id="btnNext">${end ? "See mission result →" : `Start sol ${G.sol + 1} →`}</button>`;
}

function bindPanel() {
  $("panel").querySelectorAll(".step").forEach((b) => b.addEventListener("click", () => changeAlloc(b.dataset.k, Number(b.dataset.d))));
  $("swStation")?.addEventListener("click", () => setStation(!G.station));
  $("btnRun")?.addEventListener("click", runSol);
  $("btnNext")?.addEventListener("click", nextSol);
}

// ---------------------------------------------------------------- overlays
function openOverlay(html) {
  const o = $("overlay");
  o.innerHTML = `<div class="card" role="dialog" aria-modal="true">${html}</div>`;
  o.hidden = false;
  o.querySelector("button")?.focus();
}
const closeOverlay = () => { $("overlay").hidden = true; $("overlay").innerHTML = ""; };

function showIntro() {
  const cfg = D.scenario, sw = D.sw;
  const sun = new EventDirector(cfg, { events: [] }, D.radiation, sw, Math.random).realSunNote();
  openOverlay(`
    <div class="big">🚀</div>
    <h1>Mars Base Trainer</h1>
    <p>You are the commander of a small base in <b>Gale Crater on Mars</b>. Every <b>sol</b> (a Mars day) you share the solar power between four systems.</p>
    <ul>
      <li>💨 <b>Life Support</b> needs ${cfg.systems.lifeSupport.upkeep} power for air and water.</li>
      <li>🌱 <b>Greenhouse</b> needs ${cfg.systems.greenhouse.upkeep} power for food.</li>
      <li>🛡️ <b>Storm Shield</b> blocks extra radiation, but only during solar storms.</li>
      <li>🔬 <b>Science</b> is why we came: get ${cfg.systems.science.goal} points.</li>
    </ul>
    <p><b>To win:</b> survive all ${cfg.sols} sols, keep the radiation dose under ${cfg.doseLimit} and reach ${cfg.systems.science.goal} science.</p>
    <div class="note sun">${esc(sun)}</div>
    <div class="row"><button class="go" id="btnStart">Start the mission</button></div>
    <p class="fine">Storms use real radiation measured by NASA's Curiosity rover. Commander Nova's words are written by AI (Google Gemini) from the game's numbers.</p>`);
  $("btnStart").addEventListener("click", () => { closeOverlay(); newGame(); });
}

function showOver() {
  const r = G.result, win = r.outcome === "win";
  G.phase = "over";
  $("app").dataset.phase = "over";
  const solsDone = win ? D.scenario.sols : r.sol;
  openOverlay(`
    <div class="big">${win ? "🏆" : "🛰️"}</div>
    <h1>${win ? "Mission complete!" : "Mission over"}</h1>
    <p>${win ? "You kept the crew safe and finished the science." : esc(FAIL_TEXT[r.failReason] || "")}</p>
    <div class="stats">
      <div class="stat"><b>${solsDone}/${D.scenario.sols}</b>sols</div>
      <div class="stat"><b>${G.state.science}/${D.scenario.systems.science.goal}</b>science</div>
      <div class="stat"><b>${Math.round(G.state.dose)}</b>dose</div>
    </div>
    <p id="overCmd" class="muted">${$("commander").classList.contains("thinking") ? "" : esc($("cmdText").textContent)}</p>
    <div class="row"><button class="go" id="btnAgain">Play again</button><button class="go secondary" id="btnOverSrc">Data sources</button></div>`);
  $("btnAgain").addEventListener("click", () => { closeOverlay(); newGame(); });
  $("btnOverSrc").addEventListener("click", showSources);
}

function showSources() {
  const back = !G ? showIntro : G.phase === "over" ? showOver : null;
  const sw = D.sw;
  const items = D.sources.sources.map((s) => `
    <a class="src-item" href="${esc(s.url)}" target="_blank" rel="noopener">
      <small>${esc(s.provider)}</small><br><b>${esc(s.title)}</b><p>${esc(s.usedFor)}</p></a>`).join("");
  openOverlay(`
    <h1>Real NASA data in this game</h1>
    <p class="muted small">Space weather right now: ${sw.live ? "live from NASA DONKI" : `saved copy from ${esc((sw.fetchedAt || "").slice(0, 10))}`} — ${sw.cmeCount} solar eruptions in ${sw.days} days, risk ${esc(sw.riskLevel)}.</p>
    <div class="src-list">${items}</div>
    <div class="row"><button class="go secondary" id="btnClose">${back ? "Back" : "Close"}</button></div>`);
  $("btnClose").addEventListener("click", () => (back ? back() : closeOverlay()));
}

// ---------------------------------------------------------------- boot
async function boot() {
  try {
    const [config, scenario, events, radiation, snapshot, fallback, facts, sources] = await Promise.all(
      ["config", "scenario_mars", "events", "radiation_mars", "spaceweather_snapshot", "commander_fallback", "facts", "sources"].map(loadJson));
    D = { config, scenario, events, radiation, snapshot, fallback, facts, sources };
  } catch (e) {
    $("solLabel").textContent = "Could not load mission data.";
    $("cmdText").textContent = `Something went wrong: ${e.message}. Please reload the page.`;
    return;
  }
  $("solLabel").textContent = "Checking the real Sun…";
  D.sw = await loadSpaceWeather();
  $("solLabel").textContent = "Ready";
  $("cmdText").textContent = "Hi! I'm Commander Nova. Press Start when you're ready.";

  $("btnSources").addEventListener("click", showSources);
  $("btnFull").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.fullscreenEnabled) document.documentElement.requestFullscreen().catch(() => window.open(location.href, "_blank"));
    else window.open(location.href, "_blank");
  });
  $("overlay").addEventListener("click", (e) => { if (e.target.id === "overlay" && G && G.phase !== "over") closeOverlay(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("overlay").hidden && G && G.phase !== "over") closeOverlay();
  });
  showIntro();
}

boot();
