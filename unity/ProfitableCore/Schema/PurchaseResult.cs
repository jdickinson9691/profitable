namespace Profitable.Core.Schema;

// Ports src/data/types/purchaseResult.ts's PurchaseResult = PurchaseSucceeded
// | PurchaseRejected discriminated union, same sealed-class-hierarchy idiom
// as CraftResult/CraftAccepted/CraftRejected.
public abstract class PurchaseResult
{
    public abstract bool Success { get; }
}

public sealed class PurchaseSucceeded : PurchaseResult
{
    public override bool Success => true;

    // The listing after this purchase -- quantity decremented. Still
    // present (not deleted) even when QuantityRemaining reaches 0; see
    // Closed.
    public Listing UpdatedListing { get; init; } = new();
    public bool Closed { get; init; }
    public int QuantityPurchased { get; init; }
    public double TotalPaid { get; init; }
    public double FeeDeducted { get; init; }
    public double ProceedsToSeller { get; init; }

    // Present only for a planet-market listing (ApplyDrift was
    // triggered); null for a global listing, which has no per-planet
    // drift state.
    public PlanetMarketState? UpdatedMarketState { get; init; }
}

public sealed class PurchaseRejected : PurchaseResult
{
    public override bool Success => false;
    public string Reason { get; init; } = string.Empty;
}
