using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;

namespace Profitable.Unity.Tests.EditMode
{
    // Gap closed (2026-08-04): MapPanel was read-only text with zero
    // interactivity -- exercises MapPanel.TravelTo()/Scan() directly (the
    // same methods a real Button click invokes via onClick), proving
    // TravelTo delegates to the real ShipsPanel.InitiateVoyageTo wiring
    // (no voyage-initiation logic duplicated in MapPanel itself) and
    // genuinely reads the real generated galaxy, and proving Scan
    // delegates to the real ScanPerformer, writes real discoveries back
    // via GalaxyState.MarkDiscovered, and that the planet list (travel
    // buttons AND the planet rows themselves) is correctly re-gated by
    // the real Discovered flag -- the discovery-gate follow-up this
    // closes.
    public class MapPanelTests
    {
        private GameObject _parent = null!;
        private Inventory _inventory = null!;
        private ShipsPanel _shipsPanel = null!;
        private MapPanel _panel = null!;
        private readonly List<string> _logs = new();

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            MarketState.ResetForTests();
            ShipsState.ResetForTests();
            CrewState.ResetForTests();
            MarketState.SetWallet(new Wallet { PlayerId = "player-1", Credits = 1_000_000 });

            _parent = new GameObject("TestParent", typeof(RectTransform));
            _inventory = new Inventory();
            _logs.Clear();
            _shipsPanel = new ShipsPanel(_parent.transform, _inventory, _ => { });
            _panel = new MapPanel(_parent.transform, _shipsPanel, _logs.Add);
        }

        [TearDown]
        public void TearDown() => Object.DestroyImmediate(_parent);

        private Ship PurchaseShipWithAmpleFuel()
        {
            var candidateId = ShipsState.GetOrRefreshShipyardPool(System.DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()).AvailableShips[0].Id;
            _shipsPanel.PurchaseShip(candidateId);
            var ship = ShipsState.OwnedShips[0];
            var ampleShip = new Ship
            {
                Id = ship.Id, Name = ship.Name, OwnerId = ship.OwnerId, Tier = ship.Tier, CurrentPlanetId = ship.CurrentPlanetId,
                FuelCapacity = 1_000_000, CurrentFuel = 1_000_000, Components = ship.Components,
            };
            ShipsState.ReplaceShip(ampleShip);
            return ampleShip;
        }

        // Real, empirically-measured Gold-tier reach from the real
        // GalaxyState.StartingPlanet in this fixed-seed galaxy
        // ("unity-mvp-galaxy") -- computed directly against
        // DistanceCalculator/ScannerBaseScanRadius, not guessed. Grey/
        // White/Green tiers find nothing at all from the starting planet
        // in this specific seed; Gold reliably finds exactly these 4.
        // Added directly to OwnedScanners (bypassing the shipyard pool's
        // own genuinely-random tier roll, no fixed seed -- same reasoning
        // ShipsPanelTests.cs's own PurchaseShipWithAmpleFuel helper
        // already documents for ship tier) so this test is deterministic
        // rather than gambling on a Blue+ roll.
        private static void GiveGoldTierScanner() =>
            ShipsState.OwnedScanners.Add(new Scanner { Id = "test-scanner", Tier = TierColor.Gold, OwnerId = "player-1" });

        [Test]
        public void TravelTo_ReturnsNullWhenNoShipIsOwned()
        {
            var result = _panel.TravelTo(GalaxyState.SecondaryDestinationPlanet.Id);
            Assert.IsNull(result);
        }

        [Test]
        public void TravelTo_InitiatesARealVoyageToAnArbitraryGalaxyPlanet()
        {
            PurchaseShipWithAmpleFuel();
            // Calling TravelTo() directly bypasses the UI's own
            // Discovered-gated button visibility (matching every other
            // panel test's convention of exercising the trigger method
            // itself, not simulated clicks) -- InitiateVoyage() has no
            // discovery precondition of its own (confirmed directly
            // against src/ships/initiateVoyage.ts: no `discovered` check
            // anywhere in it), so this remains a valid, real call
            // regardless of whether the target happens to be discovered.
            var farPlanet = GalaxyState.Galaxy.Planets[10];

            var result = _panel.TravelTo(farPlanet.Id);

            Assert.IsNotNull(result);
            Assert.IsNotNull(ShipsState.ActiveVoyage);
            Assert.AreEqual(farPlanet.Id, ShipsState.ActiveVoyage!.DestinationPlanetId);
        }

