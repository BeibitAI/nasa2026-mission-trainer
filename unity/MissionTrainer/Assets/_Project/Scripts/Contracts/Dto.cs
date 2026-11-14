// Shared data contracts between game code, bundled JSON and the backend.
// OWNER: Arystan + Omar — change ONLY after agreeing in team chat (see CONTRIBUTING.md).
// JsonUtility rules: public fields, [Serializable], no dictionaries, no top-level arrays.
using System;
using System.Collections.Generic;

namespace MissionTrainer
{
    // ---------- Simulation state ----------

    [Serializable]
    public class ResourceState
    {
        public float air = 80f;      // 0..100, 0 = mission over
        public float food = 80f;     // 0..100, 0 = mission over
        public float dose = 0f;      // 0..doseLimit, limit = crew must go home
        public float science = 0f;   // points toward the mission goal

        public ResourceState Clone() => (ResourceState)MemberwiseClone();
    }

    [Serializable]
    public class PowerAllocation
    {
        public int lifeSupport;
        public int greenhouse;
        public int shield;
        public int science;

        public int Total => lifeSupport + greenhouse + shield + science;
        public PowerAllocation Clone() => (PowerAllocation)MemberwiseClone();
    }

    /// <summary>What the world looks like on a given sol (filled by IEventDirector).</summary>
    public class SolConditions
    {
        public int sol;
        public float solarFactor = 1f;          // 1 = full sun, 0.5 = dust storm
        public float radiationMultiplier = 1f;  // 1 = normal background
        public List<ActiveEvent> active = new List<ActiveEvent>();
        public List<string> briefingNotes = new List<string>(); // what the player KNOWS before deciding
    }

    public class SolResult
    {
        public int sol;
        public ResourceState before;
        public ResourceState after;
        public PowerAllocation allocation;
        public SolConditions conditions;
        public float shieldReduction;  // 0..1
        public float doseAdded;
        public bool weatherStationOn;  // comms-delay decision for this sol
        public string outcome;         // ok | warning | fail | win
        public string failReason;      // air | food | dose | science | null
    }

    // ---------- Backend: AI commander ----------

    [Serializable]
    public class EventInfo
    {
        public string id;
        public string fact;
    }

    [Serializable]
    public class CommanderRequest
    {
        public string sessionId;
        public string scenario = "mars";
        public int sol;
        public string phase = "debrief";   // briefing | debrief
        public PowerAllocation allocation = new PowerAllocation();
        public ResourceState before = new ResourceState();
        public ResourceState after = new ResourceState();
        public List<EventInfo> events = new List<EventInfo>();
        public string outcome = "ok";       // ok | warning | fail | win
    }

    [Serializable]
    public class CommanderReply
    {
        public string text;
        public string tip;
        public string source;               // gemini | cache | fallback | local
    }

    // ---------- Backend: space weather (NASA DONKI) ----------

    [Serializable]
    public class SpaceWeatherSummary
    {
        public string fetchedAt;
        public bool live;                   // false = bundled snapshot -> show "data as of <date>"
        public string source;
        public string url;
        public int days;
        public int cmeCount;
        public float fastestCmeKmS;
        public int gstCount;
        public float maxKp;
        public int sepCount;
        public string riskLevel = "low";    // low | medium | high
    }

    // ---------- Backend: leaderboard ----------

    [Serializable]
    public class ScoreEntry
    {
        public string nickname;             // generated only, e.g. BraveFox42
        public string scenario = "mars";
        public int solsSurvived;
        public int science;
        public bool won;
        public int durationSec;
        public string version;
    }

    [Serializable]
    public class ScoreList
    {
        public List<ScoreEntry> scores = new List<ScoreEntry>();
    }

    // ---------- Bundled config: Resources/Data/scenario_<id>.json ----------

    [Serializable]
    public class SystemRule
    {
        public int upkeep;                  // units needed to stay level
        public float gainPerExtraUnit;
        public float lossPerMissingUnit;
    }

