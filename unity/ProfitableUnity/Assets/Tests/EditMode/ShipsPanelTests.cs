using System.IO;
using System.Linq;
using NUnit.Framework;
using Profitable.Core.Adapters;
using Profitable.Core.Schema;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;

namespace Profitable.Unity.Tests.EditMode
{
    // Migration Phase 2 Sub-Phase D (Ships & Travel) Presentation --
    // agent-56-unity-ships-travel-presentation.md. Exercises ShipsPanel's
    // public trigger methods directly, proving the purchase/refuel/
    // check-repair/travel/resolve-arrival -> ShipsState/MarketState wiring
    // is correct. Not testing formula correctness (that's Agent 55's
    // parity suite's job).
    //
    // Migration Phase 2 Sub-Phase E addition (agent-62-unity-planet
    // -ownership-integration.md): PlanetOwnershipState is injected with a
    // temp-directory-backed FileSaveSystem in SetUp, same reasoning
    // GatherPanelTests already documents -- RefuelShip/CheckRepair now
    // read it (the Citadel refuel-discount/repair-rate integration fix).
    public class ShipsPanelTests
    {
        private GameObject _parent = null!;
        private ShipsPanel _panel = null!;
        private Inventory _inventory = null!;
        private string _tempSaveDir = null!;

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            MarketState.ResetForTests();
            ShipsState.ResetForTests();
            CrewState.ResetForTests();
            PlanetOwnershipState.ResetForTests();
            _tempSaveDir = Path.Combine(Path.GetTempPath(), $"profitable-unity-tests-{System.Guid.NewGuid():N}");
            PlanetOwnershipState.SetSaveSystem(new FileSaveSystem(_tempSaveDir));
            // A large starting balance -- the shipyard pool's rolled tier
            // (and therefore purchase cost) is genuinely random per test
            // run with no fixed seed, same reasoning CrewPanelTests
            // already documents for its own hire-cost randomness.
            MarketState.SetWallet(new Wallet { PlayerId = "player-1", Credits = 1_000_000 });

            _parent = new GameObject("TestParent", typeof(RectTransform));
            _inventory = new Inventory();
            _panel = new ShipsPanel(_parent.transform, _inventory, _ => { });
        }

        [TearDown]
        public void TearDown()
        {
            UnityEngine.Object.DestroyImmediate(_parent);
            if (Directory.Exists(_tempSaveDir)) Directory.Delete(_tempSaveDir, recursive: true);
        }

        private static string FirstShipyardCandidateId() =>
            ShipsState.GetOrRefreshShipyardPool(System.DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()).AvailableShips[0].Id;

        // Purchases the first shipyard candidate, then overrides its fuel
        // capacity to a large, fixed value -- the pool's rolled tier (and
        // therefore real fuel capacity, e.g. Grey's 50) is genuinely
        // random per test run, and the real distance to
        // GalaxyState.SecondaryDestinationPlanet could legitimately
        // exceed a low-tier ship's range (fuel is a genuine routing
        // constraint, per ship.md's own design). Tests that only care
        // about the voyage/fuel-deduction wiring, not the fuel-capacity
        // formula itself (that's Agent 55's parity suite's job), need a
        // ship guaranteed to have enough range regardless of the roll.
        private static Ship PurchaseShipWithAmpleFuel(ShipsPanel panel)
        {
            var candidateId = FirstShipyardCandidateId();
            panel.PurchaseShip(candidateId);
            var ship = ShipsState.OwnedShips[0];
            var ampleShip = new Ship
            {
                Id = ship.Id, Name = ship.Name, OwnerId = ship.OwnerId, Tier = ship.Tier, CurrentPlanetId = ship.CurrentPlanetId,
                FuelCapacity = 100000, CurrentFuel = 100000, Components = ship.Components,
            };
            ShipsState.ReplaceShip(ampleShip);
            return ampleShip;
        }

        [Test]
        public void PurchaseShip_AddsToOwnedShipsAndDeductsWallet()
        {
            var candidateId = FirstShipyardCandidateId();
            var creditsBefore = MarketState.Wallet.Credits;

            var result = _panel.PurchaseShip(candidateId);

            Assert.IsTrue(result.Purchased);
            Assert.AreEqual(1, ShipsState.OwnedShips.Count);
            Assert.Less(MarketState.Wallet.Credits, creditsBefore);
        }

        [Test]
        public void PurchaseShip_FailsForUnknownCandidateId()
        {
            var result = _panel.PurchaseShip("no-such-candidate");

            Assert.IsFalse(result.Purchased);
            Assert.IsEmpty(ShipsState.OwnedShips);
        }

