using System.Collections.Generic;
using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Unity.Content;
using Profitable.Unity.UI;
using UnityEngine;

namespace Profitable.Unity.Tests.EditMode
{
    // Agent 35 -- exercises CraftPanel.TryCraft() directly, including
    // the rejection path (a real behavior found by checking
    // src/presentation/scenes/CraftScene.ts directly, not assumed --
    // see CraftPanel.cs's own comment).
    public class CraftPanelTests
    {
        private GameObject _parent = null!;
        private Inventory _inventory = null!;
        private CraftPanel _panel = null!;
        private readonly List<string> _logs = new();

        [SetUp]
        public void SetUp()
        {
            GameContent.ResetForTests();
            _parent = new GameObject("TestParent", typeof(RectTransform));
            _inventory = new Inventory();
            _logs.Clear();
            _panel = new CraftPanel(_parent.transform, _inventory, _logs.Add);
        }

        [TearDown]
        public void TearDown() => Object.DestroyImmediate(_parent);

        private static QualityMap FullQualities(int value)
        {
            var map = new QualityMap();
            foreach (var quality in Qualities.All) map[quality] = value;
            return map;
        }

        private void SeedInputs(int alloyBarDurability)
        {
            var alloyBarQualities = FullQualities(70);
            alloyBarQualities[Quality.Durability] = alloyBarDurability;
            _inventory.Add(new ResourceInstance { Resource = GameContent.RadiantAlloyBar, Quantity = 1, Qualities = alloyBarQualities });

            var gasQualities = FullQualities(70);
            gasQualities[Quality.Durability] = null; // Hydrogen Gas has no durability
            _inventory.Add(new ResourceInstance { Resource = GameContent.HydrogenGas, Quantity = 1, Qualities = gasQualities });
        }

        [Test]
        public void FailsCleanlyWhenInputsAreInsufficient()
        {
            var result = _panel.TryCraft();

            Assert.IsNull(result);
            StringAssert.Contains("Craft failed", _logs[0]);
        }

        [Test]
        public void SucceedsAndConsumesInputsWhenDurabilityMeetsThreshold()
        {
            SeedInputs(alloyBarDurability: 70); // recipe threshold is 60

            var result = _panel.TryCraft();

            Assert.IsInstanceOf<CraftAccepted>(result);
            Assert.AreEqual(0, _inventory.TotalQuantity("radiant-alloy-bar"));
            Assert.AreEqual(0, _inventory.TotalQuantity("hydrogen-gas"));
        }

        [Test]
        public void AcceptedResultQualitiesAreInRange()
        {
            SeedInputs(alloyBarDurability: 70);

            var result = (CraftAccepted)_panel.TryCraft()!;

            foreach (var quality in Qualities.All)
            {
                var value = result.Qualities[quality];
                if (value is null) continue; // durability may legitimately be excluded downstream
                Assert.IsTrue(value is >= 1 and <= 100, $"{quality} was {value}");
            }
        }

        [Test]
        public void RejectsWhenDurabilityIsCatastrophicallyBelowThreshold()
        {
            SeedInputs(alloyBarDurability: 1); // 60 - 1 = 59 points below, well past the 41+ floor

            var result = _panel.TryCraft();

            Assert.IsInstanceOf<CraftRejected>(result);
            StringAssert.Contains("Craft rejected", _logs[^1]);
        }

        [Test]
        public void RejectedCraftReturnsConsumedMaterialsToInventory()
        {
            SeedInputs(alloyBarDurability: 1);

            _panel.TryCraft();

            Assert.AreEqual(1, _inventory.TotalQuantity("radiant-alloy-bar"));
            Assert.AreEqual(1, _inventory.TotalQuantity("hydrogen-gas"));
        }
    }
}
