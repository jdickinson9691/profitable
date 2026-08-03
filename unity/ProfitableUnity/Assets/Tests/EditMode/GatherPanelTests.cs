using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;

namespace Profitable.Unity.Tests.EditMode
{
    // Migration Phase 2 Sub-Phase A rewrite (agent-41-unity-galaxy-planet
    // -presentation.md) -- exercises GatherPanel.Gather() directly (the
    // same method a real Button click invokes via onClick), proving the
    // gather -> Inventory wiring is correct. Still not testing formula
    // correctness (that's Agent 40's parity suite's job); this proves
    // wiring plus the one behavior this rewrite actually changes: quality
    // is now fixed per current cycle, not rolled fresh every click.
    public class GatherPanelTests
    {
        private GameObject _parent = null!;
        private Inventory _inventory = null!;
        private GatherPanel _panel = null!;

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            GalaxyState.ResetForTests();
            _parent = new GameObject("TestParent", typeof(RectTransform));
            _inventory = new Inventory();
            _panel = new GatherPanel(_parent.transform, _inventory, _ => { });
        }

        [TearDown]
        public void TearDown() => Object.DestroyImmediate(_parent);

        [Test]
        public void GatherAddsOneBatchToInventory()
        {
            _panel.Gather("igneous-ore");
            Assert.AreEqual(1, _inventory.TotalQuantity("igneous-ore"));
        }

        [Test]
        public void GatherProducesValuesInRangeForEveryApplicableQuality()
        {
            var instance = _panel.Gather("igneous-ore");
            foreach (var quality in Qualities.All)
            {
                var value = instance.Qualities[quality];
                Assert.IsTrue(value is >= 1 and <= 100, $"{quality} was {value}");
            }
        }

        [Test]
        public void GatherLeavesInapplicableQualitiesNullNeverZero()
        {
            // Autunite Crystal has no purity (see GameContent's real
            // content, mirroring tests/fixtures/resources.ts). Still
            // guaranteed producible on the starting planet regardless of
            // this galaxy's real roll -- the tutorial guarantee.
            var instance = _panel.Gather("autunite-crystal");
            Assert.IsNull(instance.Qualities[Quality.Purity]);
        }

        [Test]
        public void RepeatedGatherAccumulatesQuantity()
        {
            _panel.Gather("hydrogen-gas");
            _panel.Gather("hydrogen-gas");
            Assert.AreEqual(2, _inventory.TotalQuantity("hydrogen-gas"));
        }

        [Test]
        public void RepeatedGatherProducesIdenticalQuality()
        {
            // The actual behavior this rewrite introduces: quality is
            // fixed per current cycle, read once at panel-construction
            // time, never re-rolled per click.
            var first = _panel.Gather("hydrogen-gas");
            var second = _panel.Gather("hydrogen-gas");
            foreach (var quality in Qualities.All)
            {
                Assert.AreEqual(first.Qualities[quality], second.Qualities[quality]);
            }
        }
    }
}