        [Test]
        public void RefuelShip_IncreasesFuelAndDeductsWallet()
        {
            var candidateId = FirstShipyardCandidateId();
            _panel.PurchaseShip(candidateId);
            var ship = ShipsState.OwnedShips[0];
            // Purchased ships start with a full tank -- drain some fuel
            // directly so there's real room to refuel into.
            ShipsState.ReplaceShip(new Ship
            {
                Id = ship.Id, Name = ship.Name, OwnerId = ship.OwnerId, Tier = ship.Tier, CurrentPlanetId = ship.CurrentPlanetId,
                FuelCapacity = ship.FuelCapacity, CurrentFuel = ship.FuelCapacity - 20, Components = ship.Components,
            });
            var creditsBefore = MarketState.Wallet.Credits;

            var result = _panel.RefuelShip(ship.Id, 10);

            Assert.IsTrue(result.Refueled);
            Assert.Less(MarketState.Wallet.Credits, creditsBefore);
        }

        [Test]
        public void CheckRepair_SetsLastRepairedAt()
        {
            var candidateId = FirstShipyardCandidateId();
            _panel.PurchaseShip(candidateId);
            var ship = ShipsState.OwnedShips[0];
            Assert.IsNull(ship.LastRepairedAt);

            var repaired = _panel.CheckRepair(ship.Id);

            Assert.IsNotNull(repaired);
            Assert.IsNotNull(repaired!.LastRepairedAt);
        }

        [Test]
        public void InitiateVoyage_DeductsFuelAndSetsActiveVoyage()
        {
            var ship = PurchaseShipWithAmpleFuel(_panel);
            var fuelBefore = ship.CurrentFuel;

            var result = _panel.InitiateVoyageToSecondaryDestination(ship.Id);

            Assert.IsNotNull(result);
            Assert.IsNotNull(ShipsState.ActiveVoyage);
            Assert.AreEqual(GalaxyState.SecondaryDestinationPlanet.Id, ShipsState.ActiveVoyage!.DestinationPlanetId);
            Assert.Less(ShipsState.OwnedShips.Single(s => s.Id == ship.Id).CurrentFuel, fuelBefore);
        }

        [Test]
        public void ResolveArrival_NotYetDueImmediatelyAfterDeparture()
        {
            var ship = PurchaseShipWithAmpleFuel(_panel);
            _panel.InitiateVoyageToSecondaryDestination(ship.Id);

            var result = _panel.ResolveArrival(ship.Id);

            Assert.IsNotNull(result);
            Assert.IsFalse(result!.Resolved);
            Assert.IsNotNull(ShipsState.ActiveVoyage); // still in transit, not cleared
        }

        [Test]
        public void ResolveArrival_FailsWhenNoActiveVoyageForShip()
        {
            var candidateId = FirstShipyardCandidateId();
            _panel.PurchaseShip(candidateId);
            var ship = ShipsState.OwnedShips[0];

            var result = _panel.ResolveArrival(ship.Id);

            Assert.IsNull(result);
        }

        [Test]
        public void RefuelShip_AppliesCitadelDiscountWhenStartingPlanetIsOwnedAndHasALevel2Citadel()
        {
            var candidateId = FirstShipyardCandidateId();
            _panel.PurchaseShip(candidateId);
            var ship = ShipsState.OwnedShips[0]; // docked at GalaxyState.StartingPlanet by default
            ShipsState.ReplaceShip(new Ship
            {
                Id = ship.Id, Name = ship.Name, OwnerId = ship.OwnerId, Tier = ship.Tier, CurrentPlanetId = ship.CurrentPlanetId,
                FuelCapacity = 1000, CurrentFuel = 0, Components = ship.Components,
            });
            // Fast-forwards ownership directly (BuildCitadel's own
            // material/sequencing logic is already covered by
            // GatherPanelTests/PlanetOwnershipParityTests) -- this test's
            // own job is proving ShipsPanel actually reads the resulting
            // Citadel level, not re-proving BuildCitadel itself.
            PlanetOwnershipState.SetEntry(GalaxyState.StartingPlanet.Id, new PlanetOwnershipEntry { ColonistCount = 10, CitadelLevel = 2, OwnedByPlayerId = "player-1" });
            var creditsBeforeFirst = MarketState.Wallet.Credits;
            _panel.RefuelShip(ship.Id, 10);
            var costWithDiscount = creditsBeforeFirst - MarketState.Wallet.Credits;

            PlanetOwnershipState.SetEntry(GalaxyState.StartingPlanet.Id, PlanetOwnershipEntry.Default());
            var creditsBeforeSecond = MarketState.Wallet.Credits;
            _panel.RefuelShip(ship.Id, 10);
            var costWithoutDiscount = creditsBeforeSecond - MarketState.Wallet.Credits;

            Assert.Less(costWithDiscount, costWithoutDiscount);
        }

