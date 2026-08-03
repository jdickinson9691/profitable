namespace Profitable.Core.Schema;

// Ports src/data/types/planetMarketState.ts. One planet's live price state
// for one item. CurrentPrice moves via baseline drift/recovery; BasePrice
// is the floor/ceiling reference point CurrentPrice drifts back toward
// over time when untraded.
public class PlanetMarketState
{
    public string PlanetId { get; set; } = string.Empty;
    public string ItemId { get; set; } = string.Empty;
    public double CurrentPrice { get; set; }
    public double BasePrice { get; set; }
}
