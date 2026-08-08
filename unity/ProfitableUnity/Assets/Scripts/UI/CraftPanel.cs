#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;
using UnityEngine;
using UnityEngine.UI;

namespace Profitable.Unity.UI
{
    // Agent 35 -- consumes a chosen Recipe's category-based inputs from
    // Inventory, calls Crafter.Craft(), and logs the result -- including
    // the rejection path, not just the happy path.
    //
    // Gap closed (2026-08-04): originally hardcoded to
    // GameContent.IonForgedHullPlateRecipe only, reachable through no
    // other recipe -- mirrors src/presentation/scenes/CraftScene.ts's own
    // "Fix RefineScene/CraftScene recipe lock" correction exactly (commit
    // 658d967). Ship component recipes (the 16 linked via
    // content/componentRecipes.json) stay out of this list -- they'd be
    // ShipAssemblyScene's exclusive domain on the TypeScript side, and
    // this Unity build has no equivalent ship-assembly UI yet (a
    // documented scope limit, not an oversight) -- see
    // GameContent.GeneralCraftingRecipes' own comment for the exact same
    // exclusion CraftScene.generalRecipes() applies.
    //
    // Ship Crew Roles wiring (Crafter/Artisan only): an Artisan assigned
    // as the active ship's Crafter discounts general-recipe input
    // quantities, applied entirely upstream of Crafter.Craft() --
    // Crafter.Craft() itself is never touched, ports
    // CraftScene.getArtisanDiscountPercent()/effectiveSlotQuantity()
    // exactly (crafting.md's crew-agnostic contract holds here too).
    public class CraftPanel
    {
        public GameObject Root { get; }

        private readonly Inventory _inventory;
        private readonly Action<string> _log;
        private readonly TierPicker _schematicTierPicker;
        private readonly TierPicker _crafterTierPicker;
        private readonly RectTransform _recipeGroup;

        public CraftPanel(Transform parent, Inventory inventory, Action<string> log)
        {
            _inventory = inventory;
            _log = log;

            var group = UiFactory.CreateVerticalGroup(parent, "CraftPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Craft", 20);
            _schematicTierPicker = new TierPicker(group, "Schematic tier:");
            _crafterTierPicker = new TierPicker(group, "Crafter tier:");

            UiFactory.CreateText(group, "Recipes:", 14);
            _recipeGroup = UiFactory.CreateVerticalGroup(group, "Recipes");

            Refresh();
        }

        public void Refresh()
        {
            UiFactory.ClearChildren(_recipeGroup);
            foreach (var recipe in GameContent.GeneralCraftingRecipes)
            {
                var row = UiFactory.CreateHorizontalGroup(_recipeGroup, $"Recipe_{recipe.Id}");
                var requirementText = string.Join(", ", recipe.Inputs.Select(input =>
                {
                    var resource = ResolveSlotResource(input.Category);
                    var have = resource is null ? 0 : _inventory.TotalQuantity(resource.Id);
                    return $"{have}/{EffectiveSlotQuantity(input.Quantity)}x {resource?.Name ?? input.Category}";
                }));
                UiFactory.CreateText(row, $"{recipe.Name} (needs {requirementText})", 12);
                UiFactory.CreateButton(row, $"Craft {recipe.Name}", () => TryCraft(recipe.Id));
            }
        }

        // Public entry point -- exercised directly by EditMode tests
        // rather than simulating a real Button click. `recipeId` null
        // defaults to the general roster's first recipe (Ion-Forged Hull
        // Plate), matching this panel's own previous hardcoded-only
        // behavior -- every caller that never knew about the selector
        // keeps working unchanged.
        public CraftResult? TryCraft(string? recipeId = null)
        {
            var recipe = recipeId is null
                ? GameContent.GeneralCraftingRecipes[0]
                : GameContent.GeneralCraftingRecipes.First(r => r.Id == recipeId);

            var slotResources = recipe.Inputs.Select(input => (input, resource: ResolveSlotResource(input.Category))).ToList();
            if (slotResources.Any(s => s.resource is null || _inventory.TotalQuantity(s.resource.Id) < EffectiveSlotQuantity(s.input.Quantity)))
            {
                var need = string.Join(", ", slotResources.Select(s => $"{EffectiveSlotQuantity(s.input.Quantity)}x {s.resource?.Name ?? s.input.Category}"));
                _log($"Craft failed: need {need}.");
                return null;
            }

            var inputs = new List<ResourceInstance>();
            foreach (var (input, resource) in slotResources)
            {
                inputs.AddRange(_inventory.Take(resource!.Id, EffectiveSlotQuantity(input.Quantity)));
            }

            var schematic = GameContent.Loaded.Schematics.FirstOrDefault(s => s.RecipeId == recipe.Id);
            var schematicTier = schematic?.Tier ?? TierColor.Grey;

            var result = Crafter.Craft(inputs, recipe, schematicTier, _crafterTierPicker.SelectedTier);

            if (result is CraftAccepted accepted)
            {
                var outputResource = FindResource(recipe.OutputResourceId);
                _inventory.Add(new ResourceInstance { Resource = outputResource, Quantity = recipe.OutputQuantity, Qualities = accepted.Qualities });
                _log($"Crafted {recipe.OutputQuantity}x {outputResource.Name} " +
                     $"(schematic {schematicTier}, crafter {_crafterTierPicker.SelectedTier}): " +
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

        // Crafting recipes are category-based, not resource-id-based (GDD:
        // "not fixed to specific materials"). The MVP content only ever
        // has one resource per relevant category, so resolving the first
        // match is a reasonable presentation-layer simplification for
        // this content -- it's inventory/UI bookkeeping, not part of
        // Crafter.Craft()'s own formula. Ports
        // CraftScene.resolveSlotResource() exactly.
        private static Resource? ResolveSlotResource(string category) =>
            GameContent.Loaded.Resources.FirstOrDefault(r => r.Category == category);

        private static Resource FindResource(string resourceId) =>
            GameContent.Loaded.Resources.First(r => r.Id == resourceId);

        // Ship Crew Roles amendment: "the active ship" reuses MapPanel's
        // own OwnedShips.FirstOrDefault() convention -- there is no
        // separate concept of "the ship the player is currently crafting
        // from" anywhere else in this codebase to hang this off of
        // instead. Ports CraftScene.getArtisanDiscountPercent() exactly.
        private static double GetArtisanDiscountPercent()
        {
            var ship = ShipsState.OwnedShips.FirstOrDefault();
            if (ship is null) return 0;
            var artisan = CrewState.Crew.FirstOrDefault(m =>
                m.AssignedShipId == ship.Id && m.ShipRole == ShipCrewRole.Crafter && m.Profession == "Artisan");
            if (artisan is null) return 0;
            return ShipsAndTravelConfig.ArtisanMaterialDiscountByTier.TryGetValue(artisan.Tier, out var discount) ? discount : 0;
        }

        // Fraction of a slot's required quantity waived, rounded down,
        // never below 1 unit required -- ports
        // CraftScene.effectiveSlotQuantity() exactly.
        private static int EffectiveSlotQuantity(int baseQuantity)
        {
            var discount = GetArtisanDiscountPercent();
            if (discount <= 0) return baseQuantity;
            return Math.Max(1, (int)Math.Floor(baseQuantity * (1 - discount)));
        }
    }
}
