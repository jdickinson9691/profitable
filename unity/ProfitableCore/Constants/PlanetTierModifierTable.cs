using Profitable.Core.Schema;

namespace Profitable.Core.Constants;

// Ports src/data/constants/planetTierModifier.ts. Flat additive modifier
// applied to RollQuality()'s base roll before clamping. Green is the
// neutral point here (not Grey, unlike the refiner/crafter/schematic
// tables) -- a planet isn't a skill investment, it's a place.
public sealed class PlanetTierModifier
{
    public TierColor Tier { get; init; }
    public int QualityRollModifier { get; init; }
}

public static class PlanetTierModifierTable
{
    public static readonly IReadOnlyList<PlanetTierModifier> All = new[]
    {
        new PlanetTierModifier { Tier = TierColor.Grey, QualityRollModifier = -15 },
        new PlanetTierModifier { Tier = TierColor.White, QualityRollModifier = -8 },
        new PlanetTierModifier { Tier = TierColor.Green, QualityRollModifier = 0 },
        new PlanetTierModifier { Tier = TierColor.Blue, QualityRollModifier = 8 },
        new PlanetTierModifier { Tier = TierColor.Purple, QualityRollModifier = 15 },
        new PlanetTierModifier { Tier = TierColor.Orange, QualityRollModifier = 22 },
        new PlanetTierModifier { Tier = TierColor.Gold, QualityRollModifier = 30 },
    };

    // Flat modifier for a planet's one specialty resource, additive on top
    // of PlanetTierModifier (never a replacement for it).
    public const int SpecialtyQualityModifier = 15;
}
