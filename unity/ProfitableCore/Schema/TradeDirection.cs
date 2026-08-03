namespace Profitable.Core.Schema;

// Ports src/data/types/tradeDirection.ts. Shared by Drift.ApplyDrift,
// GlobalPrice.GetGlobalPrice, and PurchaseListing rather than each retyping
// their own buy/sell pair independently.
public enum TradeDirection
{
    Buy,
    Sell,
}
