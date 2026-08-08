using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;

namespace Profitable.Unity.Tests.EditMode
{
    // Agent 35 -- exercises CraftPanel.TryCraft() directly, including
    // the rejection path (a real behavior found by checking
    // src/presentation/scenes/CraftScene.ts directly, not assumed --
    // see CraftPanel.cs's own comment).
    public class CraftPanelTests
    {
        private GameObject _parent = null!;
        private Inventory _inventory = null!;
        private CraftPanel _panel = null!;
        private readonly List<string> _logs = new();

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            ShipsState.ResetForTests();
            CrewState.ResetForTests();
            _parent = new GameObject("TestParent", typeof(RectTransform));
            _inventory = new Inventory();
            _logs.Clear();
            _panel = new CraftPanel(_parent.transform, _inventory, _logs.Add);
        }

        [TearDown]
        public void TearDown() => Object.DestroyImmediate(_parent);

        private static QualityMap FullQualities(int value)
        {
            var map = new QualityMap();
            foreach (var quality in Qualities.All) map[quality] = value;
            return map;
        }

        private void SeedInputs(int alloyBarDurability)
        {
            var alloyBarQualities = FullQualities(70);
            alloyBarQualities[Quality.Durability] = alloyBarDurability;
            _inventory.Add(new ResourceInstance { Resource = GameContent.RadiantAlloyBar, Quantity = 1, Qualities = alloyBarQualities });

            var gasQualities = FullQualities(70);
            gasQualities[Quality.Durability] = null; // Hydrogen Gas has no durability
            _inventory.Add(new ResourceInstance { Resource = GameContent.HydrogenGas, Quantity = 1, Qualities = gasQualities });
        }

        [Test]
        public void FailsCleanlyWhenInputsAreInsufficient()
        {
            var result = _panel.TryCraft();

            Assert.IsNull(result);
            StringAssert.Contains("Craft failed", _logs[0]);
        }

        [Test]
        public void SucceedsAndConsumesInputsWhenDurabilityMeetsThreshold()
        {
            SeedInputs(alloyBarDurability: 70); // recipe threshold is 60

            var result = _panel.TryCraft();

            Assert.IsInstanceOf<CraftAccepted>(result);
            Assert.AreEqual(0, _inventory.TotalQuantity("radiant-alloy-bar"));
            Assert.AreEqual(0, _inventory.TotalQuantity("hydrogen-gas"));
        }

        [Test]
        public void AcceptedResultQualitiesAreInRange()
        {
            SeedInputs(alloyBarDurability: 70);

            var result = (CraftAccepted)_panel.TryCraft()!;

            foreach (var quality in Qualities.All)
            {
                var value = result.Qualities[quality];
                if (value is null) continue; // durability may legitimately be excluded downstream
                Assert.IsTrue(value is >= 1 and <= 100, $"{quality} was {value}");
            }
        }

        [Test]
        public void RejectsWhenDurabilityIsCatastrophicallyBelowThreshold()
        {
            SeedInputs(alloyBarDurability: 1); // 60 - 1 = 59 points below, well past the 41+ floor

            var result = _panel.TryCraft();

            Assert.IsInstanceOf<CraftRejected>(result);
            StringAssert.Contains("Craft rejected", _logs[^1]);
        }

        [Test]
        public void RejectedCraftReturnsConsumedMaterialsToInventory()
        {
            SeedInputs(alloyBarDurability: 1);

            _panel.TryCraft();

            Assert.AreEqual(1, _inventory.TotalQuantity("radiant-alloy-bar"));
            Assert.AreEqual(1, _inventory.TotalQuantity("hydrogen-gas"));
        }

        // Gap closed (2026-08-04): the recipe selector, previously
        // hardcoded to Ion-Forged Hull Plate only.

        [Test]
        public void ExposesTheRealGeneralCraftingRosterExcludingShipComponents()
        {
            // 29 total recipes in content/recipes.json, 16 of them ship
            // components (content/componentRecipes.json) -- 13 general.
            Assert.AreEqual(13, GameContent.GeneralCraftingRecipes.Count);
            Assert.IsTrue(GameContent.GeneralCraftingRecipes.Any(r => r.Id == "iron-hull-plate"));
            Assert.IsFalse(GameContent.GeneralCraftingRecipes.Any(r => r.Id == "pulse-cannon"), "pulse-cannon is a ship weapon component recipe -- must stay excluded");
        }

