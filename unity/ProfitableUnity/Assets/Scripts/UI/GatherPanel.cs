using System;
using System.Linq;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;
using UnityEngine;

namespace Profitable.Unity.UI
{
    // Agent 35 -- one button per MVP resource; each click calls
    // QualityRoller.RollQuality() for that resource and adds the result
    // to the shared Inventory. No quality/tier math happens here beyond
    // formatting QualityRoller's/TierColorResolver's own output for
    // display.
    public class GatherPanel
    {
        public GameObject Root { get; }

        private readonly Inventory _inventory;
        private readonly Action<string> _log;

        public GatherPanel(Transform parent, Inventory inventory, Action<string> log)
        {
            _inventory = inventory;
            _log = log;

            var group = UiFactory.CreateVerticalGroup(parent, "GatherPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Gather", 20);
            var buttonRow = UiFactory.CreateHorizontalGroup(group, "GatherButtons");

            UiFactory.CreateButton(buttonRow, "Gather Igneous Ore", () => Gather(GameContent.IgneousOre));
            UiFactory.CreateButton(buttonRow, "Gather Hydrogen Gas", () => Gather(GameContent.HydrogenGas));
            UiFactory.CreateButton(buttonRow, "Gather Autunite Crystal", () => Gather(GameContent.AutuniteCrystal));
        }

        // The public entry point -- exercised directly by EditMode tests
        // (agent-35-unity-mvp-presentation.md's Testing Requirements)
        // rather than simulating a real Button click, since Button
        // .onClick invokes this same method.
        public ResourceInstance Gather(Resource resource)
        {
            var qualities = QualityRoller.RollQuality(resource);
            var instance = new ResourceInstance { Resource = resource, Quantity = 1, Qualities = qualities };
            _inventory.Add(instance);

            _log($"Gathered 1x {resource.Name}: {DescribeQualities(qualities)}");
            return instance;
        }

        public static string DescribeQualities(QualityMap qualities)
        {
            var parts = Qualities.All
                .Where(q => qualities.TryGetValue(q, out var v) && v is not null)
                .Select(q => $"{Qualities.ToJsonName(q)}={qualities[q]} ({TierColorResolver.GetTierColor(qualities[q]!.Value)})");
            return string.Join(", ", parts);
        }
    }
}
