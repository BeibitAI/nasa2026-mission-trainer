// The sol-by-sol game loop: Briefing -> Allocate -> Simulate -> Debrief -> next sol / GameOver.
// OWNER: Arystan
// TODO(Arystan): replace the fixed simulate delay with the real 5-10 s base animation (View/).
// TODO(Arystan): module building between sols (every N sols), feeding builtModules to the director.
using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace MissionTrainer
{
    public enum Phase { Loading, Briefing, Allocate, Simulate, Debrief, GameOver }

    public class TurnController : MonoBehaviour
    {
        [SerializeField] string scenarioId = "mars";
        [SerializeField] float simulateSeconds = 2f;

        public Phase Phase { get; private set; } = Phase.Loading;
        public ScenarioConfig Scenario { get; private set; }
        public ResourceState State { get; private set; }
        public PowerAllocation Allocation { get; private set; } = new PowerAllocation();
        public SolConditions Conditions { get; private set; }
        public SolResult LastResult { get; private set; }
        public CommanderReply CommanderMessage { get; private set; }
        public SpaceWeatherSummary SpaceWeather { get; private set; }
        public int Sol { get; private set; }
        /// <summary>Comms-delay decision: the local Weather Station warns about solar storms in time,
        /// but uses power every sol it is on. Takes effect from the NEXT sol (it needs time to watch the Sun).</summary>
        public bool WeatherStationOn { get; private set; }
        public int StationCost => WeatherStationOn ? Scenario.weatherStationPowerCost : 0;
        public int AvailablePower => Conditions == null ? 0
            : Mathf.Max(0, ResourceModel.AvailablePower(Scenario, Conditions) - StationCost);
        public int UnusedPower => AvailablePower - Allocation.Total;
        public readonly List<SolResult> History = new List<SolResult>();
        public readonly HashSet<string> BuiltModules = new HashSet<string>();
        public string SessionId { get; private set; }
        public float MissionStartTime { get; private set; }

        public event Action<Phase> PhaseChanged;
        public event Action<CommanderReply> CommanderSpoke;
        public event Action<SolResult> SolResolved;

        public void StartMission()
        {
            Scenario = Services.Scenarios.Load(scenarioId);
            State = Scenario.start != null ? Scenario.start.Clone() : new ResourceState();
            Sol = 0;
            History.Clear();
            BuiltModules.Clear();
            WeatherStationOn = false;
            SessionId = Guid.NewGuid().ToString();
            MissionStartTime = Time.time;
            SetPhase(Phase.Loading);
            Services.SpaceWeather.GetSummary(sw =>
            {
                SpaceWeather = sw;
                Services.Events.StartMission(Scenario, sw, UnityEngine.Random.Range(0, int.MaxValue));
                NextSol();
            });
        }

        public void NextSol()
        {
            if (Phase == Phase.GameOver) return;
            Sol++;
            // The station decided last sol protects this sol.
            if (WeatherStationOn) BuiltModules.Add(EventDirector.WeatherStation);
            else BuiltModules.Remove(EventDirector.WeatherStation);
            Conditions = Services.Events.BeginSol(Sol, BuiltModules);
            Allocation = DefaultAllocation();
            SetPhase(Phase.Briefing);
            AskCommander("briefing", null);
            SetPhase(Phase.Allocate);
        }

        public bool TryChange(string system, int delta)
        {
            if (Phase != Phase.Allocate) return false;
            if (delta > 0 && UnusedPower < delta) return false;
            switch (system)
            {
                case "lifeSupport": if (Allocation.lifeSupport + delta < 0) return false; Allocation.lifeSupport += delta; break;
                case "greenhouse": if (Allocation.greenhouse + delta < 0) return false; Allocation.greenhouse += delta; break;
                case "shield": if (Allocation.shield + delta < 0) return false; Allocation.shield += delta; break;
                case "science": if (Allocation.science + delta < 0) return false; Allocation.science += delta; break;
                default: return false;
            }
            return true;
        }

        /// <summary>Turn the Weather Station on/off during allocation. Turning on needs 1 unused power unit.</summary>
        public bool ToggleWeatherStation()
        {
            if (Phase != Phase.Allocate) return false;
            if (!WeatherStationOn && UnusedPower < Scenario.weatherStationPowerCost) return false;
            WeatherStationOn = !WeatherStationOn;
            return true;
        }

        public void CommitAllocation()
        {
            if (Phase != Phase.Allocate) return;
            StartCoroutine(SimulateRoutine());
        }

        IEnumerator SimulateRoutine()
        {
            SetPhase(Phase.Simulate);
            LastResult = ResourceModel.Simulate(Scenario, State, Allocation, Conditions);
            LastResult.weatherStationOn = WeatherStationOn;
            yield return new WaitForSeconds(simulateSeconds);
            State = LastResult.after;
            History.Add(LastResult);
            SolResolved?.Invoke(LastResult);
            AskCommander("debrief", LastResult);
            SetPhase(LastResult.outcome == "fail" || LastResult.outcome == "win" ? Phase.GameOver : Phase.Debrief);
        }

        void AskCommander(string phase, SolResult r)
        {
            var req = new CommanderRequest
            {
                sessionId = SessionId,
                scenario = Scenario.id,
                sol = Sol,
                phase = phase,
                allocation = (r != null ? r.allocation : Allocation).Clone(),
                before = (r != null ? r.before : State).Clone(),
                after = (r != null ? r.after : State).Clone(),
                outcome = r != null ? r.outcome : "ok",
            };
            bool surprise = false;
            foreach (var e in Conditions.active)
            {
                if (e.known || phase == "debrief")
                    req.events.Add(new EventInfo { id = e.def.id, fact = e.def.fact });
                if (!e.known) surprise = true;
            }
            // A storm nobody warned us about = the communication-delay lesson.
            if (phase == "debrief" && surprise && !string.IsNullOrEmpty(Scenario.commsDelayFact))
                req.events.Add(new EventInfo { id = "comms_delay", fact = Scenario.commsDelayFact });

            CommanderMessage = new CommanderReply { text = "...", tip = "", source = "local" };
            Services.Commander.GetMessage(req, reply =>
            {
                CommanderMessage = reply;
                CommanderSpoke?.Invoke(reply);
            });
        }

        PowerAllocation DefaultAllocation()
        {
            // Start each sol with upkeep pre-filled so kids see a sensible baseline.
            var a = new PowerAllocation();
            int left = AvailablePower;
            a.lifeSupport = Mathf.Min(left, Scenario.systems.lifeSupport.upkeep); left -= a.lifeSupport;
            a.greenhouse = Mathf.Min(left, Scenario.systems.greenhouse.upkeep);
            return a;
        }

        void SetPhase(Phase p)
        {
            Phase = p;
            PhaseChanged?.Invoke(p);
        }
    }
}
