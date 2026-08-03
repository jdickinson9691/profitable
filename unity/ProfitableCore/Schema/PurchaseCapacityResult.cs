namespace Profitable.Core.Schema;

// Ports src/data/types/purchaseCapacityResult.ts's PurchaseCapacityResult
// = PurchaseCapacitySucceeded | PurchaseCapacityRejected discriminated
// union.
public abstract class PurchaseCapacityResult
{
    public abstract bool Purchased { get; }
}

public sealed class PurchaseCapacitySucceeded : PurchaseCapacityResult
{
    public override bool Purchased => true;
    public CrewCapacity UpdatedCapacity { get; init; } = new();
    public Wallet UpdatedWallet { get; init; } = new();
}

public sealed class PurchaseCapacityRejected : PurchaseCapacityResult
{
    public override bool Purchased => false;
    public string Reason { get; init; } = string.Empty;
}
