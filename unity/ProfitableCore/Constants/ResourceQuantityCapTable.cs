using Profitable.Core.Schema;

namespace Profitable.Core.Constants;

// Ports src/data/constants/resourceQuantityCap.ts. Per-Resource Quantity
// Caps: max units of a given resource a planet offers per reset cycle, by
// the planet's own tier. Exempt entirely: the starting-planet tutorial
// guarantee's 3 resources (PlanetResourceCycle.ApplyTutorialGuarantee sets
// their cap to null/uncapped). Originated default, tunable in the
// TypeScript source -- this port takes the current values as a plain
// dictionary, not independently re-tunable in C# yet (no debug panel
// exists here), same status as every other ported tier table in this file.
public static class ResourceQuantityCapTable
{
    public static Dictionary<TierColor, int> ByTier { get; } = new()
    {
        [TierColor.Grey] = 20,
        [TierColor.White] = 35,
        [TierColor.Green] = 50,
        [TierColor.Blue] = 75,
        [TierColor.Purple] = 110,
        [TierColor.Orange] = 160,
        [TierColor.Gold] = 230,
    };
}
