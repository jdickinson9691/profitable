using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/trading/globalPrice.ts. Takes the live PlanetMarketState
// collection explicitly rather than reaching into an implicit global
// store -- same pure-function pattern as every other function in this
// namespace. Callers must pass the actual current states at call time;
// this function itself does no caching, which is what makes "global never
// beats planet price" hold structurally rather than by convention.
//
// "Currently selling"/"currently buying" both resolve to the same thing
// in this simplified single-price-per-planet-item model: any planet with
// an active PlanetMarketState entry for the item. There's no separate
// bid/ask per planet -- CurrentPrice is that planet's one going rate.
public static class GlobalPrice
{
    public static double GetGlobalPrice(string itemId, TradeDirection direction, IReadOnlyList<PlanetMarketState> marketStates)
    {
        var prices = marketStates.Where(s => s.ItemId == itemId).Select(s => s.CurrentPrice).ToList();

        if (prices.Count == 0)
        {
            throw new InvalidOperationException($"GetGlobalPrice: no planet currently trades item \"{itemId}\"");
        }

        return direction == TradeDirection.Buy
            ? prices.Min() * (1 + TradingConfig.GlobalMarketMarkupPercent)
            : prices.Max() * (1 - TradingConfig.GlobalMarketDiscountPercent);
    }
}
