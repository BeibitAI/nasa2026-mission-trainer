// Pure game rules: resource model + event director (port of the C# ResourceModel / EventDirector).
// No DOM here, so the same file runs in the browser and in Node (balance tests).
// Notes keep English `text` plus structured fields; the UI builds the translated text from the fields.

export const SYSTEMS = ["lifeSupport", "greenhouse", "shield", "science"];
export const WEATHER_STATION = "WeatherStation";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function systemDelta(rule, units) {
  const diff = units - rule.upkeep;
  return diff >= 0 ? diff * rule.gainPerExtraUnit : diff * rule.lossPerMissingUnit;
}

export function availablePower(cfg, cond) {
  return Math.max(0, Math.round(cfg.powerPerSol * cond.solarFactor));
}

export function judge(cfg, s, sol) {
  if (s.air <= 0) return ["fail", "air"];
  if (s.food <= 0) return ["fail", "food"];
  if (s.dose >= cfg.doseLimit) return ["fail", "dose"];
  if (sol >= cfg.sols) return s.science >= cfg.systems.science.goal ? ["win", null] : ["fail", "science"];
  const low = s.air < 30 || s.food < 30 || s.dose > cfg.doseLimit * 0.7;
  return [low ? "warning" : "ok", null];
}

/**
 * One sol. Background dose = cosmic rays (the shield can't stop it); the shield blocks part of the
 * EXTRA solar-storm dose; science is work outside, so storms make it riskier.
 */
export function simulate(cfg, state, a, c) {
  const s = cfg.systems;
  const after = { ...state };
  after.air = clamp(after.air + systemDelta(s.lifeSupport, a.lifeSupport), 0, 100);
  after.food = clamp(after.food + systemDelta(s.greenhouse, a.greenhouse), 0, 100);

  const reduction = Math.min(s.shield.maxReduction, a.shield * s.shield.reductionPerUnit);
  const storm = Math.max(0, c.radiationMultiplier - 1);
  const doseAdded = cfg.baseDosePerSol * (1 + storm * (1 - reduction))
    + cfg.outsideDosePerScienceUnit * a.science * c.radiationMultiplier;
  after.dose = Math.min(cfg.doseLimit, after.dose + doseAdded);
  after.science += a.science * s.science.pointsPerUnit;

  const [outcome, failReason] = judge(cfg, after, c.sol);
  return {
    sol: c.sol, before: { ...state }, after, allocation: { ...a }, conditions: c,
    shieldReduction: reduction, doseAdded, outcome, failReason,
  };
}

