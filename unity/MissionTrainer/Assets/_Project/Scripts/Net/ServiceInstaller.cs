// Decides which implementation each service uses. Called once by GameBootstrap.Awake().
// OWNER: Omar
// Online  (config.json apiBaseUrl set): HTTP services with offline fallback.
// Offline (apiBaseUrl empty):           bundled data + local texts only.
using UnityEngine;

namespace MissionTrainer
{
    public static class ServiceInstaller
    {
        public static void InstallAll(ApiClient api)
        {
            Services.Config = ResourcesJson.Load<AppConfig>("config") ?? new AppConfig();
            Services.Scenarios = new ResourcesScenarioProvider();
            Services.Sources = new ResourcesSourcesProvider();
            Services.Events = new EventDirector();

            var localCommander = new FakeCommanderService();
            var snapshotWeather = new SnapshotSpaceWeatherService();
            bool online = !string.IsNullOrEmpty(Services.Config.apiBaseUrl);

            Services.Commander = online ? new HttpCommanderService(api, localCommander) : localCommander;
            Services.SpaceWeather = online ? new HttpSpaceWeatherService(api, snapshotWeather) : snapshotWeather;
            Services.Leaderboard = online ? new HttpLeaderboardService(api) : new MemoryLeaderboardService();

            Debug.Log($"[Services] v{Services.Config.version} mode={(online ? "online " + Services.Config.apiBaseUrl : "offline")}");
        }
    }
}
