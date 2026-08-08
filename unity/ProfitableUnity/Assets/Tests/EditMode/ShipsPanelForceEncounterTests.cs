using System.IO;
using System.Linq;
using NUnit.Framework;
using Profitable.Core.Adapters;
using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Unity.Content;
using Profitable.Unity.DebugTools;
using Profitable.Unity.UI;
using UnityEngine;

namespace Profitable.Unity.Tests.EditMode
{
    // Part 4 integration proof: DebugState.SetForcedEncounterType() +
    // ShipsPanel.ResolveArrival()'s real, UNCHANGED call site (no custom
    // RandomFn passed to the constructor -- this is the panel's own
    // default, real System.Random-backed roll with the debug seam
    // spliced in exactly the way a real player session would use it,
    // not ShipsPanelTests.cs's own QueueRandom() full-sequence override).
    // Mirrors TradeMapScene.ts's onResolveArrival() + debugState.ts's own
    // real integration.
    public class ShipsPanelForceEncounterTests
    {
        private GameObject _parent = null!;
        private ShipsPanel _panel = null!;
        private Inventory _inventory = null!;
        private string _tempSaveDir = null!;
        private double _originalArrivalCombatCheckChance;

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            MarketState.ResetForTests();
            ShipsState.ResetForTests();
            CrewState.ResetForTests();
            PlanetOwnershipState.ResetForTests();
            DebugState.ResetForTests();
            _tempSaveDir = Path.Combine(Path.GetTempPath(), $"profitable-unity-tests-{System.Guid.NewGuid():N}");
            PlanetOwnershipState.SetSaveSystem(new FileSaveSystem(_tempSaveDir));
            MarketState.SetWallet(new Wallet { PlayerId = "player-1", Credits = 1_000_000 });

            // The separate, un-forced arrival-combat-check roll
            // (ArrivalCombatCheckChance) is genuinely random on every
            // call after the 2nd -- zeroed for these tests only, so
            // "exactly one encounter/pending-combat resulted" is a real
            // assertion, not a flaky one. Restored in TearDown since
            // this is a real, static, process-lifetime Constants
            // property shared with every other test in this batch run.
            _originalArrivalCombatCheckChance = ShipsAndTravelConfig.ArrivalCombatCheckChance;
            ShipsAndTravelConfig.ArrivalCombatCheckChance = 0;

            _parent = new GameObject("TestParent", typeof(RectTransform));
            _inventory = new Inventory();
            // Deliberately the panel's own default RandomFn (no override)
            // -- ForcedEncounterRandom only intercepts calls 1-2; this
            // proves the real seam, not a fully-scripted test sequence.
            _panel = new ShipsPanel(_parent.transform, _inventory, _ => { });
        }

        [TearDown]
        public void TearDown()
        {
            ShipsAndTravelConfig.ArrivalCombatCheckChance = _originalArrivalCombatCheckChance;
            DebugState.ResetForTests();
            Object.DestroyImmediate(_parent);
            if (Directory.Exists(_tempSaveDir)) Directory.Delete(_tempSaveDir, recursive: true);
        }

        private static string FirstShipyardCandidateId() =>
            ShipsState.GetOrRefreshShipyardPool(System.DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()).AvailableShips[0].Id;

        private static void SetShortActiveVoyage(string shipId, string destinationPlanetId)
        {
            ShipsState.SetActiveVoyage(new Voyage
            {
                Id = "test-voyage",
                ShipId = shipId,
                OriginPlanetId = GalaxyState.StartingPlanet.Id,
                DestinationPlanetId = destinationPlanetId,
                DepartedAt = 0,
                ArrivesAt = 60 * 60 * 1000,
                Cargo = new(),
            });
        }

        [Test]
        public void ForcedTradeOpportunity_ProducesARealTradeOpportunityEncounter_ThroughTheGenuineResolveArrivalPath()
        {
            var candidateId = FirstShipyardCandidateId();
            _panel.PurchaseShip(candidateId);
            var ship = ShipsState.OwnedShips[0];
            SetShortActiveVoyage(ship.Id, GalaxyState.SecondaryDestinationPlanet.Id);

            DebugState.SetForcedEncounterType(EncounterType.TradeOpportunity);
            var result = _panel.ResolveArrival(ship.Id);

            Assert.IsNotNull(result);
            var resolved = (ArrivalResolved)result!;
            Assert.AreEqual(1, resolved.Encounters.Count);
            Assert.IsInstanceOf<TradeOpportunityEncounterResult>(resolved.Encounters[0]);
            Assert.IsEmpty(resolved.PendingCombats);

            // One-shot: consumed by the call above, so it must not still
            // be set (proves the flag doesn't leak into a hypothetical
            // second arrival).
            Assert.IsNull(DebugState.GetForcedEncounterType());
        }

        [Test]
        public void ForcedDiscovery_ProducesARealDiscoveryEncounter_ThroughTheGenuineResolveArrivalPath()
        {
            var candidateId = FirstShipyardCandidateId();
            _panel.PurchaseShip(candidateId);
            var ship = ShipsState.OwnedShips[0];
            SetShortActiveVoyage(ship.Id, GalaxyState.SecondaryDestinationPlanet.Id);

            DebugState.SetForcedEncounterType(EncounterType.Discovery);
            var result = _panel.ResolveArrival(ship.Id);

            var resolved = (ArrivalResolved)result!;
            Assert.AreEqual(1, resolved.Encounters.Count);
            Assert.IsInstanceOf<DiscoveryEncounterResult>(resolved.Encounters[0]);
        }

        [Test]
        public void ForcedCombat_ProducesARealPendingCombat_ThroughTheGenuineResolveArrivalPath()
        {
            var candidateId = FirstShipyardCandidateId();
            _panel.PurchaseShip(candidateId);
            var ship = ShipsState.OwnedShips[0];
            SetShortActiveVoyage(ship.Id, GalaxyState.SecondaryDestinationPlanet.Id);

            DebugState.SetForcedEncounterType(EncounterType.Combat);
            var result = _panel.ResolveArrival(ship.Id);

            var resolved = (ArrivalResolved)result!;
            // Combat is a detected-but-not-synchronously-resolved outcome
            // (EncounterResult.cs's own doc comment) -- surfaces as a
            // PendingCombat, never as an EncounterResult entry.
            Assert.IsEmpty(resolved.Encounters);
            Assert.AreEqual(1, resolved.PendingCombats.Count);
            Assert.AreEqual(1, ShipsState.PendingCombats.Count(c => c.ShipId == ship.Id));
        }

        [Test]
        public void NoForcedType_ResolvesArrivalNormallyThroughTheRealDefaultRandom()
        {
            var candidateId = FirstShipyardCandidateId();
            _panel.PurchaseShip(candidateId);
            var ship = ShipsState.OwnedShips[0];
            SetShortActiveVoyage(ship.Id, GalaxyState.SecondaryDestinationPlanet.Id);

            // No DebugState.SetForcedEncounterType() call -- proves the
            // debug seam is a true no-op (matching TradeMapScene.ts's
            // onResolveArrival() unconditionally calling
            // consumeForcedEncounterType() even in a real, non-debug
            // session) rather than throwing or otherwise misbehaving
            // when nothing is pending.
            var result = _panel.ResolveArrival(ship.Id);

            Assert.IsNotNull(result);
            Assert.IsTrue(result is ArrivalResolved);
        }
    }
}
