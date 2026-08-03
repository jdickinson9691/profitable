namespace Profitable.Core.Schema;

// Ports src/data/types/sellToGlobalMarketResult.ts. Deliberately no
// UpdatedMarketState field at all (not even null) -- global price is a
// derived value with no PlanetMarketState of its own to update, unlike
// SellToMarketResult's planetary counterpart. See SellToGlobalMarket's own
// comment for why drifting the planet that happened to supply the
// derived price would be wrong.
public class SellToGlobalMarketResult
{
    public int QuantitySold { get; init; }
    public double TotalValue { get; init; }
    public double FeeDeducted { get; init; }
    public double ProceedsToSeller { get; init; }
    public Wallet UpdatedWallet { get; init; } = new();
}
