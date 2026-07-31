// Phase 3 GDD §2 -- tunable trading constants. All values below are
// documented starting defaults, not locked design requirements (per the
// design doc's own "exact numbers are a tunable balance decision" framing
// for several of these) -- but they must still live here, as the single
// source every trading formula reads, rather than as magic numbers
// scattered through Agent 11's logic (GDD §5.3).
//
// Alpha Section 4 debug/tuning panel: every balance-tunable value below is
// `let` (not `const`) with a paired setter, so the panel can live-adjust it
// without a redeploy. This is the same "module-level mutable binding + a
// setter function" shape crewState.ts/tradingState.ts already use for
// cross-scene state -- an ES module import is a live binding, so every
// existing call site (`import { X } from "./tradingConfig.ts"`) keeps
// working unchanged and sees the new value on its very next read. No
// formula/logic here changes, only whether the number behind it can move
// at runtime. Structural, non-tunable constants (GLOBAL_LISTABLE_MAX_ITEM_TIER,
// MAX_ITEM_TIER -- these define market *mechanics*, not balance feel) stay
// plain `const`.

// §2.5 -- how long an unsold listing stays active before expiring.
export let LISTING_EXPIRY_HOURS = 72;
export function setListingExpiryHours(value: number): void {
  LISTING_EXPIRY_HOURS = value;
}

// §2.6 -- percentage of currentPrice each traded unit moves the price by,
// diminishing on successive units since it compounds against an
// already-moved price rather than a flat amount.
export let BASELINE_DRIFT_PERCENT = 0.02;
export function setBaselineDriftPercent(value: number): void {
  BASELINE_DRIFT_PERCENT = value;
}

// §2.6 -- bounds currentPrice as a fraction of basePrice; drift must never
// push currentPrice outside [basePrice * PRICE_FLOOR_PERCENT, basePrice *
// PRICE_CEILING_PERCENT], even transiently mid-calculation.
export let PRICE_FLOOR_PERCENT = 0.5;
export function setPriceFloorPercent(value: number): void {
  PRICE_FLOOR_PERCENT = value;
}
export let PRICE_CEILING_PERCENT = 1.5;
export function setPriceCeilingPercent(value: number): void {
  PRICE_CEILING_PERCENT = value;
}

// §2.6 -- necessary completion, added while implementing Agent 11
// (applyRecovery): the GDD says prices "drift back toward base over time
// when untraded" and that the rate is tunable, but names no distinct
// recovery-rate constant of its own (only BASELINE_DRIFT_PERCENT, which
// §2.6's own text ties specifically to "each unit sold/bought," a
// per-trade effect, not a per-time-elapsed one). Recovery needs its own
// rate since it moves toward basePrice on the clock, not on trade volume.
// Fraction of the remaining gap to basePrice closed per elapsed hour.
export let PRICE_RECOVERY_PERCENT_PER_HOUR = 0.01;
export function setPriceRecoveryPercentPerHour(value: number): void {
  PRICE_RECOVERY_PERCENT_PER_HOUR = value;
}

// §2.7 -- global price is derived from the best live planet price, never
// better for the player: buy = lowest planet sell price + markup, sell =
// highest planet buy price - discount.
export let GLOBAL_MARKET_MARKUP_PERCENT = 0.1;
export function setGlobalMarketMarkupPercent(value: number): void {
  GLOBAL_MARKET_MARKUP_PERCENT = value;
}
export let GLOBAL_MARKET_DISCOUNT_PERCENT = 0.1;
export function setGlobalMarketDiscountPercent(value: number): void {
  GLOBAL_MARKET_DISCOUNT_PERCENT = value;
}

// §2.11 -- flat fee taken on every sale, removed from the economy (not
// paid to any player) as a currency sink against the single-currency model.
export let TRANSACTION_FEE_PERCENT = 0.05;
export function setTransactionFeePercent(value: number): void {
  TRANSACTION_FEE_PERCENT = value;
}

// §2.1/§2.8 -- item-tier range (see Resource.itemTier) and the global
// market's sell restriction: tiers above GLOBAL_LISTABLE_MAX_ITEM_TIER
// (i.e. 6-7) cannot be listed with location: 'global', only on a planet
// market. Buying has no tier restriction -- any tier 1-7 is buyable
// globally, per §2.1. Structural market-mechanics constants, not a
// balance-tuning knob -- left as plain `const`, not exposed on the debug
// panel.
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
export let SEASON_CYCLE_HOURS = 12;
export function setSeasonCycleHours(value: number): void {
  SEASON_CYCLE_HOURS = value;
}
// Percentage swing applied to a season's favored (cheap) / disfavored
// (premium) category -- smaller than an emergency's, consistent with
// "slow, predictable" being a gentler effect than "rare, sudden."
export let SEASON_PRICE_SWING_PERCENT = 0.08;
export function setSeasonPriceSwingPercent(value: number): void {
  SEASON_PRICE_SWING_PERCENT = value;
}

// How often each planet independently rolls for a new emergency -- a
// planet-local check, not a galaxy-wide tick.
export let EMERGENCY_CHECK_INTERVAL_HOURS = 24;
export function setEmergencyCheckIntervalHours(value: number): void {
  EMERGENCY_CHECK_INTERVAL_HOURS = value;
}
// "Rare" -- most check windows produce no emergency.
export let EMERGENCY_TRIGGER_CHANCE = 0.15;
export function setEmergencyTriggerChance(value: number): void {
  EMERGENCY_TRIGGER_CHANCE = value;
}
// Must be <= EMERGENCY_CHECK_INTERVAL_HOURS, or a still-active emergency
// from one window could bleed into the next window's own roll window.
export let EMERGENCY_DURATION_HOURS = 4;
export function setEmergencyDurationHours(value: number): void {
  EMERGENCY_DURATION_HOURS = value;
}
// "Paying premium" -- meaningfully larger than a season's gentler swing.
export let EMERGENCY_PRICE_PREMIUM_PERCENT = 0.3;
export function setEmergencyPricePremiumPercent(value: number): void {
  EMERGENCY_PRICE_PREMIUM_PERCENT = value;
}
