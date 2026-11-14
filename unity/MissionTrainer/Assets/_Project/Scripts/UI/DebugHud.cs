// TEMPORARY playable interface (IMGUI) so the very first WebGL build is already a game.
// OWNER: Arystan
// TODO(Arystan): replace with real UGUI screens (big buttons, icons, kid-friendly), then disable in GameBootstrap.
using System.Text;
using UnityEngine;

namespace MissionTrainer
{
    public class DebugHud : MonoBehaviour
    {
        TurnController t;
        bool showSources;
        Vector2 scroll;
        GUIStyle big, title, box;

        static readonly (string id, string label)[] Systems =
        {
            ("lifeSupport", "Life Support (air & water)"),
            ("greenhouse", "Greenhouse (food)"),
            ("shield", "Radiation Shield"),
            ("science", "Science"),
        };

        void Awake() => t = GetComponent<TurnController>();

        void Styles()
        {
            if (big != null) return;
            big = new GUIStyle(GUI.skin.button) { fontSize = 20 };
            title = new GUIStyle(GUI.skin.label) { fontSize = 24, fontStyle = FontStyle.Bold, wordWrap = true };
            box = new GUIStyle(GUI.skin.label) { fontSize = 18, wordWrap = true };
        }

        void OnGUI()
        {
            if (t == null || t.Scenario == null || t.State == null) return;
            Styles();
            float scale = Mathf.Max(0.6f, Screen.height / 900f);
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale, scale, 1f));
            float w = Screen.width / scale, h = Screen.height / scale;

            GUILayout.BeginArea(new Rect(20, 20, Mathf.Min(560, w - 40), h - 40), GUI.skin.box);
            scroll = GUILayout.BeginScrollView(scroll);

            GUILayout.Label($"{t.Scenario.displayName} | Sol {t.Sol}/{t.Scenario.sols}", title);
            Bar("Air & Water", t.State.air, 100);
            Bar("Food", t.State.food, 100);
            Bar("Radiation dose", t.State.dose, t.Scenario.doseLimit);
            GUILayout.Label($"Science: {t.State.science:0} / {t.Scenario.systems.science.goal:0}", box);

            if (t.Conditions != null)
                foreach (var note in t.Conditions.briefingNotes) GUILayout.Label("* " + note, box);

            if (t.CommanderMessage != null)
                GUILayout.Label($"Commander: {t.CommanderMessage.text}\n<i>{t.CommanderMessage.tip}</i>  [{t.CommanderMessage.source}]",
                    new GUIStyle(box) { richText = true });

            GUILayout.Space(10);
            switch (t.Phase)
            {
                case Phase.Allocate: AllocationPanel(); break;
                case Phase.Simulate: GUILayout.Label("Running the sol...", title); break;
                case Phase.Debrief:
                    ResultPanel();
                    if (GUILayout.Button("Next Sol >", big, GUILayout.Height(50))) t.NextSol();
                    break;
                case Phase.GameOver:
                    ResultPanel();
                    GUILayout.Label(t.LastResult.outcome == "win" ? "MISSION COMPLETE!" : $"MISSION OVER ({t.LastResult.failReason})", title);
                    if (GUILayout.Button("Play again", big, GUILayout.Height(50))) t.StartMission();
                    break;
                default: GUILayout.Label("Loading...", box); break;
            }

            GUILayout.Space(10);
            if (GUILayout.Button(showSources ? "Hide data sources" : "Where does this data come from?", big)) showSources = !showSources;
            if (showSources && Services.Sources != null)
                foreach (var s in Services.Sources.All().sources)
                    if (GUILayout.Button($"{s.title} ({s.provider})\n{s.usedFor}", box) && !string.IsNullOrEmpty(s.url))
                        Application.OpenURL(s.url);

            GUILayout.EndScrollView();
            GUILayout.EndArea();
        }

        void AllocationPanel()
        {
            GUILayout.Label($"Power today: {t.AvailablePower}   (unused: {t.UnusedPower})", title);
            var a = t.Allocation;
            foreach (var (id, label) in Systems)
            {
                int v = id == "lifeSupport" ? a.lifeSupport : id == "greenhouse" ? a.greenhouse : id == "shield" ? a.shield : a.science;
                GUILayout.BeginHorizontal();
                GUILayout.Label($"{label}: {v}", box, GUILayout.Width(330));
                if (GUILayout.Button("-", big, GUILayout.Width(60), GUILayout.Height(40))) t.TryChange(id, -1);
                if (GUILayout.Button("+", big, GUILayout.Width(60), GUILayout.Height(40))) t.TryChange(id, +1);
                GUILayout.EndHorizontal();
            }
            if (GUILayout.Button("Start the sol >", big, GUILayout.Height(50))) t.CommitAllocation();
        }

        void ResultPanel()
        {
            var r = t.LastResult;
            if (r == null) return;
            var sb = new StringBuilder();
            sb.AppendLine($"Air {r.before.air:0} -> {r.after.air:0}   Food {r.before.food:0} -> {r.after.food:0}");
            sb.AppendLine($"Radiation +{r.doseAdded:0.0} (shield blocked {r.shieldReduction * 100f:0}%)");
            foreach (var e in r.conditions.active) sb.AppendLine($"Event: {e.def.title}: {e.def.fact}");
            GUILayout.Label(sb.ToString(), box);
        }

        void Bar(string label, float value, float max)
        {
            int filled = Mathf.Clamp(Mathf.RoundToInt(value / max * 20f), 0, 20);
            GUILayout.Label($"{label,-16} [{new string('#', filled)}{new string('-', 20 - filled)}] {value:0}", box);
        }
    }
}
