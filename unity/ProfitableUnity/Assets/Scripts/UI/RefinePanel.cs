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
    // Agent 35 -- consumes a chosen RefiningRecipe's exact quantities from
    // Inventory, calls Refiner.Refine(), and adds the result back. No
    // formula logic here beyond reading the recipe's own declared
    // quantities.
    //
    // Gap closed (2026-08-04): originally hardcoded to
    // GameContent.RadiantAlloyBarRecipe only, reachable through no other
    // recipe -- mirrors src/presentation/scenes/RefineScene.ts's own
    // "Fix RefineScene/CraftScene recipe lock" correction exactly (commit
    // 658d967), and the same "list all, let the player choose" shape
    // ShipsPanel's shipyard listing already established in this Unity
    // build -- one row per real RefiningRecipe (the full 10-recipe alpha
    // roster from content/refiningRecipes.json), each with its own
    // directly-actionable Refine button, rather than a separate
    // select-then-confirm step.
    public class RefinePanel
    {
        public GameObject Root { get; }

        private readonly Inventory _inventory;
        private readonly Action<string> _log;
        private readonly TierPicker _tierPicker;
        private readonly RectTransform _recipeGroup;

        public RefinePanel(Transform parent, Inventory inventory, Action<string> log)
        {
            _inventory = inventory;
            _log = log;

            var group = UiFactory.CreateVerticalGroup(parent, "RefinePanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Refine", 20);
            _tierPicker = new TierPicker(group, "Refiner tier:");

            UiFactory.CreateText(group, "Recipes:", 14);
            _recipeGroup = UiFactory.CreateVerticalGroup(group, "Recipes");

            Refresh();
        }

        public void Refresh()
        {
            UiFactory.ClearChildren(_recipeGroup);
            foreach (var recipe in GameContent.Loaded.RefiningRecipes)
            {
                var row = UiFactory.CreateHorizontalGroup(_recipeGroup, $"Recipe_{recipe.Id}");
                var requirementText = string.Join(", ", recipe.Inputs.Select(input =>
                    $"{_inventory.TotalQuantity(input.ResourceId)}/{input.Quantity}x {FindResource(input.ResourceId).Name}"));
                UiFactory.CreateText(row, $"{recipe.Name} (needs {requirementText})", 12);
                UiFactory.CreateButton(row, $"Refine {recipe.Name}", () => TryRefine(recipe.Id));
            }
        }

        // Public entry point -- exercised directly by EditMode tests
        // rather than simulating a real Button click. `recipeId` null
        // defaults to the roster's first recipe (Radiant Alloy Bar),
        // matching this panel's own previous hardcoded-only behavior --
        // every caller that never knew about the selector keeps working
        // unchanged.
        public RefineResult? TryRefine(string? recipeId = null)
        {
            var recipe = recipeId is null
                ? GameContent.Loaded.RefiningRecipes[0]
                : GameContent.Loaded.RefiningRecipes.First(r => r.Id == recipeId);

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

            var outputResource = FindResource(recipe.OutputResourceId);
            var outputInstance = new ResourceInstance
            {
                Resource = outputResource,
                Quantity = recipe.OutputQuantity + result.RefundUnits,
                Qualities = result.Qualities,
            };
            _inventory.Add(outputInstance);

            _log($"Refined {recipe.OutputQuantity}x {outputResource.Name} " +
                 $"(+{result.RefundUnits} refund) at {_tierPicker.SelectedTier}: " +
                 $"{GatherPanel.DescribeQualities(result.Qualities)}, output tier {result.OutputTier}");

            Refresh();
            return result;
        }

        private static Resource FindResource(string resourceId) =>
            GameContent.Loaded.Resources.First(r => r.Id == resourceId);
    }
}
