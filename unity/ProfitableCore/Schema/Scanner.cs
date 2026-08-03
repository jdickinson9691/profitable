namespace Profitable.Core.Schema;

// Ports src/data/types/scanner.ts. A standalone item, deliberately outside
// ComponentCategory/ShipComponent -- owning a scanner has zero effect on
// DeriveShipTier's component-tier averaging.
public class Scanner
{
    public string Id { get; set; } = string.Empty;
    public TierColor Tier { get; set; }
    public string OwnerId { get; set; } = string.Empty;
}
