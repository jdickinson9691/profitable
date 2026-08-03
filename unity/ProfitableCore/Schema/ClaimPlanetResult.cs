namespace Profitable.Core.Schema;

// Ports src/data/types/claimPlanetResult.ts's ClaimPlanetResult =
// ClaimPlanetSucceeded | ClaimPlanetRejected discriminated union.
public abstract class ClaimPlanetResult
{
    public abstract bool Success { get; }
}

public sealed class ClaimPlanetSucceeded : ClaimPlanetResult
{
    public override bool Success => true;
    public PlanetOwnershipEntry UpdatedOwnershipEntry { get; init; } = new();
}

public sealed class ClaimPlanetRejected : ClaimPlanetResult
{
    public override bool Success => false;
    public string Reason { get; init; } = string.Empty;
}
