// Entry point. Put ONE GameObject named "Game" with this component in Game.unity — that's all M0/M1 need.
// OWNER: Arystan
// It adds TurnController, ApiClient and the temporary DebugHud, installs services and starts the mission.
using UnityEngine;

namespace MissionTrainer
{
    [DefaultExecutionOrder(-100)]
    public class GameBootstrap : MonoBehaviour
    {
        [Tooltip("Temporary IMGUI interface. Turn off once the real UGUI screens exist.")]
        [SerializeField] bool useDebugHud = true;

        void Awake()
        {
            Application.targetFrameRate = 60;
            // TryGetComponent, not "GetComponent ?? Add": in the Editor a missing component is a fake-null object.
            if (!TryGetComponent(out ApiClient api)) api = gameObject.AddComponent<ApiClient>();
            ServiceInstaller.InstallAll(api);   // Omar decides fake vs real services
        }

        void Start()
        {
            if (!TryGetComponent(out TurnController turns)) turns = gameObject.AddComponent<TurnController>();
            if (useDebugHud && !TryGetComponent(out DebugHud _)) gameObject.AddComponent<DebugHud>();
            turns.StartMission();
        }
    }
}
