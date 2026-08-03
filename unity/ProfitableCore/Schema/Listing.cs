namespace Profitable.Core.Schema;

// Ports src/data/types/listing.ts. Timestamps are epoch milliseconds
// (long, matching SeededRandom's own Date.now()-based convention), not a
// DateTime -- mirrors the TypeScript source's own `number` epoch-ms
// choice rather than introducing a new date/time representation.
public class Listing
{
    public string Id { get; set; } = string.Empty;
    public string ItemId { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public double PricePerUnit { get; set; }

    // Derived per the aggregate-tier rule (straight-average-to-tier), for
    // display/stacking only -- the underlying item instance keeps its
    // real 5-quality data elsewhere.
    public TierColor MarketTier { get; set; }
    public MarketLocation Location { get; set; } = GlobalMarketLocation.Instance;

    // Self-trade prevention keys off this.
    public string CreatedByPlayerId { get; set; } = string.Empty;
    public long CreatedAt { get; set; }
    public long ExpiresAt { get; set; }
}
