using Profitable.Core.Schema;

namespace Profitable.Core.Constants;

// Ports src/data/constants/tierVariance.ts. GDD Section 3.2 -- shared
// refiner/crafter tier variance table.
public sealed class TierVariance
{
    public TierColor Tier { get; init; }
    public double Negative { get; init; }
    public double Positive { get; init; }
}

public static class TierVarianceTable
{
    public static readonly IReadOnlyList<TierVariance> All = new[]
    {
        new TierVariance { Tier = TierColor.Grey, Negative = -0.1, Positive = 0.1 },
        new TierVariance { Tier = TierColor.White, Negative = -0.08, Positive = 0.1 },
        new TierVariance { Tier = TierColor.Green, Negative = -0.06, Positive = 0.1 },
        new TierVariance { Tier = TierColor.Blue, Negative = -0.045, Positive = 0.11 },
        new TierVariance { Tier = TierColor.Purple, Negative = -0.03, Positive = 0.12 },
        new TierVariance { Tier = TierColor.Orange, Negative = -0.015, Positive = 0.13 },
        new TierVariance { Tier = TierColor.Gold, Negative = -0.005, Positive = 0.15 },
    };
}
