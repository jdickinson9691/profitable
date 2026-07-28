import type { ShipTierSpeedModifier } from "../types/shipTierSpeedModifier.ts";
import type { ShipPurchaseCostByTier } from "../types/shipPurchaseCost.ts";
import type { EncounterType } from "../types/encounter.ts";
import type { HazardTierModifier } from "../types/hazardTierModifier.ts";
import type { HazardFailureCostBand } from "../types/hazardFailureCostBand.ts";
import type { ScannerPurchaseCostByTier } from "../types/scannerPurchaseCost.ts";
import type { ScannerTierRadiusBonus } from "../types/scannerTierRadiusBonus.ts";

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

// Travel Encounters (Non-Combat) GDD §2/§3 -- like the rest of this file,
// the design doc documents the *shape* of each value without example
// numbers, so these are originated defaults, not formalized examples.

// §2.1 -- "same shape as the existing emergency system" (reuse the 24h
// window and percentage-trigger-chance pattern). Deliberately a fresh
// constant rather than importing EMERGENCY_CHECK_INTERVAL_HOURS/
// EMERGENCY_TRIGGER_CHANCE from src/data/constants/tradingConfig.ts --
// Ships/Travel and Trading are separate domains, and duplicating two
// numbers with a documented rationale is a smaller cost than a cross-
// domain constant dependency between otherwise-unrelated systems.
export const ENCOUNTER_CHECK_WINDOW_HOURS = 24;
export const ENCOUNTER_TRIGGER_CHANCE = 0.15;

// §2.2 -- weighted random split when a window's roll triggers an
// encounter. Hazard (the only downside type) is deliberately the lowest
// weight; the other two split the remainder evenly, since nothing in the
// design doc gives a reason to favor one over the other. Weights sum to 1.
//
// Combat GDD §2.2/§3: "a fourth, low-weighted entry... extends the
// existing three-way table to four entries... must update the existing
// table, not create a parallel one." Agent 1's own amendment left this at
// a deliberate `0` placeholder (see git history/that amendment's own
// comment on why) since resolveEncounters() couldn't yet consume a
// nonzero value correctly; setting the real weight is explicitly this
// (Agent 20 Combat Core) amendment's job, in the same change that teaches
// resolveEncounters() to detect and branch on `combat` (src/ships/
// resolveEncounters.ts).
//
// `combat` (0.05) is carved out by scaling the original three weights
// down *proportionally* (each multiplied by 0.95) rather than subtracting
// unevenly from just one of them -- this is what keeps their relative
// ratio to each other exactly 0.4 : 0.4 : 0.2 (tradeOpportunity : discovery
// : hazard), identical to the pre-Combat amendment, which is what
// `tests/ships/resolveEncounters.test.ts`'s own statistical distribution
// test measures (rates as a fraction of the non-combat subtotal) --
// proportional scaling leaves that already-verified test's targets valid
// with no changes needed. 0.05 keeps combat genuinely rarer than hazard,
// consistent with "low-weighted."
export const ENCOUNTER_TYPE_WEIGHTS: Readonly<Record<EncounterType, number>> = {
  tradeOpportunity: 0.38,
  discovery: 0.38,
  hazard: 0.19,
  combat: 0.05,
};

// Combat GDD §2.2/§3 -- "arrival-triggered combat check chance... a
// separate probability from the travel-window roll." A one-time check per
// arrival (not a recurring per-window roll like ENCOUNTER_TRIGGER_CHANCE),
// so set lower -- a discrete, rarer event rather than something that
// compounds across a long voyage's many windows.
export const ARRIVAL_COMBAT_CHECK_CHANCE = 0.1;

// Combat GDD §2.5/§3 -- "component durability damage percentage" on a
// combat loss: the weapon's qualities.durability is reduced by this
// fraction (then its tier, and the ship's derived tier, are recomputed --
// Agent 20's job). Meaningful but not crippling in one hit, consistent
// with the design's own "lightweight, non-permanent" framing (§2.1) --
// several losses would compound before a component became unusable.
export const COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT = 0.15;

// Combat GDD §2.5/§3 -- "crew unavailableUntil duration" on a combat loss.
// Mirrors the daily-scale timing every other Ships/Crew tunable already
// uses (WAGE_PAYMENT_INTERVAL_HOURS, UPKEEP_GRACE_PERIOD_HOURS) rather
// than inventing a new time scale.
export const COMBAT_CREW_UNAVAILABLE_DURATION_HOURS = 24;

// Combat GDD §2.4/§3: "reuses the existing tier-variance table shape (no
// new curve to design)." Confirmed -- TIER_VARIANCE
// (src/data/constants/tierVariance.ts), the same shared refiner/crafter
// asymmetric +-% table, is the one Agent 20's resolveCombatChoice() must
// import and apply to both the weapon's tier and the opponent's
// opponentThreatTier. No second, combat-specific variance table exists or
// should exist here -- see tests/data/combatConstants.test.ts's own
// "no duplicate table" confirmation.

// §2.4 -- a trade-opportunity's automatic currency grant range, direct to
// Wallet. Scaled to feel like a meaningful but modest windfall relative to
// the existing economy (a Grey-tier ship costs 300cr, a Grey-tier crew
// hire ~50cr per CREW_HIRE_COST_BY_TIER).
export const ENCOUNTER_TRADE_OPPORTUNITY_MIN_CREDITS = 20;
export const ENCOUNTER_TRADE_OPPORTUNITY_MAX_CREDITS = 150;

