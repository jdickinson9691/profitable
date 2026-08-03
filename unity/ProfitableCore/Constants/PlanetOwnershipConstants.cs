namespace Profitable.Core.Constants;

// Ports the one src/data/constants/planetOwnership.ts constant Sub-Phase A
// has a hard dependency on -- GetCurrentPlanetResources()'s colonist gate
// is its very first check, exactly mirroring how the current TypeScript
// planetResourceCycle.ts already imports this same constant across the
// same file/domain boundary. Sub-Phase E's own agent extends this file
// with the rest of planetOwnership.ts's constants (CITADEL_LEVEL_BENEFITS,
// COLONIST_TRANSPORT_COST) -- never replaces it.
public static class PlanetOwnershipConstants
{
    public const int MinimumColonistsToProduce = 5;
}
