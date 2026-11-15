// Mars Base Trainer: browser UI. Rules live in sim.js; data comes from data/*.json
// (copied from unity/MissionTrainer/Assets/_Project/Resources/Data by the Pages workflow).
// Texts: i18n.js (English + Russian).
import { SYSTEMS, availablePower, simulate, makeRng, EventDirector, pickFact } from "./sim.js";
import { t, tr, lang, setLang, initialLang } from "./i18n.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const r1 = (v) => Math.round(v * 10) / 10;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const params = new URLSearchParams(location.search);
const OFFLINE = params.has("offline");

const ICONS = { lifeSupport: "💨", greenhouse: "🌱", shield: "🛡️", science: "🔬" };

let D = {};             // loaded data
let G = null;           // current game
let overlayView = null; // re-draws the open overlay (used after a language switch)
let S3 = null;          // 3D view (scene3d.js) once its models are loaded; SVG scene until then

// ---------------------------------------------------------------- data
async function loadJson(name) {
  const res = await fetch(`data/${name}.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${name}.json: HTTP ${res.status}`);
  return res.json();
}

async function fetchWithTimeout(url, opts = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), (D.config?.requestTimeoutSec || 6) * 1000);
  try {
    const res = await fetch(url, { ...opts, signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
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
    station: false,        // powered this sol
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
  if (phase === "briefing") return G.cond.active.filter((a) => a.known).map((a) => ({ id: a.def.id, fact: tr.evFact(a.def) }));
  const ev = G.result.conditions.active.map((a) => ({ id: a.def.id, fact: tr.evFact(a.def) }));
  if (surpriseIn(G.result)) ev.push({ id: "comms_delay", fact: tr.comms(D.scenario) });
  return ev;
}

function localReply(phase, outcome, events) {
  const fb = tr.fallback(D.fallback);
  let text = pick(fb[phase === "briefing" ? "briefing" : outcome] || fb.ok);
  if (phase === "debrief" && events[0]?.fact) text = `${events[0].fact} ${text}`;
  return { text, tip: pick(fb.tips), source: "local" };
}

async function askCommander(phase) {
  const id = ++G.reqId;
  const events = commanderEvents(phase);
  const r = G.result;
  const outcome = phase === "debrief" ? r.outcome : "ok";
  showCommander({ text: t.thinking, tip: "", source: "wait" });
  const body = {
    sessionId: G.sessionId, scenario: "mars", sol: G.sol, phase,
    allocation: phase === "debrief" ? r.allocation : G.alloc,
    before: phase === "debrief" ? r.before : G.state,
    after: phase === "debrief" ? r.after : G.state,
    events, outcome, lang,
  };
  let reply = null;
  if (!OFFLINE) {
    try {
      reply = await fetchWithTimeout(`${D.config.apiBaseUrl}/api/commander`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      // The server's own fallback texts are English only: use the local ones for other languages.
      if (!reply?.text || (lang !== "en" && reply.source === "fallback")) reply = null;
      // Old server or a model slip: an English reply in the Russian game -> local Russian text.
      else if (lang === "ru" && !/[а-яё]/i.test(reply.text)) reply = null;
    } catch { reply = null; }
  }
  if (id !== G.reqId) return; // a newer request replaced this one
  showCommander(reply || localReply(phase, outcome, events));
}

function showCommander(rep) {
  $("commander").classList.toggle("thinking", rep.source === "wait");
  $("cmdText").textContent = rep.text;
  $("cmdTip").textContent = rep.tip ? `💡 ${rep.tip}` : "";
  const ai = rep.source === "gemini" || rep.source === "cache";
  $("cmdBadge").textContent = rep.source === "wait" ? "" : ai ? t.badgeAi : t.badgeLocal;
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
  $("solLabel").textContent = t.solOf(G.sol, n);
  const lost = G.result?.outcome === "fail" && G.phase !== "simulate";
  $("solDots").innerHTML = Array.from({ length: n }, (_, i) => {
    const s = i + 1;
    const cls = s < G.sol ? "done" : s === G.sol ? (lost ? "lost" : "now") : "";
    return `<li class="${cls}" title="${t.solDot(s)}"></li>`;
  }).join("");
}

function renderBars() {
  const st = G.state, cfg = D.scenario, goal = cfg.systems.science.goal;
  const bar = (label, value, max, color, cls) => `
    <div class="bar ${cls}">
      <div class="bar-head"><span>${label}</span><span class="v">${value}</span></div>
      <div class="track"><div class="fill" style="width:${Math.min(100, (parseFloat(value) / max) * 100)}%;background:${color}"></div></div>
    </div>`;
  const lvl = (v) => (v < 30 ? "danger" : v < 50 ? "low" : "");
  const dose = st.dose;
  $("bars").innerHTML =
    bar(t.barAir, Math.round(st.air), 100, "var(--air)", lvl(st.air)) +
    bar(t.barFood, Math.round(st.food), 100, "var(--food)", lvl(st.food)) +
    bar(t.barDose, `${Math.round(dose)} / ${cfg.doseLimit}`, cfg.doseLimit, "var(--dose)",
      dose > cfg.doseLimit * 0.7 ? "danger" : dose > cfg.doseLimit * 0.5 ? "low" : "") +
    bar(t.barSci, `${st.science} / ${goal}`, goal, "var(--science)", "");
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
  if (solar) tags.push(`<span class="tag storm">${t.tagStorm}</span>`);
  if (dust) tags.push(`<span class="tag dust">${t.tagDust}</span>`);
  if (!solar && !dust) tags.push(`<span class="tag">${t.tagCalm}</span>`);
  if (station) tags.push(`<span class="tag station">${t.tagStation}${hasStation(G.sol + 1) && !hasStation(G.sol) ? t.tagStationNext : ""}</span>`);
  $("sceneTags").innerHTML = tags.join("");
  S3?.update({ solar, dust, solarFactor: sf, shield: a.shield, station, science: a.science });
}

function renderPanel() {
  const p = $("panel");
  if (G.phase === "allocate") p.innerHTML = allocateHtml();
  else if (G.phase === "simulate") p.innerHTML = `
    <div class="running"><h2>${t.running(G.sol)}</h2>
      <div class="progress" style="--dur:1.7s"><div></div></div>
      <p class="muted small">${t.crew}</p></div>`;
  else p.innerHTML = debriefHtml();
  bindPanel();
}

const eventDef = (id) => D.events.events.find((e) => e.id === id);

/** Translated text of a director note (sim.js keeps English `text` plus structured fields). */
function noteText(n) {
  const def = n.id ? eventDef(n.id) : null;
  switch (n.kind) {
    case "sun": return t.sun(D.sw, D.sw?.riskLevel);
    case "station": return t.noteStation(n.on);
    case "warning": return def ? t.noteWarning(tr.evTitle(def)) : n.text;
    case "event": return def ? t.noteEvent(tr.evTitle(def), n.day, n.of) : n.text;
    default: return n.text;
  }
}

function allocateHtml() {
  const cfg = D.scenario, total = totalPower(), base = availablePower(cfg, G.cond);
  const notes = G.cond.notes
    .filter((n) => n.kind !== "intro") // intro text is on the start screen
    .map((n) => `<div class="note ${n.kind}${n.id ? ` event-${n.id}` : ""}">${esc(noteText(n))}</div>`).join("");
  const tokens = Array.from({ length: total }, (_, i) => `<span class="token${i >= free() ? " used" : ""}"></span>`).join("");
  const cards = SYSTEMS.map((k) => {
    const ui = t.sys[k];
    return `<div class="sys ${k}">
      <span class="ico" aria-hidden="true">${ICONS[k]}</span><span class="name">${ui.name}</span><span class="hint">${esc(ui.hint(cfg.systems[k].upkeep))}</span>
      <div class="ctrl">
        <button class="step" data-k="${k}" data-d="-1" aria-label="${esc(t.less(ui.name))}" ${G.alloc[k] <= 0 ? "disabled" : ""}>−</button>
        <span class="val" aria-live="polite">${G.alloc[k]}</span>
        <button class="step" data-k="${k}" data-d="1" aria-label="${esc(t.more(ui.name))}" ${free() <= 0 ? "disabled" : ""}>+</button>
      </div></div>`;
  }).join("");
  const cost = cfg.weatherStationPowerCost;
  const canOn = G.station || free() >= cost;
  const s = cfg.systems;
  let hint = "";
  if (G.alloc.lifeSupport < s.lifeSupport.upkeep) hint = t.hintLs(s.lifeSupport.upkeep);
  else if (G.alloc.greenhouse < s.greenhouse.upkeep) hint = t.hintGh(s.greenhouse.upkeep);
  else if (free() > 0) hint = t.hintFree(free());

  return `
    <div class="notes">${notes}</div>
    <div class="power"><span class="power-label">${t.power(free(), total)}</span><span class="tokens">${tokens}</span></div>
    ${base < cfg.powerPerSol ? `<div class="muted small">${t.dustPower(base)}</div>` : ""}
    <div class="systems">${cards}</div>
    <div class="station">
      <span class="ico" style="font-size:26px" aria-hidden="true">📡</span>
      <div class="txt"><b>${t.stationTitle}</b><br>${t.stationDesc(cost)}</div>
      <button class="switch" id="swStation" role="switch" aria-checked="${G.station}" aria-label="${t.stationTitle}" ${canOn ? "" : "disabled"}></button>
    </div>
    ${hint ? `<div class="hint-line">${esc(hint)}</div>` : ""}
    <button class="go" id="btnRun">${t.run(G.sol)}</button>`;
}

const srcById = (id) => D.sources.sources.find((s) => s.id === id);
const srcLink = (id) => {
  const raw = srcById(id);
  if (!raw) return "";
  const s = tr.source(raw);
  return `<a class="src" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(t.source(s.provider, s.title))}</a>`;
};
const fmtDate = (iso, plusDays) => new Date(Date.parse(iso) + plusDays * 864e5)
  .toLocaleDateString(t.dateLocale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function debriefHtml() {
  const r = G.result, cfg = D.scenario, s = cfg.systems;
  const d = (k) => r1(r.after[k] - r.before[k]);
  const sign = (v) => (v > 0 ? `+${v}` : `${v}`);
  const cls = (v) => (v === 0 ? "same" : v > 0 ? "up" : "down");
  const chg = (label, k) => `<div class="chg">${label} <b class="${k === "dose" ? (d(k) > 0 ? "dose-up" : "same") : cls(d(k))}">${sign(d(k))}</b></div>`;

  const a = r.allocation;
  const m = r.conditions.radiationMultiplier, storm = Math.max(0, m - 1);
  const everyday = cfg.baseDosePerSol;
  const stormExtra = cfg.baseDosePerSol * storm * (1 - r.shieldReduction);
  const outside = cfg.outsideDosePerScienceUnit * a.science * m;
  const why = [
    t.whyLs(a.lifeSupport, s.lifeSupport.upkeep, sign(d("air"))),
    t.whyGh(a.greenhouse, s.greenhouse.upkeep, sign(d("food"))),
    `${t.whyEveryday(r1(everyday))}${storm > 0 ? `${t.whyStorm(r1(stormExtra))}${r.shieldReduction > 0 ? t.whyBlocked(Math.round(r.shieldReduction * 100)) : t.whyNoShield}` : ""}${outside > 0 ? t.whyOutside(r1(outside)) : ""}.`,
  ];
  if (storm === 0 && a.shield > 0) why.push(t.whyCalmShield);

  const events = r.conditions.active.map((ev) => {
    const real = ev.def.useRealRadiationProfile;
    const rd = D.radiation.events?.[0];
    const realLine = real && rd ? `<p><b>${t.realToday(r1(ev.radiationMultiplier))}</b> (${ev.known ? t.realDaily(fmtDate(rd.realDate, ev.dayIndex)) : t.realPeak(fmtDate(rd.realDate, 0))}).</p>` : "";
    const surprise = !ev.known ? `<p class="surprise">${t.surprise} ${esc(tr.comms(cfg))}</p>${srcLink("comms_delay")}<br>` : "";
    return `<div class="event-card ${ev.def.id}"><h3>${ev.def.id === "dust_storm" ? "🌪️" : "☢️"} ${esc(t.noteEvent(tr.evTitle(ev.def), ev.dayIndex + 1, ev.def.durationSols))}</h3>
      ${realLine}<p>${esc(tr.evFact(ev.def))}</p>${surprise}${srcLink(ev.def.sourceId)}</div>`;
  }).join("");

  const raw = pickFact(D.facts.facts, r), f = raw && tr.fact(raw);
  const fact = f ? `<a class="science-card" href="${esc(f.url)}" target="_blank" rel="noopener">
      <div class="k">${t.realScience}</div><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p>
      <div class="src">${esc(t.osdrStudy(f.studyId))}</div></a>` : "";

  const end = r.outcome === "fail" || r.outcome === "win";
  const head = r.outcome === "win" ? t.headWin : r.outcome === "fail" ? `🛰️ ${t.fail[r.failReason] || t.headOver}` : t.headReport(G.sol);
  return `
    <h2>${head}</h2>
    <div class="changes">${chg(t.chgAir, "air")}${chg(t.chgFood, "food")}${chg(t.chgDose, "dose")}${chg(t.chgSci, "science")}</div>
    <div class="why">${why.join("<br>")}</div>
    ${events}
    ${fact}
    <button class="go" id="btnNext">${end ? t.nextEnd : t.nextSol(G.sol + 1)}</button>`;
}

function bindPanel() {
  $("panel").querySelectorAll(".step").forEach((b) => b.addEventListener("click", () => changeAlloc(b.dataset.k, Number(b.dataset.d))));
  $("swStation")?.addEventListener("click", () => setStation(!G.station));
  $("btnRun")?.addEventListener("click", runSol);
  $("btnNext")?.addEventListener("click", nextSol);
}

// ---------------------------------------------------------------- overlays
function openOverlay(html, view = null) {
  overlayView = view;
  const o = $("overlay");
  o.innerHTML = `<div class="card" role="dialog" aria-modal="true">${html}</div>`;
  o.hidden = false;
  o.querySelector("button")?.focus();
}
const closeOverlay = () => { overlayView = null; $("overlay").hidden = true; $("overlay").innerHTML = ""; };

function showIntro() {
  const cfg = D.scenario, g = cfg.systems.science.goal;
  openOverlay(`
    <div class="big">🚀</div>
    <h1>${t.introTitle}</h1>
    <p>${t.introP}</p>
    <ul>
      <li>${t.introLs(cfg.systems.lifeSupport.upkeep)}</li>
      <li>${t.introGh(cfg.systems.greenhouse.upkeep)}</li>
      <li>${t.introShield}</li>
      <li>${t.introSci(g)}</li>
    </ul>
    <p>${t.introWin(cfg.sols, cfg.doseLimit, g)}</p>
    <div class="note sun">${esc(t.sun(D.sw, D.sw?.riskLevel))}</div>
    <div class="row"><button class="go" id="btnStart">${t.start}</button></div>
    <p class="fine">${t.introFine}</p>`, showIntro);
  $("btnStart").addEventListener("click", () => { closeOverlay(); newGame(); });
}

function showOver() {
  const r = G.result, win = r.outcome === "win";
  G.phase = "over";
  $("app").dataset.phase = "over";
  const solsDone = win ? D.scenario.sols : r.sol;
  openOverlay(`
    <div class="big">${win ? "🏆" : "🛰️"}</div>
    <h1>${win ? t.overWin : t.overLost}</h1>
    <p>${win ? t.overWinText : esc(t.fail[r.failReason] || "")}</p>
    <div class="stats">
      <div class="stat"><b>${solsDone}/${D.scenario.sols}</b>${t.statSols}</div>
      <div class="stat"><b>${G.state.science}/${D.scenario.systems.science.goal}</b>${t.statSci}</div>
      <div class="stat"><b>${Math.round(G.state.dose)}</b>${t.statDose}</div>
    </div>
    <p id="overCmd" class="muted">${$("commander").classList.contains("thinking") ? "" : esc($("cmdText").textContent)}</p>
    <div class="row"><button class="go" id="btnAgain">${t.again}</button><button class="go secondary" id="btnOverSrc">${t.btnSources}</button></div>`, showOver);
  $("btnAgain").addEventListener("click", () => { closeOverlay(); newGame(); });
  $("btnOverSrc").addEventListener("click", showSources);
}

function showSources() {
  const back = !G ? showIntro : G.phase === "over" ? showOver : null;
  const items = D.sources.sources.map(tr.source).map((s) => `
    <a class="src-item" href="${esc(s.url)}" target="_blank" rel="noopener">
      <small>${esc(s.provider)}</small><br><b>${esc(s.title)}</b><p>${esc(s.usedFor)}</p></a>`).join("");
  openOverlay(`
    <h1>${t.srcTitle}</h1>
    <p class="muted small">${esc(t.srcWeather(D.sw))}</p>
    <div class="src-list">${items}</div>
    <div class="row"><button class="go secondary" id="btnClose">${back ? t.back : t.close}</button></div>`, showSources);
  $("btnClose").addEventListener("click", () => (back ? back() : closeOverlay()));
}

// ---------------------------------------------------------------- language
function applyStatic() {
  document.title = t.docTitle;
  $("brandTitle").textContent = t.brand;
  $("btnSources").textContent = t.btnSources;
  $("btnFull").title = t.fullscreen;
  $("btnFull").setAttribute("aria-label", t.fullscreen);
  $("cmdName").textContent = t.cmdName;
  $("btnLang").textContent = t.langBtn;
  $("btnLang").title = t.langLabel;
  $("btnLang").setAttribute("aria-label", t.langLabel);
}

function switchLang() {
  setLang(lang === "en" ? "ru" : "en");
  applyStatic();
  if (!G) {
    $("solLabel").textContent = t.ready;
    $("cmdText").textContent = t.hi;
  } else {
    const over = G.phase === "over";
    if (!over) render();
    else { renderHeader(); renderBars(); renderScene(); renderPanel(); }
    if (G.phase === "allocate") askCommander("briefing");
    else if (G.phase === "debrief" || over) askCommander("debrief");
  }
  if (overlayView && !$("overlay").hidden) overlayView();
}

// ---------------------------------------------------------------- 3D view
async function init3D() {
  if (params.has("svg")) return; // ?svg = keep the flat scene
  try {
    const mod = await import("./scene3d.js");
    S3 = await mod.createScene3D($("sceneWrap"));
    if (!S3) return;
    $("sceneWrap").classList.add("has3d");
    if (G) renderScene();
  } catch (e) {
    S3 = null;
    console.warn("3D view disabled, using the SVG scene:", e);
  }
}

// ---------------------------------------------------------------- boot
async function boot() {
  setLang(initialLang());
  applyStatic();
  $("solLabel").textContent = t.loading;
  $("cmdText").textContent = t.getting;
  try {
    const [config, scenario, events, radiation, snapshot, fallback, facts, sources] = await Promise.all(
      ["config", "scenario_mars", "events", "radiation_mars", "spaceweather_snapshot", "commander_fallback", "facts", "sources"].map(loadJson));
    D = { config, scenario, events, radiation, snapshot, fallback, facts, sources };
  } catch (e) {
    $("solLabel").textContent = t.loadFail;
    $("cmdText").textContent = t.wrong(e.message);
    return;
  }
  $("solLabel").textContent = t.checkingSun;
  D.sw = await loadSpaceWeather();
  $("solLabel").textContent = t.ready;
  $("cmdText").textContent = t.hi;

  $("btnSources").addEventListener("click", showSources);
  $("btnLang").addEventListener("click", switchLang);
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
  init3D();
}

boot();
