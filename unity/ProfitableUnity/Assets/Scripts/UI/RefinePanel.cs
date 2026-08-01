#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;
using UnityEngine;
using UnityEngine.UI;

namespace Profitable.Unity.UI
{
    // Agent 35 -- consumes the real Radiant Alloy Bar recipe's exact
    // quantities (2x Igneous Ore + 1x Autunite Crystal) from Inventory,
    // calls Refiner.Refine(), and adds the result back. No formula logic
    // here beyond reading the recipe's own declared quantities.
    public class RefinePanel
    {
        public GameObject Root { get; }

        private readonly Inventory _inventory;
        private readonly Action<string> _log;
        private readonly TierPicker _tierPicker;
        private readonly Text _statusText;

        public RefinePanel(Transform parent, Inventory inventory, Action<string> log)
        {
            _inventory = inventory;
            _log = log;

            var group = UiFactory.CreateVerticalGroup(parent, "RefinePanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Refine", 20);
            _statusText = UiFactory.CreateText(group, "", 13);
            _tierPicker = new TierPicker(group, "Refiner tier:");
            UiFactory.CreateButton(group, "Refine Radiant Alloy Bar", () => TryRefine());

            Refresh();
        }

        public void Refresh()
        {
            var recipe = GameContent.RadiantAlloyBarRecipe;
            var lines = recipe.Inputs.Select(input =>
                $"{input.ResourceId}: {_inventory.TotalQuantity(input.ResourceId)}/{input.Quantity} available");
            _statusText.text = string.Join("\n", lines);
        }

        // Public entry point -- exercised directly by EditMode tests
        // rather than simulating a real Button click.
        public RefineResult? TryRefine()
        {
            var recipe = GameContent.RadiantAlloyBarRecipe;

            foreach (var input in recipe.Inputs)
            {
                if (_inventory.TotalQuantity(input.ResourceId) < input.Quantity)
                {
                    _log($"Refine failed: need {input.Quantity}x {input.ResourceId}, have {_inventory.TotalQuantity(input.ResourceId)}.");
                    return null;
                }
            }

            var consumed = new List<ResourceInstance>();
            foreach (var input in recipe.Inputs)
            {
                consumed.AddRange(_inventory.Take(input.ResourceId, input.Quantity));
            }

            var result = Refiner.Refine(consumed, _tierPicker.SelectedTier);

            var outputInstance = new ResourceInstance
            {
                Resource = GameContent.RadiantAlloyBar,
                Quantity = recipe.OutputQuantity + result.RefundUnits,
                Qualities = result.Qualities,
            };
            _inventory.Add(outputInstance);

            _log($"Refined {recipe.OutputQuantity}x {GameContent.RadiantAlloyBar.Name} " +
                 $"(+{result.RefundUnits} refund) at {_tierPicker.SelectedTier}: " +
                 $"{GatherPanel.DescribeQualities(result.Qualities)}, output tier {result.OutputTier}");

            Refresh();
            return result;
        }
    }
}
