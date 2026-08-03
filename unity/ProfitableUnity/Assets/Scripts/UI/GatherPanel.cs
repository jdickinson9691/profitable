using System;
using System.Linq;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;
using UnityEngine;

namespace Profitable.Unity.UI
{
    // Migration Phase 2 Sub-Phase A rewrite (Presentation/Integration --
    // agent-41-unity-galaxy-planet-presentation.md), replacing Agent 35's
    // three-fixed-button/fresh-roll-per-click MVP version. Matches
    // mining.md's real, already-shipped TypeScript behavior change (src
    // /presentation/scenes/GatherScene.ts): quality rolling moved to
    // planet generation/reset-cycle time (PlanetResourceCycle), so this
    // panel reads GetCurrentPlanetResources() ONCE per visit (construction
    // time) and every click adds that already-fixed quality -- it never
    // rolls anything itself.
    //
    // Ship travel/current-planet tracking is Sub-Phase D's scope, not yet
    // ported -- this always reads GalaxyState.StartingPlanet, same as
    // GatherScene.ts would if getCurrentPlanet() didn't exist yet.
    public class GatherPanel
    {
        public GameObject Root { get; }

        private readonly Inventory _inventory;
        private readonly Action<string> _log;
        private readonly PlanetResourceCycle.ResourcesForCycle _currentResources;

        public GatherPanel(Transform parent, Inventory inventory, Action<string> log)
        {
            _inventory = inventory;
            _log = log;

            var planet = GalaxyState.StartingPlanet;
            _currentResources = PlanetResourceCycle.GetCurrentPlanetResources(
                planet,
                GameContent.Loaded.Resources,
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                isStartingPlanet: true);

            var group = UiFactory.CreateVerticalGroup(parent, "GatherPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Gather", 20);
            var buttonRow = UiFactory.CreateHorizontalGroup(group, "GatherButtons");

            foreach (var resourceId in _currentResources.ProducibleResourceIds)
            {
                var resource = FindResource(resourceId);
                UiFactory.CreateButton(buttonRow, $"Gather {resource.Name}", () => Gather(resourceId));
            }
        }

        // The public entry point -- exercised directly by EditMode tests
        // (same convention as Agent 35's own version), since Button
        // .onClick invokes this same method. Takes a resource id rather
        // than a Resource: the quality gathered is looked up by id from
        // this panel's already-resolved current-cycle snapshot, never
        // rolled fresh here.
        public ResourceInstance Gather(string resourceId)
        {
            var resource = FindResource(resourceId);
            var qualities = _currentResources.ResourceQualities[resourceId];
            var instance = new ResourceInstance { Resource = resource, Quantity = 1, Qualities = qualities };
            _inventory.Add(instance);

            _log($"Gathered 1x {resource.Name}: {DescribeQualities(qualities)}");
            return instance;
        }

        private static Resource FindResource(string resourceId) =>
            GameContent.Loaded.Resources.First(r => r.Id == resourceId);

        public static string DescribeQualities(QualityMap qualities)
        {
            var parts = Qualities.All
                .Where(q => qualities.TryGetValue(q, out var v) && v is not null)
                .Select(q => $"{Qualities.ToJsonName(q)}={qualities[q]} ({TierColorResolver.GetTierColor(qualities[q]!.Value)})");
            return string.Join(", ", parts);
        }
    }
}
