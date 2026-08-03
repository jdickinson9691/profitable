using Profitable.Core.Schema;

namespace Profitable.Core.Constants;

// Ports src/data/constants/resourceSubsetPercentage.ts. Percentage of
// eligible resources included in a planet's producible subset, by tier.
// Count = max(1, ceil(percentage * eligibleCount)) -- the max(1, ...)
// floor and the count formula itself are generation logic (Agent 39's
// job), not data.
public sealed class ResourceSubsetPercentage
{
    public TierColor Tier { get; init; }
    public double Percentage { get; init; }
}

public static class ResourceSubsetPercentageTable
{
    public static readonly IReadOnlyList<ResourceSubsetPercentage> All = new[]
    {
        new ResourceSubsetPercentage { Tier = TierColor.Grey, Percentage = 0.2 },
        new ResourceSubsetPercentage { Tier = TierColor.White, Percentage = 0.35 },
        new ResourceSubsetPercentage { Tier = TierColor.Green, Percentage = 0.5 },
        new ResourceSubsetPercentage { Tier = TierColor.Blue, Percentage = 0.65 },
        new ResourceSubsetPercentage { Tier = TierColor.Purple, Percentage = 0.8 },
        new ResourceSubsetPercentage { Tier = TierColor.Orange, Percentage = 0.9 },
        new ResourceSubsetPercentage { Tier = TierColor.Gold, Percentage = 1.0 },
    };
}
