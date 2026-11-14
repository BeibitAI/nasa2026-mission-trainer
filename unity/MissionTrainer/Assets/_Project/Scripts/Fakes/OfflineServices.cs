// Offline implementations — used when apiBaseUrl is empty and as fallback when the backend fails.
// OWNER: Omar
// These guarantee the game works for judges even if the backend is asleep or Gemini is out of quota.
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace MissionTrainer
{
    public class FakeCommanderService : ICommanderService
    {
        readonly FallbackLines lines = ResourcesJson.Load<FallbackLines>("commander_fallback") ?? new FallbackLines();
        readonly System.Random rng = new System.Random();

        public void GetMessage(CommanderRequest r, Action<CommanderReply> onDone)
        {
            var pool = r.phase == "briefing" ? lines.briefing
                : r.outcome == "win" ? lines.win
                : r.outcome == "fail" ? lines.fail
                : r.outcome == "warning" ? lines.warning : lines.ok;
            string text = Pick(pool, "Good work, Commander!");
            var fact = r.events.FirstOrDefault(e => !string.IsNullOrEmpty(e.fact));
            if (r.phase == "debrief" && fact != null) text = fact.fact + " " + text;
            onDone(new CommanderReply { text = text, tip = Pick(lines.tips, ""), source = "local" });
        }

        string Pick(List<string> pool, string fallback) =>
            pool != null && pool.Count > 0 ? pool[rng.Next(pool.Count)] : fallback;
    }

    public class SnapshotSpaceWeatherService : ISpaceWeatherService
    {
        public void GetSummary(Action<SpaceWeatherSummary> onDone)
        {
            var s = ResourcesJson.Load<SpaceWeatherSummary>("spaceweather_snapshot") ?? new SpaceWeatherSummary();
            s.live = false; // bundled data is never presented as live
            onDone(s);
        }
    }

    public class MemoryLeaderboardService : ILeaderboardService
    {
        readonly List<ScoreEntry> scores = new List<ScoreEntry>();

        public void Submit(ScoreEntry entry, Action<bool> onDone) { scores.Add(entry); onDone(true); }

        public void Top(string scenario, int limit, Action<List<ScoreEntry>> onDone) =>
            onDone(scores.Where(s => s.scenario == scenario)
                .OrderByDescending(s => s.won).ThenByDescending(s => s.solsSurvived).ThenByDescending(s => s.science)
                .Take(limit).ToList());
    }

    public static class NicknameGenerator
    {
        static readonly string[] Adjectives = { "Brave", "Clever", "Swift", "Bright", "Calm", "Bold", "Lucky", "Happy", "Mighty", "Curious" };
        static readonly string[] Animals = { "Fox", "Owl", "Panda", "Tiger", "Falcon", "Otter", "Wolf", "Koala", "Eagle", "Dolphin" };

        public static string Next() =>
            Adjectives[UnityEngine.Random.Range(0, Adjectives.Length)] +
            Animals[UnityEngine.Random.Range(0, Animals.Length)] +
            UnityEngine.Random.Range(1, 100);
    }
}
