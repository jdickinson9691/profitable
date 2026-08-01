using Profitable.Unity.Content;
using UnityEngine;

namespace Profitable.Unity.UI
{
    // Agent 35 -- Delta Rigelus as the only location, per Agent 5's own
    // MVP scope ("no travel, no other planets, no modifiers").
    public class MapPanel
    {
        public GameObject Root { get; }

        public MapPanel(Transform parent)
        {
            var group = UiFactory.CreateVerticalGroup(parent, "MapPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Map", 20);
            UiFactory.CreateText(group, $"Current location: {GameContent.StartingPlanet.Name}", 15);
            UiFactory.CreateText(group, "(Single planet for MVP scope -- no travel yet.)", 12);
        }
    }
}
