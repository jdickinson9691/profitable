using System.Linq;
using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;

namespace Profitable.Unity.Tests.EditMode
{
    // Migration Phase 2 Sub-Phase B (Trading) Presentation --
    // agent-46-unity-trading-presentation.md. Exercises MarketPanel
    // .SellToPlanet()/SellToGlobal() directly (the same methods a real
    // Button click invokes via onClick), proving the sell -> Inventory
    // /Wallet/PlanetMarketState wiring is correct. Not testing formula
    // correctness (that's Agent 45's parity suite's job).
    public class MarketPanelTests
    {
        private GameObject _parent = null!;
        private Inventory _inventory = null!;
        private MarketPanel _panel = null!;

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            MarketState.ResetForTests();
            _parent = new GameObject("TestParent", typeof(RectTransform));
            _inventory = new Inventory();
            _panel = new MarketPanel(_parent.transform, _inventory, _ => { });
        }

        [TearDown]
        public void TearDown() => Object.DestroyImmediate(_parent);

        private static Resource FindResource(string id) => GameContent.Loaded.Resources.First(r => r.Id == id);

        private static void AddOneToInventory(Inventory inventory, string resourceId)
        {
            var resource = FindResource(resourceId);
            var qualities = QualityRoller.RollQuality(resource);
            inventory.Add(new ResourceInstance { Resource = resource, Quantity = 1, Qualities = qualities });
        }

        [Test]
        public void SellToPlanet_FailsWhenNothingToSell()
        {
            var result = _panel.SellToPlanet("igneous-ore");
            Assert.IsNull(result);
        }

        [Test]
        public void SellToPlanet_SellsOneUnitAndCreditsTheWallet()
        {
            AddOneToInventory(_inventory, "igneous-ore");
            var creditsBefore = MarketState.Wallet.Credits;

            var result = _panel.SellToPlanet("igneous-ore");

            Assert.IsNotNull(result);
            Assert.AreEqual(0, _inventory.TotalQuantity("igneous-ore"));
            Assert.AreEqual(creditsBefore + result!.ProceedsToSeller, MarketState.Wallet.Credits, 1e-9);
        }

        [Test]
        public void SellToPlanet_DriftsThePlanetPriceDown()
        {
            AddOneToInventory(_inventory, "igneous-ore");
            var basePriceBefore = MarketState.GetOrCreateMarketState("igneous-ore").CurrentPrice;

            _panel.SellToPlanet("igneous-ore");

            var priceAfter = MarketState.GetOrCreateMarketState("igneous-ore").CurrentPrice;
            Assert.Less(priceAfter, basePriceBefore);
        }

        [Test]
        public void SellToGlobal_FailsWhenNothingToSell()
        {
            var result = _panel.SellToGlobal("hydrogen-gas");
            Assert.IsNull(result);
        }

        [Test]
        public void SellToGlobal_SellsOneUnitAndCreditsTheWallet()
        {
            AddOneToInventory(_inventory, "hydrogen-gas");
            var creditsBefore = MarketState.Wallet.Credits;

            var result = _panel.SellToGlobal("hydrogen-gas");

            Assert.IsNotNull(result);
            Assert.AreEqual(0, _inventory.TotalQuantity("hydrogen-gas"));
            Assert.AreEqual(creditsBefore + result!.ProceedsToSeller, MarketState.Wallet.Credits, 1e-9);
        }
    }
}
