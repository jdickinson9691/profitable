using Profitable.Core.Schema;

namespace Profitable.Core.Constants;

// Ports src/data/constants/planetOwnership.ts. Started in Sub-Phase A
// with just MinimumColonistsToProduce (GetCurrentPlanetResources()'s
// colonist gate); extended in Sub-Phase D with CitadelLevelBenefits'
// refuel/repair fields (RefuelShip/ResolveComponentRepair's own hard
// dependency); extended here in Sub-Phase E with ColonistTransportCost
// and CitadelLevelBenefits' own ConstructionCost fields, which only
// BuildCitadel needs.
public sealed class CitadelConstructionMaterial
{
    public string ResourceId { get; init; } = string.Empty;
    public int Quantity { get; init; }
}

public sealed class CitadelLevelBenefit
{
    public int Level { get; init; }
    public double ConstructionCostCredits { get; init; }
    public CitadelConstructionMaterial? ConstructionMaterial { get; init; }
    public double RefuelDiscountPercent { get; init; }
    public bool RepairEnabled { get; init; }
}

public static class PlanetOwnershipConstants
{
    public const int MinimumColonistsToProduce = 5;

    public static double ColonistTransportCost { get; set; } = 15;

    // Level 1: docking only, no mechanical effect (TW2002's level-1
    // benefit protects against an invasion threat this game has no model
    // of). Level 2: refuel discount + repair, at a reduced rate. Level 3:
    // same refuel discount, repair upgrades to the full rate. Keyed by
    // level (1-3), not TierColor -- a Citadel has levels, not a crew/ship
    // tier. Construction materials reuse existing refined content
    // (iron-ingot), not a new item.
    public static readonly Dictionary<int, CitadelLevelBenefit> CitadelLevelBenefits = new()
    {
        [1] = new CitadelLevelBenefit { Level = 1, ConstructionCostCredits = 100, ConstructionMaterial = null, RefuelDiscountPercent = 0, RepairEnabled = false },
        [2] = new CitadelLevelBenefit { Level = 2, ConstructionCostCredits = 300, ConstructionMaterial = new CitadelConstructionMaterial { ResourceId = "iron-ingot", Quantity = 5 }, RefuelDiscountPercent = 0.25, RepairEnabled = true },
        [3] = new CitadelLevelBenefit { Level = 3, ConstructionCostCredits = 800, ConstructionMaterial = new CitadelConstructionMaterial { ResourceId = "iron-ingot", Quantity = 15 }, RefuelDiscountPercent = 0.25, RepairEnabled = true },
    };
}
