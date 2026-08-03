namespace Profitable.Core.Schema;

// Ports src/data/types/scannerCandidate.ts. Omits Scanner.OwnerId only --
// an unpurchased pool entry has no real owner yet.
public class ScannerCandidate
{
    public string Id { get; set; } = string.Empty;
    public TierColor Tier { get; set; }
}
