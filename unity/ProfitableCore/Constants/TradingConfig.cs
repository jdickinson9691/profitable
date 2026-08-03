namespace Profitable.Core.Constants;

// Ports src/data/constants/tradingConfig.ts. The TypeScript source uses a
// mutable module-level `let` binding plus a paired setter function for
// every debug/tuning-panel-adjustable value (a live ES-module binding, so
// every existing importer sees a value change on its very next read
// without re-importing) -- C# has no import-binding equivalent, but a
// mutable public static property gives every reader the same "always
// current" behavior directly, with no paired SetX() method needed (any
// caller can already assign the property). Structural, non-tunable
// constants (GlobalListableMaxItemTier, MaxItemTier -- these define market
// *mechanics*, not balance feel) stay plain `const`, exactly mirroring the
// TypeScript source's own const/let split.
public static class TradingConfig
{
    // How long an unsold listing stays active before expiring.
    public static double ListingExpiryHours { get; set; } = 72;

    // Percentage of CurrentPrice each traded unit moves the price by,
    // diminishing on successive units since it compounds against an
    // already-moved price rather than a flat amount.
    public static double BaselineDriftPercent { get; set; } = 0.02;

    // Bounds CurrentPrice as a fraction of BasePrice; drift must never
    // push CurrentPrice outside [BasePrice * PriceFloorPercent, BasePrice
    // * PriceCeilingPercent], even transiently mid-calculation.
    public static double PriceFloorPercent { get; set; } = 0.5;
    public static double PriceCeilingPercent { get; set; } = 1.5;

    // Fraction of the remaining gap to BasePrice closed per elapsed hour.
    public static double PriceRecoveryPercentPerHour { get; set; } = 0.01;

    // Global price is derived from the best live planet price, never
    // better for the player: buy = lowest planet sell price + markup,
    // sell = highest planet buy price - discount.
    public static double GlobalMarketMarkupPercent { get; set; } = 0.1;
    public static double GlobalMarketDiscountPercent { get; set; } = 0.1;

    // Flat fee taken on every sale, removed from the economy (not paid to
    // any player) as a currency sink against the single-currency model.
    public static double TransactionFeePercent { get; set; } = 0.05;

    // Item-tier range and the global market's sell restriction: tiers
    // above GlobalListableMaxItemTier (i.e. 6-7) cannot be listed with a
    // global MarketLocation, only on a planet market. Buying has no tier
    // restriction -- any tier 1-7 is buyable globally.
    public const int GlobalListableMaxItemTier = 5;
    public const int MaxItemTier = 7;

    // One full 4-season cycle every SeasonCycleHours * 4 hours.
    public static double SeasonCycleHours { get; set; } = 12;

    // Percentage swing applied to a season's favored (cheap) / disfavored
    // (premium) category.
    public static double SeasonPriceSwingPercent { get; set; } = 0.08;

    // How often each planet independently rolls for a new emergency -- a
    // planet-local check, not a galaxy-wide tick.
    public static double EmergencyCheckIntervalHours { get; set; } = 24;

    // "Rare" -- most check windows produce no emergency.
    public static double EmergencyTriggerChance { get; set; } = 0.15;

    // Must be <= EmergencyCheckIntervalHours, or a still-active emergency
    // from one window could bleed into the next window's own roll window.
    public static double EmergencyDurationHours { get; set; } = 4;

    // "Paying premium" -- meaningfully larger than a season's gentler swing.
    public static double EmergencyPricePremiumPercent { get; set; } = 0.3;
}
