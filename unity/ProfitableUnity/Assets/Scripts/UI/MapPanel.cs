using Profitable.Unity.Content;
using UnityEngine;

namespace Profitable.Unity.UI
{
    // Migration Phase 2 Sub-Phase A rewrite (Presentation/Integration --
    // agent-41-unity-galaxy-planet-presentation.md), replacing Agent 35's
    // single hardcoded "Delta Rigelus" line with a real generated galaxy
    // (GalaxyState). Travel is still out of scope (Sub-Phase D) -- this
    // only shows the galaxy overview and highlights the starting planet,
    // it doesn't yet let the player go anywhere else.
    public class MapPanel
    {
        public GameObject Root { get; }

        public MapPanel(Transform parent)
        {
            var group = UiFactory.CreateVerticalGroup(parent, "MapPanel");
            Root = group.gameObject;

            var galaxy = GalaxyState.Galaxy;
            var startingPlanet = GalaxyState.StartingPlanet;

            UiFactory.CreateText(group, "Map", 20);
            UiFactory.CreateText(group, $"Current location: {startingPlanet.Name} ({startingPlanet.Tier} tier, {startingPlanet.PlanetType})", 15);
            UiFactory.CreateText(group, $"Galaxy: {galaxy.Planets.Count} planets generated (seed {galaxy.Seed})", 12);
            UiFactory.CreateText(group, "(Travel not yet implemented -- only the starting planet is reachable.)", 12);

            foreach (var planet in galaxy.Planets)
            {
                var marker = planet.Id == startingPlanet.Id ? "*" : "-";
                UiFactory.CreateText(group, $"{marker} {planet.Name} [{planet.Tier}, {planet.PlanetType}] @ ({planet.Position!.X}, {planet.Position!.Y})", 11);
            }
        }
    }
}
