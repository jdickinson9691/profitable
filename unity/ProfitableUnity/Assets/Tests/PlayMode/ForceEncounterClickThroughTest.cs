using System.Collections;
using System.Linq;
using NUnit.Framework;
using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Unity.Content;
using Profitable.Unity.DebugTools;
using Profitable.Unity.UI;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace Profitable.Unity.Tests.PlayMode
{
    // Real click-through proof for Force Encounter -- same standard
    // FullLoopClickThroughTest.cs/ShipAssemblyPanelClickThroughTest.cs/
    // ShipCrewRolesPanelClickThroughTest.cs already establish. Not
    // redundant with ShipsPanelForceEncounterTests.cs's own EditMode
    // coverage (which calls ShipsPanel.ResolveArrival() directly): this
    // proves the real Debug nav button, the real "Combat" Force
    // Encounter button, and the real Ships panel's "Resolve Arrival"
    // button are actually wired to DebugState/ShipsPanel correctly in
    // the real loaded scene -- the missing "does the UI itself work"
    // half, not the "does the underlying mechanism work" half.
    public class ForceEncounterClickThroughTest
    {
        private double _originalArrivalCombatCheckChance;

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            MarketState.ResetForTests();
            ShipsState.ResetForTests();
            CrewState.ResetForTests();
            DebugState.ResetForTests();

            // The separate, un-forced arrival-combat-check roll is
            // genuinely random on every call after ForcedEncounterRandom's
            // own 2 intercepted calls -- zeroed so "exactly the forced
            // Combat pending-combat resulted" is a real assertion, not a
            // flaky one. Restored in TearDown (real, static,
            // process-lifetime Constants property).
            _originalArrivalCombatCheckChance = ShipsAndTravelConfig.ArrivalCombatCheckChance;
            ShipsAndTravelConfig.ArrivalCombatCheckChance = 0;
        }

        [TearDown]
        public void TearDown()
        {
            ShipsAndTravelConfig.ArrivalCombatCheckChance = _originalArrivalCombatCheckChance;
            DebugState.ResetForTests();
        }

        private static Ship BuildShip(string id)
        {
            var qualities = new QualityMap();
            foreach (var quality in Qualities.All) qualities[quality] = 70;
            var components = new ShipComponentSlots
            {
                Weapon = new ShipComponent { Id = "weapon-1", Category = ComponentCategory.Weapon, Qualities = qualities, Tier = TierColor.Grey },
                Engine = new ShipComponent { Id = "engine-1", Category = ComponentCategory.Engine, Qualities = qualities, Tier = TierColor.Grey },
                Shield = new ShipComponent { Id = "shield-1", Category = ComponentCategory.Shield, Qualities = qualities, Tier = TierColor.Grey },
                CargoHold = new ShipComponent { Id = "cargo-1", Category = ComponentCategory.CargoHold, Qualities = qualities, Tier = TierColor.Grey },
            };
            return new Ship
            {
                Id = id, Name = "Force Encounter Test Ship", OwnerId = "player-1", Tier = TierColor.Grey,
                CurrentPlanetId = GalaxyState.StartingPlanet.Id, FuelCapacity = 100_000, CurrentFuel = 100_000,
                Components = components, LastRepairedAt = 0,
            };
        }

        [UnityTest]
        public IEnumerator ClickingForceCombatThenResolveArrivalProducesARealResolvablePendingCombat()
        {
            const string shipId = "force-combat-click-through-ship";
            ShipsState.OwnedShips.Add(BuildShip(shipId));
            ShipsState.SetActiveVoyage(new Voyage
            {
                Id = "test-voyage",
                ShipId = shipId,
                OriginPlanetId = GalaxyState.StartingPlanet.Id,
                DestinationPlanetId = GalaxyState.SecondaryDestinationPlanet.Id,
                DepartedAt = 0,
                ArrivesAt = 60 * 60 * 1000,
                Cargo = new(),
            });

            SceneManager.LoadScene("MvpLoop");
            yield return null;
            yield return null;

            var bootstrap = Object.FindFirstObjectByType<MvpLoopBootstrap>();
            Assert.IsNotNull(bootstrap);

            // Real click: Debug nav -> Debug panel -> "Combat" Force
            // Encounter button (DebugPanel.OnForceEncounter ->
            // DebugState.SetForcedEncounterType(EncounterType.Combat)).
            Click("Button_Debug");
            Click("Button_Combat");
            yield return null;

            StringAssert.Contains("force a \"Combat\" encounter", bootstrap.LogText, "expected the Force Encounter click to log its own confirmation");
            Assert.AreEqual(EncounterType.Combat, DebugState.GetForcedEncounterType(), "the real one-shot flag must actually be set by the real button click");

            // Real click: the real "Resolve Arrival" button
            // (ShipsPanel.ResolveArrival -> ArrivalResolver.ResolveArrival,
            // with the debug seam spliced into the panel's existing
            // _random field, same call site every non-debug arrival uses).
            Click("Button_Ships");
            Click($"Button_Resolve Arrival {shipId}");
            yield return null;

            StringAssert.Contains("encountered a hostile ship", bootstrap.LogText,
                "expected a real pending combat to be detected and logged through the genuine ResolveArrival()->ResolveEncounters() path");

            var pending = ShipsState.PendingCombats.SingleOrDefault(c => c.ShipId == shipId);
            Assert.IsNotNull(pending, "expected a real, resolvable PendingCombat entry for this ship");
            // A real CombatInitiator.InitiateCombat() result, not a
            // placeholder -- its Id is built from the real voyage id
            // (ResolveEncounters.cs's own `$"{voyage.Id}-combat-w{windowIndex}"` pattern).
            StringAssert.StartsWith("test-voyage-combat-w", pending!.Encounter.Id);
            Assert.AreEqual(CombatStatus.Pending, pending.Encounter.Status, "expected a real, still-resolvable (not pre-resolved) pending combat");

            // One-shot: the real click above must have consumed it, so a
            // hypothetical second arrival wouldn't also be forced.
            Assert.IsNull(DebugState.GetForcedEncounterType());

            LogAssert.NoUnexpectedReceived();
        }

        // Same helper FullLoopClickThroughTest.cs/
        // ShipAssemblyPanelClickThroughTest.cs/
        // ShipCrewRolesPanelClickThroughTest.cs already establish.
        private static void Click(string buttonGameObjectName)
        {
            var button = Object.FindObjectsByType<Button>(FindObjectsInactive.Include, FindObjectsSortMode.None)
                .FirstOrDefault(b => b.gameObject.name == buttonGameObjectName);
            Assert.IsNotNull(button, $"no button named '{buttonGameObjectName}' was found in the scene");
            button!.onClick.Invoke();
        }
    }
}
