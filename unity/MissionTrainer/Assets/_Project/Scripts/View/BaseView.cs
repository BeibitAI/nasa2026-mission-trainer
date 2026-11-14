// Visual reaction of the 3D base to the simulation.
// OWNER: Arystan
using UnityEngine;

namespace MissionTrainer
{
    public class BaseView : MonoBehaviour
    {
        [SerializeField] TurnController turns;
        [SerializeField] Light sun;
        [SerializeField] Transform[] solarPanels;   // rotate slowly; dim during dust storms

        float baseIntensity = 1f;

        void Start()
        {
            if (turns == null) turns = FindFirstObjectByType<TurnController>();
            if (sun != null) baseIntensity = sun.intensity;
        }

        void Update()
        {
            if (turns == null || turns.Conditions == null) return;
            // Dust storm = dimmer sun (real effect: dust blocks sunlight -> less solar power).
            if (sun != null)
                sun.intensity = Mathf.Lerp(sun.intensity, baseIntensity * turns.Conditions.solarFactor, Time.deltaTime * 2f);
            foreach (var p in solarPanels)
                if (p != null) p.Rotate(Vector3.up, 5f * Time.deltaTime, Space.World);
        }

        // TODO(Arystan): red screen tint + particle effect while a radiation storm is active.
        // TODO(Arystan): crew walks into the Shelter when shield allocation is high.
        // TODO(Arystan): show/hide module prefabs from turns.BuiltModules.
    }
}
