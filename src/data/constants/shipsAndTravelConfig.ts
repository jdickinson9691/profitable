import type { ShipTierSpeedModifier } from "../types/shipTierSpeedModifier.ts";
import type { ShipPurchaseCostByTier } from "../types/shipPurchaseCost.ts";

// Phase 5 GDD §2/§3 -- tunable ships & travel constants. Like Phase 4's
// crewConfig.ts, the design doc gives no example numbers for these (only
// documents the *shape* each table/value should take), so these are
// originated defaults, not formalized examples -- same latitude Agent 14
// used for Phase 3's base prices. All must still live here, the single
// source every ship/travel formula reads, per GDD §5.3.

// §2.8 -- converts raw Euclidean distance between two planets' {x,y}
// positions into a base travel time, in hours, before the ship-tier speed
// modifier is applied. Planet positions range +-1000 per axis (see
// src/galaxy/generateGalaxy.ts's POSITION_RANGE), so the maximum possible
// distance (~2828, a corner-to-corner diagonal) yields a base travel time
// of roughly 28 hours at this scale -- consistent with the tens-of-hours
// range every other Phase 4 timing tunable already uses (wage interval,
// upkeep grace period, elapsed-time cap).
export const DISTANCE_TO_TRAVEL_HOURS_PER_UNIT = 0.01;

// §2.4 -- ship tier's travel-time multiplier, applied on top of the base
// distance-derived travel time. Monotonically decreasing by tier: Grey is
// exactly baseline (no bonus), Gold roughly halves travel time ("a
// Gold-tier ship travels meaningfully faster," per the design doc).
export const SHIP_TIER_SPEED_MODIFIER: readonly ShipTierSpeedModifier[] = [
  { tier: "Grey", travelTimeMultiplier: 1.0 },
  { tier: "White", travelTimeMultiplier: 0.95 },
  { tier: "Green", travelTimeMultiplier: 0.85 },
  { tier: "Blue", travelTimeMultiplier: 0.75 },
  { tier: "Purple", travelTimeMultiplier: 0.65 },
  { tier: "Orange", travelTimeMultiplier: 0.55 },
  { tier: "Gold", travelTimeMultiplier: 0.45 },
];

// §2.2 -- how many unpurchased ship candidates sit in one planet's
// shipyard pool at once, and how often that pool re-rolls -- same pattern
// as Phase 4's crew pool (crewConfig.ts's CREW_POOL_SIZE_PER_PLANET /
// CREW_POOL_REFRESH_INTERVAL_HOURS).
export const SHIPYARD_POOL_SIZE_PER_PLANET = 3;
export const SHIPYARD_POOL_REFRESH_INTERVAL_HOURS = 24;

// §2.2 -- necessary completion: Agent 20's contract requires
// purchaseShip() to deduct "the appropriate cost (cost curve is a
// tunable, same pattern as NPC crew acquisition)" but no such table was
// named in the GDD's own Section 3 constant list. Added here, keyed by
// the ship's *derived* tier (not any single component), same tier-scales-
// cost shape as CREW_HIRE_COST_BY_TIER, scaled up from it to reflect a
// whole ship being a bigger investment than a single crew hire.
export const SHIP_PURCHASE_COST_BY_TIER: readonly ShipPurchaseCostByTier[] = [
  { tier: "Grey", cost: 300 },
  { tier: "White", cost: 600 },
  { tier: "Green", cost: 1200 },
  { tier: "Blue", cost: 2200 },
  { tier: "Purple", cost: 3800 },
  { tier: "Orange", cost: 6000 },
  { tier: "Gold", cost: 9000 },
];
