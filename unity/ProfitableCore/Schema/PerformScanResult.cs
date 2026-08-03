namespace Profitable.Core.Schema;

// Ports src/data/types/performScanResult.ts's PerformScanResult =
// ScanSucceeded | ScanRejected discriminated union.
public abstract class PerformScanResult
{
    public abstract bool Scanned { get; }
}

public sealed class ScanSucceeded : PerformScanResult
{
    public override bool Scanned => true;
    public List<Planet> NewlyDiscovered { get; init; } = new();
}

public sealed class ScanRejected : PerformScanResult
{
    public override bool Scanned => false;
    public string Reason { get; init; } = string.Empty;
}
