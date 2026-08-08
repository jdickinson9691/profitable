using System.Collections;
using System.Linq;
using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace Profitable.Unity.Tests.PlayMode
{
    // Real click-through proof for ShipCrewRolesPanel (ports
    // ShipStatusScene.ts's crew-role assign/unassign flow) -- same
    // standard as FullLoopClickThroughTest.cs/
    // PresentationGapsClickThroughTest.cs/
    // ShipAssemblyPanelClickThroughTest.cs: real Button components' real
    // onClick in the real loaded scene. Specifically proves the two
    // things this panel exists for: assigning a Systems Engineer through
    // a real click makes the real, unchanged "Button_Check Repair"
    // (ShipsPanel.CheckRepair()) restore real, non-zero durability where
    // it previously always no-op'd; assigning a Pilot through a real
    // click has zero effect on the real "Button_Travel" voyage's actual
    // duration.
    public class ShipCrewRolesPanelClickThroughTest
    {
        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            MarketState.ResetForTests();
            ShipsState.ResetForTests();
            CrewState.ResetForTests();
        }

        private static Ship BuildShipWithDamagedWeapon(string id)
        {
            var qualities = new QualityMap();
            foreach (var quality in Qualities.All) qualities[quality] = 70;
            qualities[Quality.Durability] = 50;
            var components = new ShipComponentSlots
            {
                Weapon = new ShipComponent { Id = "weapon-1", Category = ComponentCategory.Weapon, Qualities = qualities, Tier = TierColor.Grey },
            };
            return new Ship
            {
                Id = id, Name = "Click-Through Ship", OwnerId = "player-1", Tier = TierColor.Grey,
                CurrentPlanetId = GalaxyState.StartingPlanet.Id, FuelCapacity = 100_000, CurrentFuel = 100_000,
                Components = components, LastRepairedAt = 0,
            };
        }

        [UnityTest]
        public IEnumerator AssigningASystemsEngineerFixesTheRealCheckRepairNoOp()
        {
            const string shipId = "repair-click-through-ship";
            ShipsState.OwnedShips.Add(BuildShipWithDamagedWeapon(shipId));
            CrewState.Crew.Add(new CrewMember
            {
                Id = "engineer-1", HiredByPlayerId = "player-1", Tier = TierColor.Gold, Profession = null,
                Status = CrewStatus.Idle, HiredAt = 0, LastCheckedAt = 0, WageAmount = 1, LastPaidAt = 0,
            });

            SceneManager.LoadScene("MvpLoop");
            yield return null;
            yield return null;

            var bootstrap = Object.FindFirstObjectByType<MvpLoopBootstrap>();
            Assert.IsNotNull(bootstrap);

            // The documented no-op itself (Check Repair restores zero
            // durability with no crew able to hold a ShipRole) is proven
            // at the EditMode level
            // (ShipCrewRolesPanelTests.BeforeAssignment_...), with a
            // fixed, controlled elapsed-time window -- deliberately not
            // re-proven here via a real pre-assignment click, since
            // Check Repair stamps LastRepairedAt to the real wall-clock
            // "now" on every call regardless of outcome, and a second
            // real click moments later would then see a near-zero real
            // elapsed window, making "no repair happened" ambiguous
            // between "correctly no-op" and "correctly capped by time"
            // rather than a clean proof either way.
            //
            // Real click: assign the real Systems Engineer to this real
            // ship's Systems Engineer slot.
            Click("Button_Ship Roles"); // nav -> Ship Crew Roles panel
            Click("Button_SystemsEngineer engineer-1");
            yield return null;

            StringAssert.Contains("Assigned", bootstrap.LogText, "expected a real assignment outcome to be logged");
            var assignedEngineer = CrewState.Crew.Single(m => m.Id == "engineer-1");
            Assert.AreEqual(ShipCrewRole.SystemsEngineer, assignedEngineer.ShipRole);
            Assert.AreEqual(shipId, assignedEngineer.AssignedShipId);

            // The real fix: the exact same, unchanged Check Repair button
            // now restores real, non-zero durability.
            Click("Button_Ships"); // nav -> Ships panel
            Click($"Button_Check Repair {shipId}");
            yield return null;

            var afterAssignment = ShipsState.OwnedShips.Single(s => s.Id == shipId);
            Assert.Greater(afterAssignment.Components.Weapon!.Qualities[Quality.Durability], 50,
                "a real assigned Systems Engineer must make the real, unchanged Check Repair button restore real durability -- the actual fix for the documented Unity repair no-op regression");

            LogAssert.NoUnexpectedReceived();
        }

        [UnityTest]
        public IEnumerator AssigningAPilotLeavesRealTravelTimeUnaffected()
        {
            const string shipId = "pilot-click-through-ship";
            var ship = BuildShipWithDamagedWeapon(shipId); // reuse -- durability irrelevant here
            ShipsState.OwnedShips.Add(ship);
            CrewState.Crew.Add(new CrewMember
            {
                Id = "pilot-1", HiredByPlayerId = "player-1", Tier = TierColor.Gold, Profession = null,
                Status = CrewStatus.Idle, HiredAt = 0, LastCheckedAt = 0, WageAmount = 1, LastPaidAt = 0,
            });

            SceneManager.LoadScene("MvpLoop");
            yield return null;
            yield return null;

            var bootstrap = Object.FindFirstObjectByType<MvpLoopBootstrap>();
            Assert.IsNotNull(bootstrap);

            // Real click: assign a real, Gold-tier (largest real speed
            // bonus) Pilot to this real ship.
            Click("Button_Ship Roles"); // nav -> Ship Crew Roles panel
            Click("Button_Pilot pilot-1");
            yield return null;

            StringAssert.Contains("Assigned", bootstrap.LogText);
            var assignedPilot = CrewState.Crew.Single(m => m.Id == "pilot-1");
            Assert.AreEqual(ShipCrewRole.Pilot, assignedPilot.ShipRole);

            // Real click: the real "Travel" button (ShipsPanel
            // .InitiateVoyageToSecondaryDestination -> InitiateVoyageTo
            // -> VoyageInitiator.InitiateVoyage(), the exact 6-positional
            // -argument call with no pilot).
            Click("Button_Ships"); // nav -> Ships panel
            Click($"Button_Travel {shipId}");
            yield return null;

            StringAssert.Contains("departed for", bootstrap.LogText, "expected a real departure to be logged");
            var voyage = ShipsState.ActiveVoyage;
            Assert.IsNotNull(voyage);
            var actualDuration = voyage!.ArrivesAt - voyage.DepartedAt;

            var currentShip = ShipsState.OwnedShips.Single(s => s.Id == shipId);
            var noPilotDuration = TravelTimeCalculator.CalculateTravelTime(GalaxyState.StartingPlanet, GalaxyState.SecondaryDestinationPlanet, currentShip);

            Assert.AreEqual(noPilotDuration, actualDuration, 0.0001,
                "the real voyage's actual duration must exactly match the no-pilot calculation -- proving the real, assigned Gold-tier Pilot's working speed bonus never reaches the real Travel button, the same disconnection the real TypeScript source has today");

            LogAssert.NoUnexpectedReceived();
        }

        // Same helper FullLoopClickThroughTest.cs/
        // PresentationGapsClickThroughTest.cs/
        // ShipAssemblyPanelClickThroughTest.cs already establish.
        private static void Click(string buttonGameObjectName)
        {
            var button = Object.FindObjectsByType<Button>(FindObjectsInactive.Include, FindObjectsSortMode.None)
                .FirstOrDefault(b => b.gameObject.name == buttonGameObjectName);
            Assert.IsNotNull(button, $"no button named '{buttonGameObjectName}' was found in the scene");
            button!.onClick.Invoke();
        }
    }
}