/** Small seeded RNG (mulberry32) so a mission can be replayed in tests. */
export function makeRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export class EventDirector {
  /**
   * @param cfg scenario_mars.json   @param catalog events.json   @param radiation radiation_mars.json
   * @param spaceWeather /api/spaceweather or snapshot   @param rng () => [0,1)
   */
  constructor(cfg, catalog, radiation, spaceWeather, rng) {
    Object.assign(this, { cfg, catalog, radiation, spaceWeather, rng });
    this.scheduled = [];
    this.schedule();
  }

  schedule() {
    const risk = this.spaceWeather?.riskLevel;
    const boost = risk === "high" ? 1.5 : risk === "medium" ? 1.2 : 1;
    const last = (def) => Math.min(this.cfg.sols, def.maxSol);
    for (const def of this.catalog.events) {
      let placed = false, busyUntil = 0;
      for (let sol = Math.max(1, def.minSol); sol <= last(def); sol++) {
        if (sol <= busyUntil || (def.oncePerMission && placed)) continue;
        const chance = def.chancePerSol * (def.useRealRadiationProfile ? boost : 1);
        if (this.rng() < chance) {
          this.scheduled.push({ def, startSol: sol });
          busyUntil = sol + def.durationSols;
          placed = true;
        }
      }
      // Every mission must show the real-data storm at least once.
      if (def.useRealRadiationProfile && !placed && def.maxSol >= def.minSol) {
        const lo = def.minSol, hi = last(def);
        this.scheduled.push({ def, startSol: lo + Math.floor(this.rng() * (hi - lo + 1)) });
      }
    }
  }

  /** Conditions for a sol. notes: [{kind: intro|sun|station|warning|event, text}] */
  beginSol(sol, hasStation) {
    const c = { sol, solarFactor: 1, radiationMultiplier: 1, active: [], notes: [] };
    const earlyWarning = hasStation || this.cfg.commsDelaySols <= 0;

    if (sol === 1) {
      for (const t of this.cfg.introNotes || []) c.notes.push({ kind: "intro", text: t });
      c.notes.push({ kind: "sun", text: this.realSunNote() });
    }
    if (this.cfg.commsDelaySols > 0) {
      c.notes.push(hasStation
        ? { kind: "station", on: true, text: "Weather Station is watching the Sun: you will get storm warnings in time." }
        : { kind: "station", on: false, text: "No Weather Station: Earth's storm warnings may arrive too late." });
    }

    for (const e of this.scheduled) {
      const day = sol - e.startSol;
      if (e.def.needsWarning && day === -1 && earlyWarning)
        c.notes.push({ kind: "warning", id: e.def.id, text: `Space weather warning: ${e.def.title} expected tomorrow!` });
      if (day < 0 || day >= e.def.durationSols) continue;

      const known = !e.def.needsWarning || earlyWarning || day > 0;
      const active = {
        def: e.def, startSol: e.startSol, dayIndex: day, known,
        solarFactor: e.def.solarFactor,
        radiationMultiplier: e.def.useRealRadiationProfile ? this.realMultiplier(day, known) : e.def.radiationMultiplier,
      };
      c.active.push(active);
      c.solarFactor *= active.solarFactor;
      c.radiationMultiplier *= active.radiationMultiplier;
      if (known) c.notes.push({ kind: "event", id: e.def.id, day: day + 1, of: e.def.durationSols,
        text: `${e.def.title} (day ${day + 1} of ${e.def.durationSols})` });
      // Unknown on day 1 = the comms-delay surprise; revealed in the debrief.
    }
    return c;
  }

  /** Daily mean of the real event / quiet baseline (Curiosity RAD, Sep 2017). Surprise storm = real peak hour. */
  realMultiplier(dayIndex, known) {
    const r = this.radiation;
    if (!r?.events?.length) return 2;
    const ev = r.events[0];
    if (!known && dayIndex === 0 && ev.peakMultiplier > 0) return clamp(ev.peakMultiplier, 1, 5);
    const start = r.dailyDates.indexOf(ev.realDate);
    const i = start + dayIndex;
    if (start < 0 || i >= r.dailyMean.length || ev.baselineValue <= 0) return ev.peakMultiplier;
    return clamp(r.dailyMean[i] / ev.baselineValue, 1, 5);
  }

  realSunNote() {
    const sw = this.spaceWeather;
    if (!sw) return "No space weather data today.";
    const when = sw.live ? "live today" : `data as of ${(sw.fetchedAt || "").slice(0, 10) || "unknown"}`;
    const effect = sw.riskLevel === "high" ? "Solar storms are MUCH more likely this mission - think about shields!"
      : sw.riskLevel === "medium" ? "Solar storms are a bit more likely this mission."
      : "The real Sun is quiet, but storms can still happen.";
    return `Real Sun (NASA DONKI, ${when}): ${sw.cmeCount} solar eruptions in the last ${sw.days} days. Risk: ${sw.riskLevel}. ${effect}`;
  }
}

/** "Real science" card: storm sol -> radiation, low food -> greenhouse, otherwise rotate. */
export function pickFact(facts, r) {
  if (!r || !facts?.length) return null;
  const topic = r.conditions?.radiationMultiplier > 1 ? "radiation" : r.after?.food < 50 ? "greenhouse" : null;
  let pool = topic ? facts.filter((f) => f.topic === topic) : facts;
  if (!pool.length) pool = facts;
  return pool[Math.abs(r.sol) % pool.length];
}
