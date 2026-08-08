using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace Profitable.Unity.Tests.PlayMode
{
    // Real click-through proof for ShipAssemblyPanel (ports
    // ShipAssemblyScene.ts) -- same standard as FullLoopClickThroughTest.cs
    // /PresentationGapsClickThroughTest.cs: real Button components' real
    // onClick in the real loaded scene, not the underlying C# methods
    // called directly. Specifically proves the two faithful-port behaviors
    // ShipAssemblyPanel.cs's own doc comment calls out: installing into an
    // empty slot works end-to-end through the real UI, and installing into
    // an already-filled slot genuinely overwrites it (not merges, stacks,
    // or gets rejected by an occupied-slot check that doesn't exist on the
    // TypeScript side either).
    public class ShipAssemblyPanelClickThroughTest
    {
        // Same PlayMode-batch-isolation reasoning
        // PresentationGapsClickThroughTest.cs's own SetUp comment
        // documents -- static state classes survive across every
        // [UnityTest] in a batch run, a SceneManager.LoadScene() alone
        // does not reset them.
        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            MarketState.ResetForTests();
            ShipsState.ResetForTests();
        }

        [UnityTest]
        public IEnumerator CraftAndInstallHandlesAnEmptySlotThenGenuinelyOverwritesIt()
        {
            // A real owned ship with an empty Weapon slot, seeded before
            // scene load -- this test's job is proving the real
            // "Craft & Install" click reaches Crafter.Craft()/
            // ShipAssembler.AssembleShip() correctly and overwrites
            // correctly, not re-proving ship purchase (ShipsPanelTests.cs's
            // own surface, same division of concerns
            // PresentationGapsClickThroughTest.cs's own comments already
            // draw for wallet/ship-purchase preconditions).
            const string shipId = "click-through-ship";
            ShipsState.OwnedShips.Add(new Ship
            {
                Id = shipId, Name = "Click-Through Ship", OwnerId = "player-1", Tier = TierColor.Grey,
                CurrentPlanetId = GalaxyState.StartingPlanet.Id, FuelCapacity = 50, CurrentFuel = 50,
                Components = new ShipComponentSlots(),
            });

            SceneManager.LoadScene("MvpLoop");
            yield return null;
            yield return null;

            var bootstrap = Object.FindFirstObjectByType<MvpLoopBootstrap>();
            Assert.IsNotNull(bootstrap);

            // Real component-recipe inputs (2x iron-ingot, 1x
            // focusing-lens -- content/componentRecipes.json's real Pulse
            // Cannon recipe) seeded directly into the real, already
            // -constructed Inventory -- see MvpLoopBootstrap.Inventory's
            // own comment for why this is the right seam here rather than
            // a full real gather+refine chain for exotic refined materials
            // no tutorial guarantee ever produces.
            SeedResource(bootstrap, "iron-ingot", 2, 70);
            SeedResource(bootstrap, "focusing-lens", 1, 70);

            Click("Button_Assembly"); // nav -> Ship Assembly panel
            Click("Button_Craft & Install Pulse Cannon");
            yield return null;

            StringAssert.Contains("Installed a", bootstrap.LogText, "expected a real install outcome to be logged");
            var ship = ShipsState.OwnedShips.Single(s => s.Id == shipId);
            Assert.IsNotNull(ship.Components.Weapon, "expected the empty Weapon slot to now hold a real component");
            var originalWeaponId = ship.Components.Weapon!.Id;

            // Overwrite case: a second, different real weapon recipe
            // (content/componentRecipes.json's Rail Driver) clicked into
            // the already-filled Weapon slot.
            SeedResource(bootstrap, "hardened-alloy-bar", 2, 70);
            SeedResource(bootstrap, "meteoric-steel-bar", 1, 70);

            Click("Button_Craft & Install Rail Driver");
            yield return null;

            var shipAfterOverwrite = ShipsState.OwnedShips.Single(s => s.Id == shipId);
            Assert.IsNotNull(shipAfterOverwrite.Components.Weapon);
            // The real faithful-port proof: a NEW component id is now
            // installed -- the original Pulse Cannon component is
            // genuinely gone, not silently retained anywhere (no occupied
            // -slot rejection, no stacking, no second slot appearing).
            Assert.AreNotEqual(
                originalWeaponId, shipAfterOverwrite.Components.Weapon!.Id,
                "expected the overwrite to genuinely replace the old component -- proving the unconditional-overwrite behavior was faithfully ported, not accidentally improved into a safer occupied-slot check");

            LogAssert.NoUnexpectedReceived();
        }

        private static void SeedResource(MvpLoopBootstrap bootstrap, string resourceId, int quantity, int qualityValue)
        {
            var resource = GameContent.Loaded.Resources.First(r => r.Id == resourceId);
            var qualities = new QualityMap();
            foreach (var quality in Qualities.All) qualities[quality] = qualityValue;
            bootstrap.Inventory.Add(new ResourceInstance { Resource = resource, Quantity = quantity, Qualities = qualities });
        }

        // Same helper FullLoopClickThroughTest.cs/
        // PresentationGapsClickThroughTest.cs already establish.
        private static void Click(string buttonGameObjectName)
        {
            var button = Object.FindObjectsByType<Button>(FindObjectsInactive.Include, FindObjectsSortMode.None)
                .FirstOrDefault(b => b.gameObject.name == buttonGameObjectName);
            Assert.IsNotNull(button, $"no button named '{buttonGameObjectName}' was found in the scene");
            button!.onClick.Invoke();
        }
    }
}