        [Test]
        public void Refresh_RendersATravelButtonOnlyForDiscoveredPlanetsExcludingOrigin()
        {
            PurchaseShipWithAmpleFuel();
            _panel.Refresh();

            // Scoped to _panel.Root specifically, not the shared test
            // parent transform -- ShipsPanel (constructed against the
            // same parent in this test's own SetUp) renders its own
            // "Button_Travel {ship.Id}" button too, which would otherwise
            // also match this same name prefix.
            var travelButtons = _panel.Root.GetComponentsInChildren<UnityEngine.UI.Button>(includeInactive: true)
                .Where(b => b.gameObject.name.StartsWith("Button_Travel "))
                .ToList();

            // Only GalaxyState.SecondaryDestinationPlanet is discovered
            // by default besides the origin (StartingPlanet, forced
            // Discovered=true the same way, but excluded here as the
            // ship's own current location) -- every other one of the 48
            // remaining planets is undiscovered until a real Scan finds
            // it, per this fix.
            Assert.AreEqual(1, travelButtons.Count);
            Assert.AreEqual($"Button_Travel {GalaxyState.SecondaryDestinationPlanet.Name}", travelButtons[0].gameObject.name);
        }

        [Test]
        public void Refresh_UndiscoveredPlanetsHaveNoRowAtAllNotJustNoTravelButton()
        {
            PurchaseShipWithAmpleFuel();
            _panel.Refresh();

            // Fog of war: an undiscovered planet doesn't appear in the
            // list at all (matching TradeMapScene.ts's own
            // getDiscoveredPlanets()-scoped display), not merely
            // "listed but without a Travel button."
            var undiscovered = GalaxyState.Galaxy.Planets[10];
            var texts = _panel.Root.GetComponentsInChildren<UnityEngine.UI.Text>(includeInactive: true);
            Assert.IsFalse(texts.Any(t => t.text.Contains(undiscovered.Name)));
        }

        [Test]
        public void Refresh_RendersNoTravelButtonsWhenNoShipIsOwned()
        {
            _panel.Refresh();

            // Scoped to _panel.Root specifically, not the shared test
            // parent transform -- ShipsPanel (constructed against the
            // same parent in this test's own SetUp) renders its own
            // "Button_Travel {ship.Id}" button too, which would otherwise
            // also match this same name prefix.
            var travelButtons = _panel.Root.GetComponentsInChildren<UnityEngine.UI.Button>(includeInactive: true)
                .Where(b => b.gameObject.name.StartsWith("Button_Travel "));

            Assert.IsEmpty(travelButtons);
        }

        [Test]
        public void Scan_ReturnsNullWhenNoShipIsOwned()
        {
            var result = _panel.Scan();
            Assert.IsNull(result);
        }

        [Test]
        public void Scan_FailsCleanlyWhenNoScannerIsOwned()
        {
            PurchaseShipWithAmpleFuel();

            var result = _panel.Scan();

            Assert.IsInstanceOf<ScanRejected>(result);
            StringAssert.Contains("Scan failed", _logs[^1]);
        }

        [Test]
        public void Scan_DiscoversRealNearbyPlanetsAndTheyBecomeTravelable()
        {
            PurchaseShipWithAmpleFuel();
            GiveGoldTierScanner();

            var result = _panel.Scan();

            Assert.IsInstanceOf<ScanSucceeded>(result);
            var succeeded = (ScanSucceeded)result!;
            var newlyDiscoveredIds = succeeded.NewlyDiscovered.Select(p => p.Id).ToHashSet();
            // Real, empirically-measured result for this exact fixed-seed
            // galaxy -- see GiveGoldTierScanner()'s own comment.
            var expectedIds = new[] { "planet-unity-mvp-galaxy:6", "planet-unity-mvp-galaxy:31", "planet-unity-mvp-galaxy:32", "planet-unity-mvp-galaxy:33" };
            CollectionAssert.AreEquivalent(expectedIds, newlyDiscoveredIds);

            foreach (var id in expectedIds)
            {
                Assert.IsTrue(GalaxyState.Galaxy.Planets.First(p => p.Id == id).Discovered, $"{id} should be marked Discovered");
            }

            // Refresh() already runs at the end of Scan() -- confirms the
            // real UI reflects the real discovery without a second call.
            var travelButtonNames = _panel.Root.GetComponentsInChildren<UnityEngine.UI.Button>(includeInactive: true)
                .Where(b => b.gameObject.name.StartsWith("Button_Travel "))
                .Select(b => b.gameObject.name)
                .ToList();
            foreach (var planet in succeeded.NewlyDiscovered)
            {
                Assert.Contains($"Button_Travel {planet.Name}", travelButtonNames);
            }

            // A planet genuinely outside Gold's own measured reach stays
            // excluded -- the fog-of-war filter isn't just "show
            // everything now."
            var stillUndiscovered = GalaxyState.Galaxy.Planets[2];
            Assert.IsFalse(newlyDiscoveredIds.Contains(stillUndiscovered.Id));
            Assert.AreNotEqual(true, stillUndiscovered.Discovered);
        }
    }
}
