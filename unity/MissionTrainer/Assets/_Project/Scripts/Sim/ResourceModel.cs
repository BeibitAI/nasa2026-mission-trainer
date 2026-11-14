// Pure C# simulation rules — no MonoBehaviour, easy to test and balance.
// OWNER: Arystan
// TODO(Arystan): balance after playing 5 runs with different strategies — no "free" choice allowed.
// TODO(Arystan): module effects (Battery stores unused power, Shelter = permanent shield bonus...).
using UnityEngine;

namespace MissionTrainer
{
    public static class ResourceModel
    {
        public static int AvailablePower(ScenarioConfig cfg, SolConditions c)
        {
            return Mathf.Max(0, Mathf.RoundToInt(cfg.powerPerSol * c.solarFactor));
        }

        public static SolResult Simulate(ScenarioConfig cfg, ResourceState state, PowerAllocation a, SolConditions c)
        {
            var s = cfg.systems;
            var after = state.Clone();

            after.air = Mathf.Clamp(after.air + SystemDelta(s.lifeSupport, a.lifeSupport), 0f, 100f);
            after.food = Mathf.Clamp(after.food + SystemDelta(s.greenhouse, a.greenhouse), 0f, 100f);

            float reduction = Mathf.Min(s.shield.maxReduction, a.shield * s.shield.reductionPerUnit);
            float doseAdded = cfg.baseDosePerSol * c.radiationMultiplier * (1f - reduction);
            after.dose = Mathf.Min(cfg.doseLimit, after.dose + doseAdded);

            after.science += a.science * s.science.pointsPerUnit;

            var result = new SolResult
            {
                sol = c.sol,
                before = state.Clone(),
                after = after,
                allocation = a.Clone(),
                conditions = c,
                shieldReduction = reduction,
                doseAdded = doseAdded,
            };
            (result.outcome, result.failReason) = Judge(cfg, after, c.sol);
            return result;
        }

        static float SystemDelta(SystemRule rule, int units)
        {
            int diff = units - rule.upkeep;
            return diff >= 0 ? diff * rule.gainPerExtraUnit : diff * rule.lossPerMissingUnit;
        }

        static (string, string) Judge(ScenarioConfig cfg, ResourceState s, int sol)
        {
            if (s.air <= 0f) return ("fail", "air");
            if (s.food <= 0f) return ("fail", "food");
            if (s.dose >= cfg.doseLimit) return ("fail", "dose");
            if (sol >= cfg.sols)
                return s.science >= cfg.systems.science.goal ? ("win", null) : ("fail", "science");
            bool low = s.air < 30f || s.food < 30f || s.dose > cfg.doseLimit * 0.7f;
            return (low ? "warning" : "ok", null);
        }
    }
}
