namespace Profitable.Core.Constants;

// Ports src/data/constants/planetOwnership.ts. Started in Sub-Phase A with
// just MinimumColonistsToProduce (GetCurrentPlanetResources()'s colonist
// gate); extended here in Sub-Phase E with ColonistTransportCost.
//
// Retroactive removal (2026-08-04): CitadelConstructionMaterial/
// CitadelLevelBenefit/PlanetOwnershipConstants.CitadelLevelBenefits removed
// along with the whole Citadels sub-system -- see planet-ownership.md's
// own retroactive note for the full account. MinimumColonistsToProduce/
// ColonistTransportCost are unaffected.
public static class PlanetOwnershipConstants
{
    public static int MinimumColonistsToProduce { get; set; } = 5;

    public static double ColonistTransportCost { get; set; } = 15;
}
