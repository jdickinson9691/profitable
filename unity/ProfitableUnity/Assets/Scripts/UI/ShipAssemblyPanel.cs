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
    // Ports src/presentation/scenes/ShipAssemblyScene.ts. Crafts a ship
    // component in place (calling Crafter.Craft() directly against player
    // Inventory, then wrapping its output into a real ShipComponent and
    // installing it via the already-ported ShipAssembler.AssembleShip())
    // rather than routing through CraftPanel -- mirrors CraftScene.ts's own
    // "component recipes are ShipAssemblyScene's exclusive domain" split
    // exactly (see GameContent.GeneralCraftingRecipes' own comment for the
    // matching exclusion on the Craft side). Its own nav entry, not folded
    // into CraftPanel, same as the TypeScript source's own separate scene.
    //
    // Faithful port, not a redesign -- two real TS behaviors are preserved
    // deliberately here, not fixed:
    // - Unconditional slot overwrite. AssembleShip() has no occupied-slot
    //   check (ShipComponentSlots.With() just replaces the entry) -- so
    //   installing into a filled slot silently discards whatever was there
    //   before, exactly like assembleShip.ts:23. Improving this is a
    //   separate, deliberate decision to make later, not something to slip
    //   in silently during a port.
    // - No component inventory. A crafted component is never added to
    //   Inventory as a holdable item -- no Inventory.Add() call for the
    //   craft output anywhere below, unlike CraftPanel's general-recipe
    //   path. Craft-and-install-immediately, never craft-then-choose-later,
    //   exactly like ShipAssemblyScene.onCraftAndInstall() never calling
    //   addBatch() for the component it just built.
    public class ShipAssemblyPanel
    {
        public GameObject Root { get; }

        private readonly Inventory _inventory;
        private readonly Action<string> _log;
        private readonly TierPicker _crafterTierPicker;
        private readonly TierPicker _schematicTierPicker;
        private readonly RectTransform _shipsGroup;

        // Ports src/data/types/componentCategory.ts's COMPONENT_CATEGORIES
        // -- fixed iteration order, same 4 categories, no 5th speculatively
        // added.
        private static readonly ComponentCategory[] AllCategories =
        {
            ComponentCategory.Weapon, ComponentCategory.Engine, ComponentCategory.Shield, ComponentCategory.CargoHold,
        };

        public ShipAssemblyPanel(Transform parent, Inventory inventory, Action<string> log)
        {
            _inventory = inventory;
            _log = log;

            var group = UiFactory.CreateVerticalGroup(parent, "ShipAssemblyPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Ship Assembly", 20);
            // Same order ShipAssemblyScene.ts renders its two selectors in
            // -- crafter tier first, schematic tier second. Component
            // recipes have no Schematic entity behind them (unlike general
            // recipes), so schematicTier is player-selected directly here,
            // never read off content/schematics.json.
            _crafterTierPicker = new TierPicker(group, "Crafter tier:");
            _schematicTierPicker = new TierPicker(group, "Schematic tier:");

            _shipsGroup = UiFactory.CreateVerticalGroup(group, "Ships");

            Refresh();
        }

        public void Refresh()
        {
            UiFactory.ClearChildren(_shipsGroup);
            var roster = ShipsState.OwnedShips;
            if (roster.Count == 0)
            {
                UiFactory.CreateText(_shipsGroup, "(no ships owned yet -- purchase one at the Shipyard)", 13);
                return;
            }

            foreach (var ship in roster)
            {
                RenderShip(ship);
            }
        }

        private void RenderShip(Ship ship)
        {
            UiFactory.CreateText(_shipsGroup, $"{ship.Name} -- {ship.Tier} tier", 15);

            foreach (var category in AllCategories)
            {
                var installed = ship.Components.Get(category);
                var label = installed is not null ? $"{category}: {installed.Tier} tier" : $"{category}: (empty)";
                UiFactory.CreateText(_shipsGroup, label, 13);

                foreach (var recipe in FindRecipesForCategory(category))
                {
                    var row = UiFactory.CreateHorizontalGroup(_shipsGroup, $"Recipe_{ship.Id}_{category}_{recipe.Id}");
                    UiFactory.CreateText(row, recipe.Name, 12);
                    var button = UiFactory.CreateButton(row, $"Craft & Install {recipe.Name}", () => CraftAndInstall(ship.Id, category, recipe.Id));
                    // Ports canCraft's own button-coloring in
                    // ShipAssemblyScene.renderShip() -- the button always
                    // exists (never swapped for plain text), only its
                    // interactability/color reflects whether inputs are
                    // currently sufficient, exactly matching the TS row
                    // shape.
                    button.interactable = HasEnoughInputs(recipe);
                }
            }
        }

        // Alpha content roster: every recipe linked to this category, not
        // just the first -- 4 recipes per component category. Ports
        // ShipAssemblyScene.findRecipesForCategory() exactly.
        private static List<Recipe> FindRecipesForCategory(ComponentCategory category) =>
            GameContent.ComponentRecipeLinks
                .Where(link => link.Category == category)
                .Select(link => GameContent.Loaded.Recipes.FirstOrDefault(r => r.Id == link.RecipeId))
                .Where(recipe => recipe is not null)
                .Select(recipe => recipe!)
                .ToList();

        // Same "resolve category to the first matching content resource"
        // simplification CraftPanel/GatherPanel already use -- ports
        // ShipAssemblyScene.resolveSlotResource() exactly.
        private static Resource? ResolveSlotResource(string category) =>
            GameContent.Loaded.Resources.FirstOrDefault(r => r.Category == category);

        private bool HasEnoughInputs(Recipe recipe) =>
            recipe.Inputs.All(slot =>
            {
                var resource = ResolveSlotResource(slot.Category);
                return resource is not null && _inventory.TotalQuantity(resource.Id) >= slot.Quantity;
            });

        // Public entry point -- exercised directly by EditMode tests, same
        // convention as every other panel's trigger methods (CraftPanel
        // .TryCraft(), GatherPanel.Gather(), ShipsPanel.RefuelShip(), ...).
        // Ports ShipAssemblyScene.onCraftAndInstall() exactly, taking ids
        // rather than raw Ship/Recipe references so a test (or a real
        // Button's onClick) can call it directly.
        public CraftResult? CraftAndInstall(string shipId, ComponentCategory category, string recipeId)
        {
            var ship = ShipsState.OwnedShips.FirstOrDefault(s => s.Id == shipId);
            if (ship is null)
            {
                _log($"Craft & Install failed: no owned ship '{shipId}'.");
                return null;
            }

            var recipe = FindRecipesForCategory(category).FirstOrDefault(r => r.Id == recipeId);
            if (recipe is null)
            {
                _log($"Craft & Install failed: '{recipeId}' is not a {category} component recipe.");
                return null;
            }

            var slotResources = recipe.Inputs.Select(input => (input, resource: ResolveSlotResource(input.Category))).ToList();
            if (slotResources.Any(s => s.resource is null || _inventory.TotalQuantity(s.resource.Id) < s.input.Quantity))
            {
                var need = string.Join(", ", slotResources.Select(s => $"{s.input.Quantity}x {s.resource?.Name ?? s.input.Category}"));
                _log($"Craft & Install failed: need {need}.");
                return null;
            }

            var inputs = new List<ResourceInstance>();
            foreach (var (input, resource) in slotResources)
            {
                inputs.AddRange(_inventory.Take(resource!.Id, input.Quantity));
            }

            var result = Crafter.Craft(inputs, recipe, _schematicTierPicker.SelectedTier, _crafterTierPicker.SelectedTier);

            if (result is CraftRejected rejected)
            {
                // A rejected craft never happened -- give the consumed
                // materials back rather than silently destroying them,
                // matches CraftPanel's/CraftScene.ts's own rollback.
                foreach (var instance in inputs)
                {
                    _inventory.Add(instance);
                }
                _log($"Craft & Install rejected: {rejected.Reason}");
                Refresh();
                return result;
            }

            var accepted = (CraftAccepted)result;
            // Faithful port -- the crafted output is NOT added to
            // Inventory. It goes straight from Craft() into a
            // ShipComponent and is installed immediately below;
            // ShipAssemblyScene.onCraftAndInstall() never calls
            // addBatch() for a component the way CraftScene's
            // general-recipe path does for a general craft's output. No
            // "spare component" ever exists as a holdable item.
            var tier = AggregateTierResolver.ComputeAggregateTier(accepted.Qualities) ?? TierColor.Grey;
            var component = new ShipComponent
            {
                Id = $"component-{ship.Id}-{category}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                Category = category,
                Qualities = accepted.Qualities,
                Tier = tier,
            };

            // Faithful port -- NOT an occupied-slot check. AssembleShip()
            // unconditionally overwrites whatever was in this slot; the
            // displaced component (if any) is discarded here, never
            // returned to Inventory or recoverable anywhere, exactly like
            // assembleShip.ts:23's own unconditional
            // `{ ...ship.components, [slot]: component }`.
            var updatedShip = ShipAssembler.AssembleShip(ship, component, category);
            ShipsState.ReplaceShip(updatedShip);
            _log($"Installed a {tier} {category} component. Ship tier now {updatedShip.Tier}.");
            Refresh();
            return result;
        }
    }
}