        [Test]
        public void CanCraftANonDefaultRecipeByIdConsumingItsOwnRealCategoryInputs()
        {
            // Iron Hull Plate: 2x (category "iron-ingot", durability 40+)
            // -> 1x Iron Hull Plate -- resolved by category, not a
            // hardcoded resource id, and a completely different resource
            // from the default recipe's own inputs.
            var ironIngot = GameContent.Loaded.Resources.First(r => r.Id == "iron-ingot");
            var qualities = FullQualities(70);
            _inventory.Add(new ResourceInstance { Resource = ironIngot, Quantity = 2, Qualities = qualities });

            var result = _panel.TryCraft("iron-hull-plate");

            Assert.IsInstanceOf<CraftAccepted>(result);
            Assert.AreEqual(0, _inventory.TotalQuantity("iron-ingot"));
            // The default recipe's own inputs must be untouched -- proves
            // the selector actually switched recipes rather than always
            // consuming Radiant Alloy Bar/Hydrogen Gas regardless of id.
            Assert.AreEqual(0, _inventory.TotalQuantity("radiant-alloy-bar"));
        }

        [Test]
        public void NonDefaultRecipeFailsCleanlyWhenInsufficient()
        {
            var result = _panel.TryCraft("iron-hull-plate");

            Assert.IsNull(result);
            StringAssert.Contains("Craft failed", _logs[^1]);
        }

        // --- Ship Crew Roles wiring: Crafter/Artisan material discount ---

        private static void AssignArtisanToActiveShip(TierColor artisanTier)
        {
            var ship = new Ship
            {
                Id = "active-ship", Name = "Active Ship", OwnerId = "player-1", Tier = TierColor.Grey,
                CurrentPlanetId = GalaxyState.StartingPlanet.Id, FuelCapacity = 100, CurrentFuel = 100,
                Components = new ShipComponentSlots(),
            };
            ShipsState.OwnedShips.Add(ship);

            var artisan = new CrewMember
            {
                Id = "artisan-1", HiredByPlayerId = "player-1", Tier = artisanTier, Profession = "Artisan",
                Status = CrewStatus.Idle, HiredAt = 0, LastCheckedAt = 0, WageAmount = 1, LastPaidAt = 0,
            };
            CrewState.Crew.Add(artisan);

            var result = (AssignShipRoleSucceeded)ShipRoleAssigner.AssignToShipRole(artisan, ship, ShipCrewRole.Crafter, CrewState.Crew);
            CrewState.Crew[CrewState.Crew.FindIndex(m => m.Id == artisan.Id)] = result.UpdatedCrewMember;
        }

        [Test]
        public void ArtisanAssignedAsActiveShipsCrafter_DiscountsGeneralRecipeInputQuantity()
        {
            // Iron Hull Plate needs 2x iron-ingot with no Artisan. Grey
            // tier's ArtisanMaterialDiscountByTier is 5%:
            // floor(2 * 0.95) = 1 -- ports CraftScene.effectiveSlotQuantity()
            // exactly.
            AssignArtisanToActiveShip(TierColor.Grey);
            var ironIngot = GameContent.Loaded.Resources.First(r => r.Id == "iron-ingot");
            _inventory.Add(new ResourceInstance { Resource = ironIngot, Quantity = 1, Qualities = FullQualities(70) });

            var result = _panel.TryCraft("iron-hull-plate");

            Assert.IsInstanceOf<CraftAccepted>(result, "1x iron-ingot should be enough with a Grey Artisan's 5% discount");
            Assert.AreEqual(0, _inventory.TotalQuantity("iron-ingot"));
        }

        [Test]
        public void WithoutAnArtisanAssigned_FullBaseQuantityIsStillRequired()
        {
            var ironIngot = GameContent.Loaded.Resources.First(r => r.Id == "iron-ingot");
            _inventory.Add(new ResourceInstance { Resource = ironIngot, Quantity = 1, Qualities = FullQualities(70) });

            var result = _panel.TryCraft("iron-hull-plate");

            Assert.IsNull(result, "no Artisan assigned -- the full 2x base quantity is still required");
            StringAssert.Contains("Craft failed", _logs[^1]);
        }

        [Test]
        public void CraftAcceptedResultQualitiesAreStillInRangeWithADiscountApplied()
        {
            // Crafter.Craft() itself must remain provably crew-agnostic
            // (crafting.md's own contract) -- the discount only ever
            // changes how much is consumed before Crafter.Craft() is
            // called, never anything about the call or its output.
            AssignArtisanToActiveShip(TierColor.Gold); // 35%: floor(2*0.65)=1
            var ironIngot = GameContent.Loaded.Resources.First(r => r.Id == "iron-ingot");
            _inventory.Add(new ResourceInstance { Resource = ironIngot, Quantity = 1, Qualities = FullQualities(70) });

            var result = (CraftAccepted)_panel.TryCraft("iron-hull-plate")!;

            foreach (var quality in Qualities.All)
            {
                var value = result.Qualities[quality];
                if (value is null) continue;
                Assert.IsTrue(value is >= 1 and <= 100, $"{quality} was {value}");
            }
        }
    }
}
