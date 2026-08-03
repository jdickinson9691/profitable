namespace Profitable.Core.Schema;

// Ports src/data/types/purchaseShipResult.ts's PurchaseShipResult =
// PurchaseShipSucceeded | PurchaseShipRejected discriminated union,
// mirroring HireResult exactly.
public abstract class PurchaseShipResult
{
    public abstract bool Purchased { get; }
}

public sealed class PurchaseShipSucceeded : PurchaseShipResult
{
    public override bool Purchased => true;
    public Ship Ship { get; init; } = new();
    public ShipyardPool UpdatedPool { get; init; } = new();
    public Wallet UpdatedWallet { get; init; } = new();
}

public sealed class PurchaseShipRejected : PurchaseShipResult
{
    public override bool Purchased => false;
    public string Reason { get; init; } = string.Empty;
}
