using NUnit.Framework;
using Profitable.Core.Schema;
using Profitable.Unity.Content;

namespace Profitable.Unity.Tests.EditMode
{
    // Agent 35 -- direct unit tests for Inventory's own logic (FIFO
    // partial-batch consumption), independent of any panel.
    public class InventoryTests
    {
        private static Resource TestResource() => new() { Id = "test-resource", Name = "Test Resource", Category = "solid" };

        [Test]
        public void TotalQuantitySumsAcrossMultipleBatches()
        {
            var inventory = new Inventory();
            var resource = TestResource();
            inventory.Add(new ResourceInstance { Resource = resource, Quantity = 2, Qualities = new QualityMap() });
            inventory.Add(new ResourceInstance { Resource = resource, Quantity = 3, Qualities = new QualityMap() });

            Assert.AreEqual(5, inventory.TotalQuantity("test-resource"));
        }

        [Test]
        public void TakeThrowsWhenInsufficientQuantityIsAvailable()
        {
            var inventory = new Inventory();
            inventory.Add(new ResourceInstance { Resource = TestResource(), Quantity = 1, Qualities = new QualityMap() });

            Assert.Throws<System.InvalidOperationException>(() => inventory.Take("test-resource", 2));
        }

        [Test]
        public void TakeConsumesWholeBatchesFirst()
        {
            var inventory = new Inventory();
            var resource = TestResource();
            inventory.Add(new ResourceInstance { Resource = resource, Quantity = 2, Qualities = new QualityMap() });
            inventory.Add(new ResourceInstance { Resource = resource, Quantity = 3, Qualities = new QualityMap() });

            var taken = inventory.Take("test-resource", 2);

            Assert.AreEqual(1, taken.Count);
            Assert.AreEqual(2, taken[0].Quantity);
            Assert.AreEqual(3, inventory.TotalQuantity("test-resource"));
        }

        [Test]
        public void TakeSplitsAPartialBatchWhenNeeded()
        {
            var inventory = new Inventory();
            var resource = TestResource();
            inventory.Add(new ResourceInstance { Resource = resource, Quantity = 2, Qualities = new QualityMap() });
            inventory.Add(new ResourceInstance { Resource = resource, Quantity = 3, Qualities = new QualityMap() });

            var taken = inventory.Take("test-resource", 4);

            Assert.AreEqual(2, taken.Count);
            Assert.AreEqual(2, taken[0].Quantity); // whole first batch
            Assert.AreEqual(2, taken[1].Quantity); // partial second batch
            Assert.AreEqual(1, inventory.TotalQuantity("test-resource")); // 1 unit left in the second batch
        }

        [Test]
        public void TotalQuantityForAnUnknownResourceIsZero()
        {
            var inventory = new Inventory();
            Assert.AreEqual(0, inventory.TotalQuantity("nonexistent"));
        }
    }
}
