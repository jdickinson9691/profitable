using System.Collections.Generic;
using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;

namespace Profitable.Unity.Tests.EditMode
{
    // Agent 35 -- exercises RefinePanel.TryRefine() directly, proving the
    // real recipe's exact quantities are consumed and the result is
    // added back to Inventory correctly. Structural assertions only
    // (ranges, quantities, tier validity) rather than exact-value
    // matching -- TryRefine() doesn't expose random-sequence injection
    // (a UI trigger method has no reason to), so byte-exact parity
    // against a recorded TypeScript run is Agent 33's job, not this
    // one's; this agent's job is proving the wiring, per its own
    // contract's Testing Requirements.
    public class RefinePanelTests
    {
        private GameObject _parent = null!;
        private Inventory _inventory = null!;
        private RefinePanel _panel = null!;
        private readonly List<string> _logs = new();

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            _parent = new GameObject("TestParent", typeof(RectTransform));
            _inventory = new Inventory();
            _logs.Clear();
            _panel = new RefinePanel(_parent.transform, _inventory, _logs.Add);
        }

        [TearDown]
        public void TearDown() => Object.DestroyImmediate(_parent);

        private static Dictionary<Quality, int?> FullQualities(int value) => new()
        {
            [Quality.Purity] = value,
            [Quality.Density] = value,
            [Quality.Potency] = value,
            [Quality.Durability] = value,
            [Quality.Rarity] = value,
        };

        private void SeedRecipeInputs()
        {
            _inventory.Add(new ResourceInstance { Resource = GameContent.IgneousOre, Quantity = 2, Qualities = ToQualityMap(FullQualities(50)) });
            _inventory.Add(new ResourceInstance { Resource = GameContent.AutuniteCrystal, Quantity = 1, Qualities = ToQualityMap(FullQualities(50)) });
        }

        private static QualityMap ToQualityMap(Dictionary<Quality, int?> values)
        {
            var map = new QualityMap();
            foreach (var (k, v) in values) map[k] = v;
            return map;
        }

        [Test]
        public void FailsCleanlyWhenInputsAreInsufficient()
        {
            var result = _panel.TryRefine();

            Assert.IsNull(result);
            Assert.AreEqual(1, _logs.Count);
            StringAssert.Contains("Refine failed", _logs[0]);
        }

        [Test]
        public void ConsumesExactlyTheRecipesQuantitiesOnSuccess()
        {
            SeedRecipeInputs();

            var result = _panel.TryRefine();

            Assert.IsNotNull(result);
            Assert.AreEqual(0, _inventory.TotalQuantity("igneous-ore"));
            Assert.AreEqual(0, _inventory.TotalQuantity("autunite-crystal"));
        }

        [Test]
        public void AddsTheOutputPlusAnyRefundToInventory()
        {
            SeedRecipeInputs();
            var result = _panel.TryRefine()!;

            var expectedQuantity = GameContent.RadiantAlloyBarRecipe.OutputQuantity + result.RefundUnits;
            Assert.AreEqual(expectedQuantity, _inventory.TotalQuantity("radiant-alloy-bar"));
        }

        [Test]
        public void ResultQualitiesAreInRange()
        {
            SeedRecipeInputs();
            var result = _panel.TryRefine()!;

            foreach (var quality in Qualities.All)
            {
                var value = result.Qualities[quality];
                Assert.IsTrue(value is >= 1 and <= 100, $"{quality} was {value}");
            }
        }

        [Test]
        public void LeavingInsufficientInputsDoesNotConsumeWhatWasAvailable()
        {
            // Only 1 Igneous Ore available -- the recipe needs 2. Nothing
            // should be consumed on a failed attempt.
            _inventory.Add(new ResourceInstance { Resource = GameContent.IgneousOre, Quantity = 1, Qualities = ToQualityMap(FullQualities(50)) });

            var result = _panel.TryRefine();

            Assert.IsNull(result);
            Assert.AreEqual(1, _inventory.TotalQuantity("igneous-ore"));
        }
    }
}