// §2.6 -- hazard: roll 1-100 against this fixed pass threshold, modified
// additively by the voyage's ship's derived tier via HAZARD_SHIP_TIER_MODIFIER
// below (need roll + rollBonus >= HAZARD_PASS_THRESHOLD to pass).
export const HAZARD_PASS_THRESHOLD = 50;

// §2.6 -- "modified by ship tier," same "tier shifts a roll" pattern as
// PLANET_TIER_MODIFIER, but Grey = +0 (floor, not a penalty) -- see
// HazardTierModifier's own comment for why this follows the ship-tier
// convention (SHIP_TIER_SPEED_MODIFIER) rather than the planet-tier one.
export const HAZARD_SHIP_TIER_MODIFIER: readonly HazardTierModifier[] = [
  { tier: "Grey", rollBonus: 0 },
  { tier: "White", rollBonus: 5 },
  { tier: "Green", rollBonus: 10 },
  { tier: "Blue", rollBonus: 15 },
  { tier: "Purple", rollBonus: 20 },
  { tier: "Orange", rollBonus: 25 },
  { tier: "Gold", rollBonus: 30 },
];

// §2.6 -- "a scaled currency cost using the same escalating curve shape as
// the crafting threshold penalty": HAZARD_BASE_FAILURE_COST times the
// matching band's multiplier below, keyed to how many points the roll (plus
// its tier bonus) fell below HAZARD_PASS_THRESHOLD. Mirrors PENALTY_CURVE's
// exact 10-point band boundaries; unlike that curve, there is no "reject"
// band -- a hazard failure always resolves to some cost.
export const HAZARD_BASE_FAILURE_COST = 30;
export const HAZARD_FAILURE_COST_CURVE: readonly HazardFailureCostBand[] = [
  { minPointsBelow: 1, maxPointsBelow: 10, costMultiplier: 1.0 },
  { minPointsBelow: 11, maxPointsBelow: 20, costMultiplier: 1.5 },
  { minPointsBelow: 21, maxPointsBelow: 30, costMultiplier: 2.0 },
  { minPointsBelow: 31, maxPointsBelow: 40, costMultiplier: 2.5 },
  { minPointsBelow: 41, maxPointsBelow: null, costMultiplier: 3.0 },
];

// Scanner/Probe GDD §2/§3 -- like the rest of this file, the design doc
// documents the *shape* of each value without example numbers, so these
// are originated defaults, not formalized examples.

// §2.2 -- how many unpurchased scanner candidates sit in one planet's
// scanner pool at once, and how often that pool re-rolls -- same pattern
// as SHIPYARD_POOL_SIZE_PER_PLANET/SHIPYARD_POOL_REFRESH_INTERVAL_HOURS
// (and Phase 4's crew pool before it), applied to scanners' own pool
// rather than merged into ShipyardPool (GDD §2.2's explicit call-out).
export const SCANNER_POOL_SIZE_PER_PLANET = 3;
export const SCANNER_POOL_REFRESH_INTERVAL_HOURS = 24;

// §3 -- "scanner acquisition cost curve by tier." Scaled below
// SHIP_PURCHASE_COST_BY_TIER (a whole ship is the bigger investment) but
// above CREW_HIRE_COST_BY_TIER (a scanner is a standalone piece of
// equipment the player keeps indefinitely, not a recurring-wage hire).
export const SCANNER_PURCHASE_COST_BY_TIER: readonly ScannerPurchaseCostByTier[] = [
  { tier: "Grey", cost: 80 },
  { tier: "White", cost: 160 },
  { tier: "Green", cost: 320 },
  { tier: "Blue", cost: 550 },
  { tier: "Purple", cost: 900 },
  { tier: "Orange", cost: 1400 },
  { tier: "Gold", cost: 2200 },
];

// §2.4 -- "base scan radius (with no scanner, or as the floor before tier
// bonus)." Same {x,y} distance units as Planet.position (range +-1000 per
// axis, ~2828 corner-to-corner diagonal, per generateGalaxy.ts's
// POSITION_RANGE) -- chosen as a modest fraction of that space, so a scan
// reveals a meaningful local neighborhood without trivializing discovery
// galaxy-wide even at Gold tier.
export const SCANNER_BASE_SCAN_RADIUS = 120;

// §2.4 -- "scanner tier radius-bonus table... reusing the shape of the
// schematic-tier contribution table (Grey +0 up to Gold's top value)."
// A flat additive bonus on top of SCANNER_BASE_SCAN_RADIUS, strictly
// increasing by tier, Grey = +0 (the floor, not a penalty) -- same
// convention HAZARD_SHIP_TIER_MODIFIER/SHIP_TIER_SPEED_MODIFIER already
// established for a skill/equipment investment axis.
export const SCANNER_TIER_RADIUS_BONUS: readonly ScannerTierRadiusBonus[] = [
  { tier: "Grey", radiusBonus: 0 },
  { tier: "White", radiusBonus: 40 },
  { tier: "Green", radiusBonus: 80 },
  { tier: "Blue", radiusBonus: 130 },
  { tier: "Purple", radiusBonus: 190 },
  { tier: "Orange", radiusBonus: 260 },
  { tier: "Gold", radiusBonus: 350 },
];