    [Serializable]
    public class ShieldRule
    {
        public float reductionPerUnit;      // e.g. 0.15 = 15% less radiation per unit
        public float maxReduction;          // cap, e.g. 0.75
    }

    [Serializable]
    public class ScienceRule
    {
        public float pointsPerUnit;
        public float goal;
    }

    [Serializable]
    public class SystemsConfig
    {
        public SystemRule lifeSupport;
        public SystemRule greenhouse;
        public ShieldRule shield;
        public ScienceRule science;
    }

    [Serializable]
    public class ScenarioConfig
    {
        public string id;
        public string displayName;
        public int sols;
        public int powerPerSol;
        public int crew;
        public float baseDosePerSol;        // game units per sol at normal background
        public float doseLimit;
        public int commsDelaySols;          // Mars: storm warnings from Earth arrive late
        public int weatherStationPowerCost = 1; // local storm warning costs power every sol it is on
        public string commsDelayFact;       // shown when a storm arrives unannounced
        public List<string> introNotes = new List<string>(); // sol 1: explain terms (sol, radiation dose...)
        public string radiationFile;        // e.g. radiation_mars
        public ResourceState start;
        public SystemsConfig systems;
    }

    // ---------- Bundled config: Resources/Data/events.json ----------

    [Serializable]
    public class EventDef
    {
        public string id;
        public string title;
        public string fact;                 // real, sourced fact shown to the player
        public string sourceId;             // key into sources.json
        public int minSol;
        public int maxSol;
        public float chancePerSol;
        public bool oncePerMission;
        public int durationSols = 1;
        public float solarFactor = 1f;
        public float radiationMultiplier = 1f;
        public bool useRealRadiationProfile; // take multipliers from radiation_<body>.json
        public bool needsWarning;            // hidden until warned (comms delay mechanic)
    }

    [Serializable]
    public class EventCatalogData
    {
        public List<EventDef> events = new List<EventDef>();
    }

    public class ActiveEvent
    {
        public EventDef def;
        public int startSol;
        public int dayIndex;                // 0 on the first sol of the event
        public float radiationMultiplier = 1f;
        public float solarFactor = 1f;
        public bool known;                  // player was warned / can see it
    }

    // ---------- Bundled data: Resources/Data/radiation_<body>.json (data-pipeline) ----------

    [Serializable]
    public class RadiationEvent
    {
        public string id;
        public string name;
        public string realDate;
        public float baselineValue;
        public float peakValue;
        public string peakTime;
        public float peakMultiplier;
        public string hourlyStart;
        public List<float> hourlyMultiplier = new List<float>();
    }

    [Serializable]
    public class RadiationStats
    {
        public float min;
        public float median;
        public float max;
    }

    [Serializable]
    public class RadiationData
    {
        public string body;
        public string source;
        public string url;
        public string instrumentId;
        public string location;
        public string note;
        public string units;
        public string generatedAt;
        public int year;
        public RadiationStats stats;
        public List<string> dailyDates = new List<string>();
        public List<float> dailyMean = new List<float>();
        public List<RadiationEvent> events = new List<RadiationEvent>();
    }

    // ---------- Bundled: sources, fallback texts, app config ----------

    [Serializable]
    public class SourceEntry
    {
        public string id;
        public string title;
        public string provider;
        public string url;
        public string usedFor;
    }

    [Serializable]
    public class SourceList
    {
        public List<SourceEntry> sources = new List<SourceEntry>();
    }

    [Serializable]
    public class FallbackLines
    {
        public List<string> briefing = new List<string>();
        public List<string> ok = new List<string>();
        public List<string> warning = new List<string>();
        public List<string> fail = new List<string>();
        public List<string> win = new List<string>();
        public List<string> tips = new List<string>();
    }

    [Serializable]
    public class AppConfig
    {
        public string apiBaseUrl = "";      // empty = offline mode (fake services)
        public float requestTimeoutSec = 6f;
        public string version = "0.1.0";
    }
}
