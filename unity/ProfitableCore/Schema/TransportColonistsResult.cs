namespace Profitable.Core.Schema;

// Ports src/data/types/transportColonistsResult.ts's TransportColonistsResult
// = TransportColonistsSucceeded | TransportColonistsRejected discriminated
// union.
public abstract class TransportColonistsResult
{
    public abstract bool Success { get; }
}

public sealed class TransportColonistsSucceeded : TransportColonistsResult
{
    public override bool Success => true;
    public Wallet UpdatedWallet { get; init; } = new();
    public PlanetOwnershipEntry UpdatedOwnershipEntry { get; init; } = new();
}

public sealed class TransportColonistsRejected : TransportColonistsResult
{
    public override bool Success => false;
    public string Reason { get; init; } = string.Empty;
}
