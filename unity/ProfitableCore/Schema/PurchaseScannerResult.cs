namespace Profitable.Core.Schema;

// Ports src/data/types/purchaseScannerResult.ts's PurchaseScannerResult =
// PurchaseScannerSucceeded | PurchaseScannerRejected discriminated union.
public abstract class PurchaseScannerResult
{
    public abstract bool Purchased { get; }
}

public sealed class PurchaseScannerSucceeded : PurchaseScannerResult
{
    public override bool Purchased => true;
    public Scanner Scanner { get; init; } = new();
    public ScannerPool UpdatedPool { get; init; } = new();
    public Wallet UpdatedWallet { get; init; } = new();
}

public sealed class PurchaseScannerRejected : PurchaseScannerResult
{
    public override bool Purchased => false;
    public string Reason { get; init; } = string.Empty;
}
