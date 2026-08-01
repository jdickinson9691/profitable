using Profitable.Core.Schema;

namespace Profitable.Core.Constants;

// Ports src/data/constants/refundChance.ts. GDD Section 3.2 -- refund
// chance per consumed unit, keyed to the refining OUTPUT tier (not the
// input tier).
public sealed class RefundChance
{
    public TierColor Tier { get; init; }
    public double Chance { get; init; }

    // Only Gold sets this (a secondary chance of 2 units instead of 1) --
    // null everywhere else, mirroring the TypeScript type's optional field
    // rather than defaulting to 0, which would be indistinguishable from
    // "explicitly zero chance."
    public double? SecondaryUnitChance { get; init; }
}

public static class RefundChanceTable
{
    public static readonly IReadOnlyList<RefundChance> All = new[]
    {
        new RefundChance { Tier = TierColor.Grey, Chance = 0 },
        new RefundChance { Tier = TierColor.White, Chance = 0 },
        new RefundChance { Tier = TierColor.Green, Chance = 0.05 },
        new RefundChance { Tier = TierColor.Blue, Chance = 0.1 },
        new RefundChance { Tier = TierColor.Purple, Chance = 0.15 },
        new RefundChance { Tier = TierColor.Orange, Chance = 0.2 },
        new RefundChance { Tier = TierColor.Gold, Chance = 0.25, SecondaryUnitChance = 0.2 },
    };
}
