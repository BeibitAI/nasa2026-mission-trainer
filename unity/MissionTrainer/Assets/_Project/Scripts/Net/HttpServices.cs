// Real backend services. Each one falls back to an offline implementation on ANY error.
// OWNER: Omar
using System;
using System.Collections.Generic;
using UnityEngine;

namespace MissionTrainer
{
    public class HttpCommanderService : ICommanderService
    {
        readonly ApiClient api;
        readonly ICommanderService fallback;

        public HttpCommanderService(ApiClient api, ICommanderService fallback) { this.api = api; this.fallback = fallback; }

        public void GetMessage(CommanderRequest request, Action<CommanderReply> onDone)
        {
            api.Post<CommanderRequest, CommanderReply>("/api/commander", request,
                reply =>
                {
                    if (string.IsNullOrEmpty(reply.text)) fallback.GetMessage(request, onDone);
                    else onDone(reply);
                },
                err =>
                {
                    Debug.LogWarning("[Commander] backend failed, using local text: " + err);
                    fallback.GetMessage(request, onDone);
                });
        }
    }

    public class HttpSpaceWeatherService : ISpaceWeatherService
    {
        readonly ApiClient api;
        readonly ISpaceWeatherService fallback;

        public HttpSpaceWeatherService(ApiClient api, ISpaceWeatherService fallback) { this.api = api; this.fallback = fallback; }

        public void GetSummary(Action<SpaceWeatherSummary> onDone)
        {
            api.Get<SpaceWeatherSummary>("/api/spaceweather?days=30", onDone, err =>
            {
                Debug.LogWarning("[SpaceWeather] backend failed, using bundled snapshot: " + err);
                fallback.GetSummary(onDone);
            });
        }
    }

    public class HttpLeaderboardService : ILeaderboardService
    {
        [Serializable] class SubmitReply { public bool ok; public int rank; }

        readonly ApiClient api;

        public HttpLeaderboardService(ApiClient api) { this.api = api; }

        public void Submit(ScoreEntry entry, Action<bool> onDone) =>
            api.Post<ScoreEntry, SubmitReply>("/api/scores", entry, r => onDone(r.ok), _ => onDone(false));

        public void Top(string scenario, int limit, Action<List<ScoreEntry>> onDone) =>
            api.Get<ScoreList>($"/api/scores?scenario={scenario}&limit={limit}",
                r => onDone(r.scores ?? new List<ScoreEntry>()), _ => onDone(new List<ScoreEntry>()));
    }
}
