namespace Profitable.Core.Schema;

// Ports src/data/types/refuelShipResult.ts's RefuelShipResult =
// RefuelShipSucceeded | RefuelShipRejected discriminated union.
public abstract class RefuelShipResult
{
    public abstract bool Refueled { get; }
}

public sealed class RefuelShipSucceeded : RefuelShipResult
{
    public override bool Refueled => true;
    public Ship UpdatedShip { get; init; } = new();
    public Wallet UpdatedWallet { get; init; } = new();
}

public sealed class RefuelShipRejected : RefuelShipResult
{
    public override bool Refueled => false;
    public string Reason { get; init; } = string.Empty;
}
