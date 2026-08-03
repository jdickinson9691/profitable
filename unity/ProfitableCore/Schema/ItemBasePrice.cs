namespace Profitable.Core.Schema;

// Ports src/data/types/itemBasePrice.ts. The single galaxy-wide reference
// value each planet's initial PlanetMarketState.BasePrice is seeded from
// -- not the same thing as PlanetMarketState.BasePrice itself, which is
// per planet+item.
public class ItemBasePrice
{
    public string ItemId { get; set; } = string.Empty;
    public double BasePrice { get; set; }
}
