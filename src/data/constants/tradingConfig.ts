// Phase 3 GDD §2 -- tunable trading constants. All values below are
// documented starting defaults, not locked design requirements (per the
// design doc's own "exact numbers are a tunable balance decision" framing
// for several of these) -- but they must still live here, as the single
// source every trading formula reads, rather than as magic numbers
// scattered through Agent 11's logic (GDD §5.3).

// §2.5 -- how long an unsold listing stays active before expiring.
export const LISTING_EXPIRY_HOURS = 72;

// §2.6 -- percentage of currentPrice each traded unit moves the price by,
// diminishing on successive units since it compounds against an
// already-moved price rather than a flat amount.
export const BASELINE_DRIFT_PERCENT = 0.02;

// §2.6 -- bounds currentPrice as a fraction of basePrice; drift must never
// push currentPrice outside [basePrice * PRICE_FLOOR_PERCENT, basePrice *
// PRICE_CEILING_PERCENT], even transiently mid-calculation.
export const PRICE_FLOOR_PERCENT = 0.5;
export const PRICE_CEILING_PERCENT = 1.5;

// §2.6 -- necessary completion, added while implementing Agent 11
// (applyRecovery): the GDD says prices "drift back toward base over time
// when untraded" and that the rate is tunable, but names no distinct
// recovery-rate constant of its own (only BASELINE_DRIFT_PERCENT, which
// §2.6's own text ties specifically to "each unit sold/bought," a
// per-trade effect, not a per-time-elapsed one). Recovery needs its own
// rate since it moves toward basePrice on the clock, not on trade volume.
// Fraction of the remaining gap to basePrice closed per elapsed hour.
export const PRICE_RECOVERY_PERCENT_PER_HOUR = 0.01;

// §2.7 -- global price is derived from the best live planet price, never
// better for the player: buy = lowest planet sell price + markup, sell =
// highest planet buy price - discount.
export const GLOBAL_MARKET_MARKUP_PERCENT = 0.1;
export const GLOBAL_MARKET_DISCOUNT_PERCENT = 0.1;

// §2.11 -- flat fee taken on every sale, removed from the economy (not
// paid to any player) as a currency sink against the single-currency model.
export const TRANSACTION_FEE_PERCENT = 0.05;

// §2.1/§2.8 -- item-tier range (see Resource.itemTier) and the global
// market's sell restriction: tiers above GLOBAL_LISTABLE_MAX_ITEM_TIER
// (i.e. 6-7) cannot be listed with location: 'global', only on a planet
// market. Buying has no tier restriction -- any tier 1-7 is buyable
// globally, per §2.1.
export const GLOBAL_LISTABLE_MAX_ITEM_TIER = 5;
export const MAX_ITEM_TIER = 7;

// §2.9 -- the second and third of the trade map's three data layers
// (baseline drift above is the first). Bug fix, not part of the original
// Phase 3 build: "each planet has a recurring cycle... that swings its buy/
// sell lists on a schedule" and "randomly-triggered events... purely
// random" both name no concrete numbers, so these are originated defaults,
// documented as such -- same latitude Agent 14 used for base prices, Agent
// 20 for ship purchase costs. See src/trading/season.ts and
// src/trading/emergency.ts for the functions that read them.

// "Slow, predictable" relative to baseline drift's continuous per-trade
// movement -- one full 4-season cycle every 48 hours.
export const SEASON_CYCLE_HOURS = 12;
// Percentage swing applied to a season's favored (cheap) / disfavored
// (premium) category -- smaller than an emergency's, consistent with
// "slow, predictable" being a gentler effect than "rare, sudden."
export const SEASON_PRICE_SWING_PERCENT = 0.08;

// How often each planet independently rolls for a new emergency -- a
// planet-local check, not a galaxy-wide tick.
export const EMERGENCY_CHECK_INTERVAL_HOURS = 24;
// "Rare" -- most check windows produce no emergency.
export const EMERGENCY_TRIGGER_CHANCE = 0.15;
// Must be <= EMERGENCY_CHECK_INTERVAL_HOURS, or a still-active emergency
// from one window could bleed into the next window's own roll window.
export const EMERGENCY_DURATION_HOURS = 4;
// "Paying premium" -- meaningfully larger than a season's gentler swing.
export const EMERGENCY_PRICE_PREMIUM_PERCENT = 0.3;
