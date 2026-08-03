namespace Profitable.Core.Schema;

// Ports src/data/types/buildCitadelResult.ts's BuildCitadelResult =
// BuildCitadelSucceeded | BuildCitadelRejected discriminated union.
// BuildCitadel never touches Inventory directly -- same boundary
// Crafter.Craft already holds; the caller checks/consumes materials from
// its own inventory state after a successful result.
public abstract class BuildCitadelResult
{
    public abstract bool Success { get; }
}

public sealed class BuildCitadelSucceeded : BuildCitadelResult
{
    public override bool Success => true;
    public Wallet UpdatedWallet { get; init; } = new();
    public PlanetOwnershipEntry UpdatedOwnershipEntry { get; init; } = new();
    public string? MaterialResourceId { get; init; }
    public int MaterialQuantityConsumed { get; init; }
}

public sealed class BuildCitadelRejected : BuildCitadelResult
{
    public override bool Success => false;
    public string Reason { get; init; } = string.Empty;
}
