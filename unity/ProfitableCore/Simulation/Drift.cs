using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/trading/drift.ts.
public static class Drift
{
    private static (double Floor, double Ceiling) Bounds(double basePrice) =>
        (basePrice * TradingConfig.PriceFloorPercent, basePrice * TradingConfig.PriceCeilingPercent);

    // Direction is the trade's direction from the market's perspective:
    // Sell = a player sold INTO this market (added supply), dropping the
    // price; Buy = a player bought FROM this market (removed supply),
    // raising it. Applied one unit at a time (not as a single compounded
    // exponent) so the floor/ceiling clamp holds even transiently
    // mid-calculation, per the source's own explicit requirement.
    public static PlanetMarketState ApplyDrift(PlanetMarketState marketState, int unitsTraded, TradeDirection direction)
    {
        var (floor, ceiling) = Bounds(marketState.BasePrice);
        var sign = direction == TradeDirection.Buy ? 1 : -1;

        var price = marketState.CurrentPrice;
        for (var i = 0; i < unitsTraded; i++)
        {
            price = ClampHelper.Clamp(price * (1 + sign * TradingConfig.BaselineDriftPercent), floor, ceiling);
        }

        return new PlanetMarketState
        {
            PlanetId = marketState.PlanetId,
            ItemId = marketState.ItemId,
            BasePrice = marketState.BasePrice,
            CurrentPrice = price,
        };
    }

    // Drifts CurrentPrice back toward BasePrice over time when untraded.
    // Exponential decay of the remaining gap (percentage of the gap
    // closed per hour), consistent with the drift formula's own
    // percentage-based/naturally-diminishing design rather than a linear
    // walk that could overshoot BasePrice. elapsedHours may be fractional.
    public static PlanetMarketState ApplyRecovery(PlanetMarketState marketState, double elapsedHours)
    {
        var gap = marketState.BasePrice - marketState.CurrentPrice;
        var remainingGap = gap * Math.Pow(1 - TradingConfig.PriceRecoveryPercentPerHour, elapsedHours);
        var price = marketState.BasePrice - remainingGap;

        return new PlanetMarketState
        {
            PlanetId = marketState.PlanetId,
            ItemId = marketState.ItemId,
            BasePrice = marketState.BasePrice,
            CurrentPrice = price,
        };
    }
}
