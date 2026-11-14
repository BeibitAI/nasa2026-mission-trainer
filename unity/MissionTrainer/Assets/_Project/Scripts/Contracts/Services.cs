// Service interfaces + a tiny service locator.
// OWNER: Arystan + Omar — change ONLY after agreeing in team chat.
// Arystan's code calls Services.X; Omar's ServiceInstaller decides which implementation (fake/real) is used.
using System;
using System.Collections.Generic;

namespace MissionTrainer
{
    public interface ICommanderService
    {
        /// <summary>Must ALWAYS call onDone exactly once (fallback text on any error).</summary>
        void GetMessage(CommanderRequest request, Action<CommanderReply> onDone);
    }

    public interface ISpaceWeatherService
    {
        /// <summary>Must ALWAYS call onDone (bundled snapshot with live=false on error).</summary>
        void GetSummary(Action<SpaceWeatherSummary> onDone);
    }

    public interface IScenarioProvider
    {
        ScenarioConfig Load(string scenarioId);
    }

    public interface IEventDirector
    {
        void StartMission(ScenarioConfig scenario, SpaceWeatherSummary spaceWeather, int seed);
        /// <summary>Called at the start of each sol, BEFORE the player allocates power.</summary>
        SolConditions BeginSol(int sol, IReadOnlyCollection<string> builtModules);
    }

    public interface ILeaderboardService
    {
        void Submit(ScoreEntry entry, Action<bool> onDone);
        void Top(string scenario, int limit, Action<List<ScoreEntry>> onDone);
    }

    public interface ISourcesProvider
    {
        SourceList All();
        SourceEntry Get(string id);
    }

    public static class Services
    {
        public static AppConfig Config;
        public static ICommanderService Commander;
        public static ISpaceWeatherService SpaceWeather;
        public static IScenarioProvider Scenarios;
        public static IEventDirector Events;
        public static ILeaderboardService Leaderboard;
        public static ISourcesProvider Sources;
    }
}
