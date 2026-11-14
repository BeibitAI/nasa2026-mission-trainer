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
}
