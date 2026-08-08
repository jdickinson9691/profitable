namespace Profitable.Core.Simulation;

// Ports src/galaxy/resourceDepletion.ts. Per-Resource Quantity Caps: pure,
// framework-agnostic tracking of how much of a resource's per-cycle cap
// (PlanetResourceCycle's ResourceQuantityCaps) has been gathered so far --
// deliberately separate from that file's own ResourcesForCycle, which stays
// a pure function of (seed, tier, cycleIndex) with zero persisted state.
// Consumption (how much has actually been taken) is a different kind of
// fact -- set by discrete player actions, not derivable from the seed -- so
// it lives in its own small pure module here, with the real persisted
// side-table one layer up in the Presentation caller
// (ResourceDepletionState.cs), mirroring the exact "pure core / persisted
// side-table caller" boundary PlanetOwnershipState.cs's ColonistCount
// already established.
public static class ResourceDepletion
{
    public sealed class ResourceDepletionEntry
    {
        public int CycleIndex { get; init; }
        public int QuantityGathered { get; init; }
    }

    // A stored entry from a stale cycle (CycleIndex != currentCycleIndex)
    // counts as "nothing gathered yet" this cycle -- no separate reset
    // event needed, mirroring how GetCurrentPlanetResources() itself treats
    // a cycle transition as an implicit reset rather than an explicit one.
    // cap == null (the tutorial-guarantee exemption) always returns null --
    // unconditionally available, no ceiling to compare against.
    public static int? GetRemainingQuantity(int? cap, ResourceDepletionEntry? entry, int currentCycleIndex)
    {
        if (cap is null) return null;
        var gathered = entry is not null && entry.CycleIndex == currentCycleIndex ? entry.QuantityGathered : 0;
        return Math.Max(cap.Value - gathered, 0);
    }

    // Returns the entry to persist after gathering `quantity` more units --
    // never clamped against the cap here (the caller checks
    // GetRemainingQuantity() before allowing the gather action at all; this
    // function only records what happened). Same stale-cycle-resets-
    // implicitly rule as GetRemainingQuantity() above.
    public static ResourceDepletionEntry RecordGather(ResourceDepletionEntry? entry, int currentCycleIndex, int quantity = 1)
    {
        var gathered = entry is not null && entry.CycleIndex == currentCycleIndex ? entry.QuantityGathered : 0;
        return new ResourceDepletionEntry { CycleIndex = currentCycleIndex, QuantityGathered = gathered + quantity };
    }
}
