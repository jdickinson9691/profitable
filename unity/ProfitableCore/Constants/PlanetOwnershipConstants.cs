using Profitable.Core.Schema;

namespace Profitable.Core.Constants;

// Ports src/data/constants/planetOwnership.ts. Started in Sub-Phase A
// with just MinimumColonistsToProduce (GetCurrentPlanetResources()'s
// colonist gate); extended here in Sub-Phase D because RefuelShip and
// ResolveComponentRepair both have a hard dependency on
// CitadelLevelBenefits (refuel discount / repair-enabled-and-rate-by-
// level), the same scoped-early-dependency shape this migration has used
// before (Sub-Phase A's own PlanetOwnershipConstants, Sub-Phase C's
// ShipCrewRole). ColonistTransportCost is not yet needed by any ported
// function and is left for Sub-Phase E's own agent to add alongside
// TransportColonists/ClaimPlanet/BuildCitadel.
public sealed class CitadelLevelBenefit
{
    public int Level { get; init; }
    public double RefuelDiscountPercent { get; init; }
    public bool RepairEnabled { get; init; }
}

public static class PlanetOwnershipConstants
{
    public const int MinimumColonistsToProduce = 5;

    // Level 1: docking only, no mechanical effect. Level 2: refuel
    // discount + repair, at a reduced rate. Level 3: same refuel
    // discount, repair upgrades to the full rate. Keyed by level (1-3),
    // not TierColor -- a Citadel has levels, not a crew/ship tier.
    public static readonly Dictionary<int, CitadelLevelBenefit> CitadelLevelBenefits = new()
    {
        [1] = new CitadelLevelBenefit { Level = 1, RefuelDiscountPercent = 0, RepairEnabled = false },
        [2] = new CitadelLevelBenefit { Level = 2, RefuelDiscountPercent = 0.25, RepairEnabled = true },
        [3] = new CitadelLevelBenefit { Level = 3, RefuelDiscountPercent = 0.25, RepairEnabled = true },
    };
}
