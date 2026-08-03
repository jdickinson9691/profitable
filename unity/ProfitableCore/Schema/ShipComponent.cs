namespace Profitable.Core.Schema;

// Ports src/data/types/shipComponent.ts. Carries the same 5-quality data
// as every other crafted item; Tier is derived from those qualities via
// AggregateTierResolver, same formula already used for Listing.MarketTier.
public class ShipComponent
{
    public string Id { get; set; } = string.Empty;
    public ComponentCategory Category { get; set; }
    public QualityMap Qualities { get; set; } = new();
    public TierColor Tier { get; set; }
}
