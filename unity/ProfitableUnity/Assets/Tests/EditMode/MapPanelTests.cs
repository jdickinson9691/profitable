using System.Linq;
using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;

namespace Profitable.Unity.Tests.EditMode
{
    // Gap closed (2026-08-04): MapPanel was read-only text with zero
    // interactivity -- exercises MapPanel.TravelTo() directly (the same
    // method a real "Travel {name}" Button click invokes via onClick),
    // proving it delegates to the real ShipsPanel.InitiateVoyageTo
    // wiring (no voyage-initiation logic duplicated in MapPanel itself)
    // and genuinely reads the real generated galaxy (all ~48 non
    // -starting-non-secondary planets), not just the two previously
    // -hardcoded ones.
    public class MapPanelTests
    {
        private GameObject _parent = null!;
        private Inventory _inventory = null!;
        private ShipsPanel _shipsPanel = null!;
        private MapPanel _panel = null!;

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
            _shipsPanel = new ShipsPanel(_parent.transform, _inventory, _ => { });
            _panel = new MapPanel(_parent.transform, _shipsPanel);
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
            // Not the starting planet or the secondary destination --
            // proves the real ~48-other-planet galaxy is genuinely
            // reachable, not just the two previously-hardcoded planets.
            var farPlanet = GalaxyState.Galaxy.Planets[10];

            var result = _panel.TravelTo(farPlanet.Id);

            Assert.IsNotNull(result);
            Assert.IsNotNull(ShipsState.ActiveVoyage);
            Assert.AreEqual(farPlanet.Id, ShipsState.ActiveVoyage!.DestinationPlanetId);
        }

        [Test]
        public void Refresh_RendersATravelButtonForEveryOtherPlanetButNotTheOrigin()
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

            // All 50 planets minus the ship's own origin (StartingPlanet).
            Assert.AreEqual(GalaxyState.Galaxy.Planets.Count - 1, travelButtons.Count);
            Assert.IsFalse(travelButtons.Any(b => b.gameObject.name == $"Button_Travel {GalaxyState.StartingPlanet.Name}"));
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
    }
}
