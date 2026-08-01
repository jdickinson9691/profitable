using Profitable.Core.Schema;

namespace Profitable.Core.Constants;

// Ports src/data/constants/schematicTier.ts. GDD Section 3.3 -- schematic
// tier contribution, additive on top of crafter tier.
public sealed class SchematicTierContribution
{
    public TierColor Tier { get; init; }
    public double CeilingRaise { get; init; }
    public double VarianceNarrowing { get; init; }
    public double PenaltyForgiveness { get; init; }
}

public static class SchematicTierContributionTable
{
    public static readonly IReadOnlyList<SchematicTierContribution> All = new[]
    {
        new SchematicTierContribution { Tier = TierColor.Grey, CeilingRaise = 0, VarianceNarrowing = 0, PenaltyForgiveness = 0 },
        new SchematicTierContribution { Tier = TierColor.White, CeilingRaise = 0.01, VarianceNarrowing = -0.005, PenaltyForgiveness = 0.05 },
        new SchematicTierContribution { Tier = TierColor.Green, CeilingRaise = 0.02, VarianceNarrowing = -0.01, PenaltyForgiveness = 0.1 },
        new SchematicTierContribution { Tier = TierColor.Blue, CeilingRaise = 0.03, VarianceNarrowing = -0.015, PenaltyForgiveness = 0.15 },
        new SchematicTierContribution { Tier = TierColor.Purple, CeilingRaise = 0.04, VarianceNarrowing = -0.02, PenaltyForgiveness = 0.2 },
        new SchematicTierContribution { Tier = TierColor.Orange, CeilingRaise = 0.05, VarianceNarrowing = -0.025, PenaltyForgiveness = 0.25 },
        new SchematicTierContribution { Tier = TierColor.Gold, CeilingRaise = 0.06, VarianceNarrowing = -0.03, PenaltyForgiveness = 0.35 },
    };

    // GDD Section 3.3 -- crafter + schematic ceiling raise is capped at
    // +18% combined, not the raw arithmetic sum (which would be +21% at
    // max/max).
    public const double CombinedCeilingCap = 0.18;
}
