using System.Linq;
using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;

namespace Profitable.Unity.Tests.EditMode
{
    // Ports ShipAssemblyScene.ts's real behavior (see ShipAssemblyPanel.cs's
    // own doc comment) -- exercises CraftAndInstall() directly, the same
    // "public entry point exercised directly, not a simulated Button click"
    // convention CraftPanelTests.cs/GatherPanelTests.cs already establish.
    // Two things this file specifically proves, since they're faithful-port
    // behaviors and not obvious ones: a rejected slot is left genuinely
    // uncapped by any component-inventory concept (the craft output never
    // reaches Inventory even on success), and installing into an already
    // -filled slot genuinely discards the old component rather than
    // stacking, merging, or rejecting.
    public class ShipAssemblyPanelTests
    {
        private GameObject _parent = null!;
        private Inventory _inventory = null!;
        private ShipAssemblyPanel _panel = null!;
        private readonly System.Collections.Generic.List<string> _logs = new();

        private const string ShipId = "test-ship";

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            ShipsState.ResetForTests();
            _parent = new GameObject("TestParent", typeof(RectTransform));
            _inventory = new Inventory();
            _logs.Clear();
            _panel = new ShipAssemblyPanel(_parent.transform, _inventory, _logs.Add);
        }

        [TearDown]
        public void TearDown() => Object.DestroyImmediate(_parent);

        private static QualityMap FullQualities(int value)
        {
            var map = new QualityMap();
            foreach (var quality in Qualities.All) map[quality] = value;
            return map;
        }

        private static Ship AddShip(string id = ShipId)
        {
            var ship = new Ship
            {
                Id = id, Name = "Test Ship", OwnerId = "player-1", Tier = TierColor.Grey,
                CurrentPlanetId = GalaxyState.StartingPlanet.Id, FuelCapacity = 50, CurrentFuel = 50,
                Components = new ShipComponentSlots(),
            };
            ShipsState.OwnedShips.Add(ship);
            return ship;
        }

        // Real content (content/componentRecipes.json / recipes.json):
        // Pulse Cannon (weapon) -- 2x iron-ingot (no threshold), 1x
        // focusing-lens (durability >= 40).
        private void SeedPulseCannonInputs(int focusingLensDurability)
        {
            var ironIngot = GameContent.Loaded.Resources.First(r => r.Id == "iron-ingot");
            _inventory.Add(new ResourceInstance { Resource = ironIngot, Quantity = 2, Qualities = FullQualities(70) });

            var focusingLens = GameContent.Loaded.Resources.First(r => r.Id == "focusing-lens");
            var lensQualities = FullQualities(70);
            lensQualities[Quality.Durability] = focusingLensDurability;
            _inventory.Add(new ResourceInstance { Resource = focusingLens, Quantity = 1, Qualities = lensQualities });
        }

        // Rail Driver (weapon) -- 2x hardened-alloy-bar (no threshold), 1x
        // meteoric-steel-bar (durability >= 60). A second, real weapon
        // recipe distinct from Pulse Cannon -- used to prove the overwrite
        // case installs a genuinely different component, not a re-craft of
        // the same one.
        private void SeedRailDriverInputs(int meteoricSteelBarDurability)
        {
            var hardenedAlloyBar = GameContent.Loaded.Resources.First(r => r.Id == "hardened-alloy-bar");
            _inventory.Add(new ResourceInstance { Resource = hardenedAlloyBar, Quantity = 2, Qualities = FullQualities(70) });

            var meteoricSteelBar = GameContent.Loaded.Resources.First(r => r.Id == "meteoric-steel-bar");
            var barQualities = FullQualities(70);
            barQualities[Quality.Durability] = meteoricSteelBarDurability;
            _inventory.Add(new ResourceInstance { Resource = meteoricSteelBar, Quantity = 1, Qualities = barQualities });
        }

        [Test]
        public void ComponentRecipeLinks_WeaponCategoryHasExactlyFourRealRecipes()
        {
            var weaponRecipeIds = GameContent.ComponentRecipeLinks
                .Where(l => l.Category == ComponentCategory.Weapon)
                .Select(l => l.RecipeId)
                .ToList();

            Assert.AreEqual(4, weaponRecipeIds.Count);
            Assert.Contains("pulse-cannon", weaponRecipeIds);
            Assert.Contains("rail-driver", weaponRecipeIds);
        }

        [Test]
        public void CraftAndInstall_FailsWithoutAnOwnedShip()
        {
            var result = _panel.CraftAndInstall("no-such-ship", ComponentCategory.Weapon, "pulse-cannon");

            Assert.IsNull(result);
            StringAssert.Contains("no owned ship", _logs[^1]);
        }

