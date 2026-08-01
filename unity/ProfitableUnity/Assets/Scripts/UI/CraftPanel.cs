#nullable enable
using System;
using System.Collections.Generic;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;
using UnityEngine;
using UnityEngine.UI;

namespace Profitable.Unity.UI
{
    // Agent 35 -- consumes the real Ion-Forged Hull Plate recipe's exact
    // quantities (1x Radiant Alloy Bar in the "refined-metal" slot, 1x
    // Hydrogen Gas in the "gas" slot) from Inventory, calls
    // Crafter.Craft(), and logs the result -- including the rejection
    // path, not just the happy path. The slot-to-resource mapping is
    // hardcoded (slot 0 -> Radiant Alloy Bar, slot 1 -> Hydrogen Gas)
    // rather than generic category matching, consistent with this
    // agent's fixed-MVP-content-set scope (see agent-35-unity-mvp
    // -presentation.md's Design decisions) -- craft() itself matches
    // recipe.Inputs positionally against whatever ResourceInstance[] is
    // passed, so this mapping only needs to get the order right.
    public class CraftPanel
    {
        public GameObject Root { get; }

        private readonly Inventory _inventory;
        private readonly Action<string> _log;
        private readonly TierPicker _schematicTierPicker;
        private readonly TierPicker _crafterTierPicker;
        private readonly Text _statusText;

        public CraftPanel(Transform parent, Inventory inventory, Action<string> log)
        {
            _inventory = inventory;
            _log = log;

            var group = UiFactory.CreateVerticalGroup(parent, "CraftPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Craft", 20);
            _statusText = UiFactory.CreateText(group, "", 13);
            _schematicTierPicker = new TierPicker(group, "Schematic tier:");
            _crafterTierPicker = new TierPicker(group, "Crafter tier:");
            UiFactory.CreateButton(group, "Craft Ion-Forged Hull Plate", () => TryCraft());

            Refresh();
        }

        public void Refresh()
        {
            var alloyBarId = GameContent.RadiantAlloyBar.Id;
            var gasId = GameContent.HydrogenGas.Id;
            _statusText.text =
                $"{alloyBarId}: {_inventory.TotalQuantity(alloyBarId)}/1 available\n" +
                $"{gasId}: {_inventory.TotalQuantity(gasId)}/1 available";
        }

        // Public entry point -- exercised directly by EditMode tests
        // rather than simulating a real Button click.
        public CraftResult? TryCraft()
        {
            var recipe = GameContent.IonForgedHullPlateRecipe;
            var alloyBarId = GameContent.RadiantAlloyBar.Id;
            var gasId = GameContent.HydrogenGas.Id;

            var alloyBarSlotQuantity = recipe.Inputs[0].Quantity;
            var gasSlotQuantity = recipe.Inputs[1].Quantity;

            if (_inventory.TotalQuantity(alloyBarId) < alloyBarSlotQuantity ||
                _inventory.TotalQuantity(gasId) < gasSlotQuantity)
            {
                _log($"Craft failed: need {alloyBarSlotQuantity}x {alloyBarId} and {gasSlotQuantity}x {gasId}, " +
                     $"have {_inventory.TotalQuantity(alloyBarId)} and {_inventory.TotalQuantity(gasId)}.");
                return null;
            }

            var alloyBarInstances = _inventory.Take(alloyBarId, alloyBarSlotQuantity);
            var gasInstances = _inventory.Take(gasId, gasSlotQuantity);
            var inputs = new List<ResourceInstance>();
            inputs.AddRange(alloyBarInstances);
            inputs.AddRange(gasInstances);

            var result = Crafter.Craft(inputs, recipe, _schematicTierPicker.SelectedTier, _crafterTierPicker.SelectedTier);

            if (result is CraftAccepted accepted)
            {
                _log($"Crafted {recipe.OutputQuantity}x Ion-Forged Hull Plate " +
                     $"(schematic {_schematicTierPicker.SelectedTier}, crafter {_crafterTierPicker.SelectedTier}): " +
                     $"{GatherPanel.DescribeQualities(accepted.Qualities)}");
            }
            else if (result is CraftRejected rejected)
            {
                // A rejected craft never happened -- give the consumed
                // materials back rather than silently destroying them
                // (matches src/presentation/scenes/CraftScene.ts's own
                // established behavior).
                foreach (var instance in inputs)
                {
                    _inventory.Add(instance);
                }
                _log($"Craft rejected: {rejected.Reason}");
            }

            Refresh();
            return result;
        }
    }
}
