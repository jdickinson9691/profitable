using System.Linq;
using NUnit.Framework;
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
    public class ShipsPanelTests
    {
        private GameObject _parent = null!;
        private ShipsPanel _panel = null!;

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            MarketState.ResetForTests();
            ShipsState.ResetForTests();
            // A large starting balance -- the shipyard pool's rolled tier
            // (and therefore purchase cost) is genuinely random per test
            // run with no fixed seed, same reasoning CrewPanelTests
            // already documents for its own hire-cost randomness.
            MarketState.SetWallet(new Wallet { PlayerId = "player-1", Credits = 1_000_000 });

            _parent = new GameObject("TestParent", typeof(RectTransform));
            _panel = new ShipsPanel(_parent.transform, _ => { });
        }

        [TearDown]
        public void TearDown() => Object.DestroyImmediate(_parent);

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
    }
}