        [Test]
        public void CraftAndInstall_FailsForARecipeNotLinkedToTheGivenCategory()
        {
            AddShip();

            // "iron-hull-plate" is a real recipe, but a general one, not a
            // weapon-component recipe -- must be rejected the same way an
            // unrelated id would be, never silently craft the wrong thing.
            var result = _panel.CraftAndInstall(ShipId, ComponentCategory.Weapon, "iron-hull-plate");

            Assert.IsNull(result);
            StringAssert.Contains("not a Weapon component recipe", _logs[^1]);
        }

        [Test]
        public void CraftAndInstall_FailsCleanlyWhenInputsAreInsufficient()
        {
            AddShip();

            var result = _panel.CraftAndInstall(ShipId, ComponentCategory.Weapon, "pulse-cannon");

            Assert.IsNull(result);
            StringAssert.Contains("need", _logs[^1]);
        }

        [Test]
        public void CraftAndInstall_RejectsWhenQualityIsBelowThresholdAndReturnsConsumedMaterials()
        {
            // craft()/Crafter.Craft() only rejects at 41+ points below a
            // slot's threshold (src/simulation/craft.ts's own "41+ is
            // rejected" rule) -- Pulse Cannon's own 40-point threshold can
            // never mathematically reach that floor (max points-below is
            // 39, at quality 1), so this test uses Rail Driver's own
            // higher 60-point threshold instead, same reasoning
            // CraftPanelTests.cs's own
            // RejectsWhenDurabilityIsCatastrophicallyBelowThreshold uses a
            // 60-point-threshold recipe for the same real reason.
            AddShip();
            SeedRailDriverInputs(meteoricSteelBarDurability: 1); // threshold is 60, 59 points below

            var result = _panel.CraftAndInstall(ShipId, ComponentCategory.Weapon, "rail-driver");

            Assert.IsInstanceOf<CraftRejected>(result);
            Assert.AreEqual(2, _inventory.TotalQuantity("hardened-alloy-bar"));
            Assert.AreEqual(1, _inventory.TotalQuantity("meteoric-steel-bar"));
            Assert.IsNull(ShipsState.OwnedShips.Single(s => s.Id == ShipId).Components.Weapon);
        }

        [Test]
        public void CraftAndInstall_SucceedsInstallsIntoAnEmptySlotAndNeverAddsTheComponentToInventory()
        {
            AddShip();
            SeedPulseCannonInputs(focusingLensDurability: 70);

            var result = _panel.CraftAndInstall(ShipId, ComponentCategory.Weapon, "pulse-cannon");

            Assert.IsInstanceOf<CraftAccepted>(result);
            var ship = ShipsState.OwnedShips.Single(s => s.Id == ShipId);
            Assert.IsNotNull(ship.Components.Weapon);
            Assert.AreEqual(ComponentCategory.Weapon, ship.Components.Weapon!.Category);

            // Real inputs actually consumed.
            Assert.AreEqual(0, _inventory.TotalQuantity("iron-ingot"));
            Assert.AreEqual(0, _inventory.TotalQuantity("focusing-lens"));

            // Faithful-port proof: the crafted component is never a
            // holdable inventory item -- no "pulse-cannon" resource batch
            // exists anywhere in Inventory, on success or otherwise.
            Assert.AreEqual(0, _inventory.TotalQuantity("pulse-cannon"));

            // Ship.Tier recomputes through the real AssembleShip() call,
            // never left stale (same guarantee every other Assemble call
            // site already has).
            Assert.AreEqual(ShipTierDeriver.DeriveShipTier(ship), ship.Tier);
        }

        [Test]
        public void CraftAndInstall_OverwritesAnAlreadyInstalledComponentWithoutAnOccupiedSlotCheck()
        {
            AddShip();
            SeedPulseCannonInputs(focusingLensDurability: 70);
            _panel.CraftAndInstall(ShipId, ComponentCategory.Weapon, "pulse-cannon");
            var originalWeaponId = ShipsState.OwnedShips.Single(s => s.Id == ShipId).Components.Weapon!.Id;

            SeedRailDriverInputs(meteoricSteelBarDurability: 70); // threshold is 60
            var result = _panel.CraftAndInstall(ShipId, ComponentCategory.Weapon, "rail-driver");

            Assert.IsInstanceOf<CraftAccepted>(result);
            var ship = ShipsState.OwnedShips.Single(s => s.Id == ShipId);
            Assert.IsNotNull(ship.Components.Weapon);

            // The genuinely faithful-port proof: a NEW component id is now
            // installed -- the original Pulse Cannon component is gone,
            // never merged, stacked, or preserved anywhere (not in
            // Inventory -- proven above no component ever reaches it
            // regardless -- and not on the Ship itself, which has exactly
            // one Weapon slot).
            Assert.AreNotEqual(originalWeaponId, ship.Components.Weapon!.Id);

            // Both crafts' real materials were consumed -- proves this was
            // a genuine second craft, not a no-op that merely relabeled
            // the first component.
            Assert.AreEqual(0, _inventory.TotalQuantity("hardened-alloy-bar"));
            Assert.AreEqual(0, _inventory.TotalQuantity("meteoric-steel-bar"));
        }
    }
}
