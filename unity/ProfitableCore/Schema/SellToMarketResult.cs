namespace Profitable.Core.Schema;

// Ports src/data/types/sellToMarketResult.ts. Not a discriminated union
// like PurchaseResult -- SellToMarket throws for its one failure mode
// (non-positive quantity) rather than returning a typed rejection, since
// selling your own inventory has no normal business-rejection case the
// way PurchaseListing's self-trade/over-quantity checks do (those react
// to another player's independent action).
public class SellToMarketResult
{
    public int QuantitySold { get; init; }
    public double TotalValue { get; init; }
    public double FeeDeducted { get; init; }
    public double ProceedsToSeller { get; init; }
    public Wallet UpdatedWallet { get; init; } = new();
    public PlanetMarketState UpdatedMarketState { get; init; } = new();
}