        // A short, directly-constructed Voyage (1 hour) rather than a
        // real InitiateVoyageToSecondaryDestination trip -- keeps
        // ResolveEncounters' own windowCount at exactly 1
        // (ceil(1/EncounterCheckWindowHours=24) == 1), so the fixed
        // random sequence below maps onto a single, known roll path
        // instead of however many hours the real inter-planet distance
        // happens to produce.
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

        // Mirrors IntegrationTests.cs's own TestFixtureRandom helper --
        // a fixed queue of random() results, so encounter/combat rolls
        // (otherwise genuinely random) are actually assertable here.
        private static RandomFn QueueRandom(params double[] values)
        {
            var index = 0;
            return () =>
            {
                if (index >= values.Length)
                {
                    throw new System.InvalidOperationException($"QueueRandom exhausted after {values.Length} calls");
                }
                return values[index++];
            };
        }

        [Test]
        public void ResolveArrival_AppliesTradeOpportunityEncounterToWallet()
        {
            // trigger(0.1<0.2) -> pick TradeOpportunity(0.1<0.4 cumulative)
            // -> credits roll(0.5 -> round(50+0.5*150)=125) -> arrival
            // combat check(0.5 >= 0.1 -> no extra combat).
            var panel = new ShipsPanel(_parent.transform, _inventory, _ => { }, QueueRandom(0.1, 0.1, 0.5, 0.5));
            var candidateId = FirstShipyardCandidateId();
            panel.PurchaseShip(candidateId);
            var ship = ShipsState.OwnedShips[0];
            SetShortActiveVoyage(ship.Id, GalaxyState.SecondaryDestinationPlanet.Id);
            var creditsBefore = MarketState.Wallet.Credits;

            var result = panel.ResolveArrival(ship.Id);

            Assert.IsNotNull(result);
            Assert.IsTrue(result!.Resolved);
            var resolved = (ArrivalResolved)result;
            Assert.AreEqual(1, resolved.Encounters.Count);
            Assert.IsInstanceOf<TradeOpportunityEncounterResult>(resolved.Encounters[0]);
            Assert.AreEqual(creditsBefore + 125, MarketState.Wallet.Credits, 0.001);
            Assert.IsEmpty(ShipsState.PendingCombats);
        }

        [Test]
        public void ResolveArrival_DetectsPendingCombatAndFleeInitiatesARetreatVoyage()
        {
            // trigger(0.5>=0.2 -> skip window, no encounter) -> arrival
            // combat check(0.05<0.1 -> combat detected) -> threat roll(0.5).
            var panel = new ShipsPanel(_parent.transform, _inventory, _ => { }, QueueRandom(0.5, 0.05, 0.5));
            var candidateId = FirstShipyardCandidateId();
            panel.PurchaseShip(candidateId);
            var ship = ShipsState.OwnedShips[0];
            SetShortActiveVoyage(ship.Id, GalaxyState.SecondaryDestinationPlanet.Id);

            var result = panel.ResolveArrival(ship.Id);

            Assert.IsNotNull(result);
            var resolved = (ArrivalResolved)result!;
            Assert.IsEmpty(resolved.Encounters);
            Assert.AreEqual(1, ShipsState.PendingCombats.Count);
            var pendingId = ShipsState.PendingCombats[0].Encounter.Id;
            Assert.AreEqual(ship.Id, ShipsState.PendingCombats[0].ShipId);

            var combatResult = panel.ResolveCombat(pendingId, "flee");

            Assert.IsNotNull(combatResult);
            Assert.AreEqual(CombatOutcome.Flee, combatResult!.CombatEncounter.Outcome);
            Assert.IsEmpty(ShipsState.PendingCombats);
            Assert.IsNotNull(ShipsState.ActiveVoyage);
            Assert.AreEqual(GalaxyState.StartingPlanet.Id, ShipsState.ActiveVoyage!.DestinationPlanetId);
        }

        [Test]
        public void ResolveCombat_FailsForUnknownPendingCombatId()
        {
            var result = _panel.ResolveCombat("no-such-combat", "flee");

            Assert.IsNull(result);
        }
    }
}
