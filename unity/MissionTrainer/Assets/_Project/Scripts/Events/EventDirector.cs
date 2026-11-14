// Decides what happens on each sol, using real NASA data where possible.
// OWNER: Omar
//
// - Solar particle storm: multipliers from Curiosity RAD daily means (11-12 Sep 2017), radiation_mars.json.
//   Guaranteed once per mission so every playthrough shows real data.
// - Dust storm: halves solar power.
// - Real Sun: NASA DONKI risk level (backend or bundled snapshot) boosts storm chance.
// - Communication delay (player decision): on Mars, Earth's storm warning arrives too late (no warning
//   on day 1) unless the Weather Station is ON — it costs power every sol (TurnController.ToggleWeatherStation).
//   With no delay (Moon) the warning comes the sol before.
//
// TODO(Omar): tune chances with Arystan; add more event types if time (equipment failure, meteorite...).
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace MissionTrainer
{
    public class EventDirector : IEventDirector
    {
        ScenarioConfig cfg;
        SpaceWeatherSummary spaceWeather;
        RadiationData radiation;
        EventCatalogData catalog;
        System.Random rng;
        readonly List<ActiveEvent> scheduled = new List<ActiveEvent>();

        public const string WeatherStation = "WeatherStation";

        public void StartMission(ScenarioConfig scenario, SpaceWeatherSummary sw, int seed)
        {
            cfg = scenario;
            spaceWeather = sw;
            rng = new System.Random(seed);
            catalog ??= ResourcesJson.Load<EventCatalogData>("events") ?? new EventCatalogData();
            radiation = ResourcesJson.Load<RadiationData>(string.IsNullOrEmpty(cfg.radiationFile) ? "radiation_mars" : cfg.radiationFile);
            scheduled.Clear();
            Schedule();
        }

        void Schedule()
        {
            float boost = spaceWeather == null ? 1f
                : spaceWeather.riskLevel == "high" ? 1.5f
                : spaceWeather.riskLevel == "medium" ? 1.2f : 1f;

            foreach (var def in catalog.events)
            {
                bool placed = false;
                int busyUntil = 0;
                for (int sol = Mathf.Max(1, def.minSol); sol <= Mathf.Min(cfg.sols, def.maxSol); sol++)
                {
                    if (sol <= busyUntil || (def.oncePerMission && placed)) continue;
                    float chance = def.chancePerSol * (def.useRealRadiationProfile ? boost : 1f);
                    if (rng.NextDouble() < chance)
                    {
                        scheduled.Add(new ActiveEvent { def = def, startSol = sol });
                        busyUntil = sol + def.durationSols;
                        placed = true;
                    }
                }
                // Every mission must show the real-data storm at least once.
                if (def.useRealRadiationProfile && !placed && def.maxSol >= def.minSol)
                    scheduled.Add(new ActiveEvent { def = def, startSol = rng.Next(def.minSol, Mathf.Min(cfg.sols, def.maxSol) + 1) });
            }
        }

        public SolConditions BeginSol(int sol, IReadOnlyCollection<string> builtModules)
        {
            var c = new SolConditions { sol = sol };
            bool hasStation = builtModules != null && builtModules.Contains(WeatherStation);
            bool earlyWarning = hasStation || cfg.commsDelaySols <= 0;

            if (sol == 1)
            {
                if (cfg.introNotes != null) c.briefingNotes.AddRange(cfg.introNotes);
                c.briefingNotes.Add(RealSunNote());
            }
            if (cfg.commsDelaySols > 0)
                c.briefingNotes.Add(hasStation
                    ? "Weather Station is watching the Sun: you will get storm warnings in time."
                    : "No Weather Station: Earth's storm warnings may arrive too late.");

            foreach (var e in scheduled)
            {
                int day = sol - e.startSol;
                if (e.def.needsWarning && day == -1 && earlyWarning)
                    c.briefingNotes.Add($"Space weather warning: {e.def.title} expected tomorrow!");
                if (day < 0 || day >= e.def.durationSols) continue;

                var active = new ActiveEvent
                {
                    def = e.def,
                    startSol = e.startSol,
                    dayIndex = day,
                    solarFactor = e.def.solarFactor,
                    radiationMultiplier = e.def.useRealRadiationProfile ? RealMultiplier(day) : e.def.radiationMultiplier,
                    known = !e.def.needsWarning || earlyWarning || day > 0,
                };
                c.active.Add(active);
                c.solarFactor *= active.solarFactor;
                c.radiationMultiplier *= active.radiationMultiplier;

                if (active.known)
                    c.briefingNotes.Add($"{e.def.title} (day {day + 1} of {e.def.durationSols})");
                // Unknown on day 1 = the comms-delay surprise; revealed in the debrief via conditions.active.
            }
            return c;
        }

        /// <summary>Daily mean during the real event divided by the quiet baseline (Curiosity RAD, Sep 2017).</summary>
        float RealMultiplier(int dayIndex)
        {
            if (radiation == null || radiation.events == null || radiation.events.Count == 0) return 2f;
            var ev = radiation.events[0];
            int start = radiation.dailyDates.IndexOf(ev.realDate);
            int i = start + dayIndex;
            if (start < 0 || i >= radiation.dailyMean.Count || ev.baselineValue <= 0f) return ev.peakMultiplier;
            // Moon (CRaTER in orbit) peaks are extreme -> cap for gameplay.
            return Mathf.Clamp(radiation.dailyMean[i] / ev.baselineValue, 1f, 5f);
        }

        string RealSunNote()
        {
            if (spaceWeather == null) return "No space weather data today.";
            string when = spaceWeather.live ? "live today" : $"data as of {Date(spaceWeather.fetchedAt)}";
            string effect = spaceWeather.riskLevel == "high" ? "Solar storms are MUCH more likely this mission - think about shields!"
                : spaceWeather.riskLevel == "medium" ? "Solar storms are a bit more likely this mission."
                : "The real Sun is quiet, but storms can still happen.";
            return $"Real Sun (NASA DONKI, {when}): {spaceWeather.cmeCount} solar eruptions in the last " +
                   $"{spaceWeather.days} days. Risk: {spaceWeather.riskLevel}. {effect}";
        }

        static string Date(string iso) => string.IsNullOrEmpty(iso) || iso.Length < 10 ? "unknown" : iso.Substring(0, 10);
    }
}
