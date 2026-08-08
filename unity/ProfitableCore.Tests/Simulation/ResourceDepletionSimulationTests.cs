using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace ProfitableCore.Tests.Simulation;

// Direct unit tests for ResourceDepletion.cs, mirroring
// tests/galaxy/resourceDepletion.test.ts's own case shapes exactly.
public class ResourceDepletionSimulationTests
{
    private static Resource Resource(string id, string category, int? itemTier = null) => new()
    {
        Id = id,
        Name = id,
        Category = category,
        ItemTier = itemTier,
        ApplicableQualities = Qualities.All.ToDictionary(q => q, _ => true),
    };

    // --- GetRemainingQuantity ---

    [Fact]
    public void GetRemainingQuantity_ReturnsNullWhenCapIsNull()
    {
        Assert.Null(ResourceDepletion.GetRemainingQuantity(null, null, 0));
        Assert.Null(ResourceDepletion.GetRemainingQuantity(null, new ResourceDepletion.ResourceDepletionEntry { CycleIndex = 0, QuantityGathered = 999 }, 0));
    }

    [Fact]
    public void GetRemainingQuantity_ReturnsTheFullCapWhenNoEntryExistsYet()
    {
        Assert.Equal(20, ResourceDepletion.GetRemainingQuantity(20, null, 0));
    }

    [Fact]
    public void GetRemainingQuantity_SubtractsQuantityGatheredWhenTheEntryMatchesTheCurrentCycle()
    {
        var entry = new ResourceDepletion.ResourceDepletionEntry { CycleIndex = 3, QuantityGathered = 12 };
        Assert.Equal(8, ResourceDepletion.GetRemainingQuantity(20, entry, 3));
    }

    [Fact]
    public void GetRemainingQuantity_TreatsAStaleCycleEntryAsNothingGatheredYet()
    {
        var entry = new ResourceDepletion.ResourceDepletionEntry { CycleIndex = 3, QuantityGathered = 20 };
        Assert.Equal(20, ResourceDepletion.GetRemainingQuantity(20, entry, 4));
    }

    [Fact]
    public void GetRemainingQuantity_FloorsAtZeroNeverNegative()
    {
        var entry = new ResourceDepletion.ResourceDepletionEntry { CycleIndex = 1, QuantityGathered = 25 };
        Assert.Equal(0, ResourceDepletion.GetRemainingQuantity(20, entry, 1));
    }

    // --- RecordGather ---

    [Fact]
    public void RecordGather_StartsAFreshEntryAtTheGivenQuantityWhenNoneExists()
    {
        var entry = ResourceDepletion.RecordGather(null, 5, 3);
        Assert.Equal(5, entry.CycleIndex);
        Assert.Equal(3, entry.QuantityGathered);
    }

    [Fact]
    public void RecordGather_AccumulatesOntoAnExistingSameCycleEntry()
    {
        var existing = new ResourceDepletion.ResourceDepletionEntry { CycleIndex = 5, QuantityGathered = 7 };
        var entry = ResourceDepletion.RecordGather(existing, 5, 2);
        Assert.Equal(5, entry.CycleIndex);
        Assert.Equal(9, entry.QuantityGathered);
    }

    [Fact]
    public void RecordGather_ResetsOntoAStaleCycleEntryRatherThanAccumulatingAcrossCycles()
    {
        var existing = new ResourceDepletion.ResourceDepletionEntry { CycleIndex = 5, QuantityGathered = 18 };
        var entry = ResourceDepletion.RecordGather(existing, 6, 1);
        Assert.Equal(6, entry.CycleIndex);
        Assert.Equal(1, entry.QuantityGathered);
    }

    [Fact]
    public void RecordGather_DefaultsQuantityToOne()
    {
        var entry = ResourceDepletion.RecordGather(null, 0);
        Assert.Equal(1, entry.QuantityGathered);
    }

    // --- End-to-end: becomes ungatherable at zero, regenerates at the next reset ---

    [Fact]
    public void ACappedResourceBecomesUngatherableOnceItsCapIsFullyGatheredWithinOneCycle()
    {
        var resources = Enumerable.Range(0, 10).Select(i => Resource($"depletion-resource-{i}", "Solid", 1)).ToList<Resource>();
        const int cycleIndex = 7;
        var cycle = PlanetResourceCycle.GenerateResourcesForCycle("depletion-seed", TierColor.Grey, PlanetType.Terrestrial, resources, cycleIndex);
        var resourceId = cycle.ProducibleResourceIds[0];
        var cap = cycle.ResourceQuantityCaps[resourceId]!.Value;
        Assert.Equal(20, cap);

        ResourceDepletion.ResourceDepletionEntry? entry = null;
        var remaining = ResourceDepletion.GetRemainingQuantity(cap, entry, cycleIndex);
        Assert.Equal(20, remaining);

        for (var gathered = 1; gathered <= cap; gathered++)
        {
            entry = ResourceDepletion.RecordGather(entry, cycleIndex, 1);
            remaining = ResourceDepletion.GetRemainingQuantity(cap, entry, cycleIndex);
            Assert.Equal(cap - gathered, remaining);
        }

        Assert.Equal(0, remaining);
    }

    [Fact]
    public void ADepletedResourceRegeneratesToTheFullCapAtTheNextResetCycle()
    {
        const int cap = 20;
        var depletedThisCycle = new ResourceDepletion.ResourceDepletionEntry { CycleIndex = 7, QuantityGathered = cap };
        Assert.Equal(0, ResourceDepletion.GetRemainingQuantity(cap, depletedThisCycle, 7));
        Assert.Equal(cap, ResourceDepletion.GetRemainingQuantity(cap, depletedThisCycle, 8));
    }
}
