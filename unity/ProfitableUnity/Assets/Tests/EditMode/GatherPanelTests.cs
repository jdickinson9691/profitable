using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;

namespace Profitable.Unity.Tests.EditMode
{
    // Agent 35 -- exercises GatherPanel.Gather() directly (the same
    // method a real Button click invokes via onClick), proving the
    // gather -> Inventory wiring is correct. See agent-35-unity-mvp
    // -presentation.md's Testing Requirements for why this tests wiring,
    // not formula correctness (already proven by Agent 33's parity
    // suite against the same RollQuality() this calls).
    public class GatherPanelTests
    {
        private GameObject _parent = null!;
        private Inventory _inventory = null!;
        private GatherPanel _panel = null!;

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            _parent = new GameObject("TestParent", typeof(RectTransform));
            _inventory = new Inventory();
            _panel = new GatherPanel(_parent.transform, _inventory, _ => { });
        }

        [TearDown]
        public void TearDown() => Object.DestroyImmediate(_parent);

        [Test]
        public void GatherAddsOneBatchToInventory()
        {
            _panel.Gather(GameContent.IgneousOre);
            Assert.AreEqual(1, _inventory.TotalQuantity("igneous-ore"));
        }

        [Test]
        public void GatherProducesValuesInRangeForEveryApplicableQuality()
        {
            var instance = _panel.Gather(GameContent.IgneousOre);
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
            // content, mirroring tests/fixtures/resources.ts).
            var instance = _panel.Gather(GameContent.AutuniteCrystal);
            Assert.IsNull(instance.Qualities[Quality.Purity]);
        }

        [Test]
        public void RepeatedGatherAccumulatesQuantity()
        {
            _panel.Gather(GameContent.HydrogenGas);
            _panel.Gather(GameContent.HydrogenGas);
            Assert.AreEqual(2, _inventory.TotalQuantity("hydrogen-gas"));
        }
    }
}
