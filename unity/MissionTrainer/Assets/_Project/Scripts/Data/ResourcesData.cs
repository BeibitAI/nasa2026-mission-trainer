// Loading bundled JSON from Assets/_Project/Resources/Data/.
// OWNER: Omar
using System.Linq;
using UnityEngine;

namespace MissionTrainer
{
    public static class ResourcesJson
    {
        /// <summary>Loads Resources/Data/{name}.json (name without extension). Returns null if missing.</summary>
        public static T Load<T>(string name) where T : class
        {
            var asset = Resources.Load<TextAsset>("Data/" + name);
            if (asset == null)
            {
                Debug.LogError($"[Data] Missing Resources/Data/{name}.json");
                return null;
            }
            return JsonUtility.FromJson<T>(asset.text);
        }
    }

    public class ResourcesScenarioProvider : IScenarioProvider
    {
        public ScenarioConfig Load(string scenarioId) => ResourcesJson.Load<ScenarioConfig>("scenario_" + scenarioId);
    }

    public class ResourcesSourcesProvider : ISourcesProvider
    {
        SourceList cache;

        public SourceList All() => cache ??= ResourcesJson.Load<SourceList>("sources") ?? new SourceList();

        public SourceEntry Get(string id) => All().sources.FirstOrDefault(s => s.id == id);
    }

    /// <summary>"Real science" cards (facts.json). Picks one that matches what just happened on the sol.</summary>
    public static class RealScienceFacts
    {
        static FactList cache;

        public static FactList All() => cache ??= ResourcesJson.Load<FactList>("facts") ?? new FactList();

        /// <summary>Storm sol -> radiation card; low food -> greenhouse card; otherwise rotate through all cards.</summary>
        public static FactCard Pick(SolResult r)
        {
            var facts = All().facts;
            if (r == null || facts.Count == 0) return null;
            string topic = r.conditions != null && r.conditions.radiationMultiplier > 1f ? "radiation"
                : r.after != null && r.after.food < 50f ? "greenhouse"
                : null;
            var pool = topic == null ? facts : facts.Where(f => f.topic == topic).ToList();
            if (pool.Count == 0) pool = facts;
            return pool[Mathf.Abs(r.sol) % pool.Count];
        }
    }
}
