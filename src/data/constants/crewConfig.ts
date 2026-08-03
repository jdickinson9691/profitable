import type { CrewHireCostByTier } from "../types/crewHireCost.ts";
import type { CrewWageByTier } from "../types/crewWage.ts";

// Phase 4 GDD §2/§3 -- tunable crew constants. Unlike most of Phase 2/3's
// tunables, the design doc gives no example numbers for these (only the
// elapsed-time cap has a documented example range) -- these are
// originated defaults, not formalized examples, same latitude Agent 14
// used for Phase 3's base prices ("exact numbers are a tunable balance
// decision, not a locked design requirement"). All must still live here,
// the single source every crew formula reads, per GDD §5.3.

// Alpha Section 4 debug/tuning panel: balance-tunable values below are
// `let` (scalars) or a mutable array whose entries are re-written in place
// (tables), each with a setter -- see tradingConfig.ts's own comment for
// the full rationale. No formula/logic here changes.

// §2.4 -- a player starts with this many crew slots before any purchase.
export let BASE_CREW_CAPACITY = 2;
export function setBaseCrewCapacity(value: number): void {
  BASE_CREW_CAPACITY = value;
}

// §2.4 -- capacity expansion cost curve: the Nth purchased slot costs
// CREW_CAPACITY_EXPANSION_BASE_COST * CREW_CAPACITY_EXPANSION_COST_MULTIPLIER^(N-1),
// so each additional slot costs more than the last (a real "who do I
// keep" tension, not a flat/arbitrary cap per §2.4's own reasoning).
// Alpha starting values (docs/profitable-alpha-tuning-values.md, locked
// 2026-07-29): base 500, doubling per slot -- slot 3: 500, slot 4: 1,000,
// slot 5: 2,000, slot 6: 4,000. Supersedes this constant's original
// originated-default values (200 / 1.5x).
export let CREW_CAPACITY_EXPANSION_BASE_COST = 500;
export function setCrewCapacityExpansionBaseCost(value: number): void {
  CREW_CAPACITY_EXPANSION_BASE_COST = value;
}
export let CREW_CAPACITY_EXPANSION_COST_MULTIPLIER = 2.0;
export function setCrewCapacityExpansionCostMultiplier(value: number): void {
  CREW_CAPACITY_EXPANSION_COST_MULTIPLIER = value;
}

// §2.3 -- one-time hire cost by tier ("better = more valuable/harder to
// get," same pattern as every other tier system).
export const CREW_HIRE_COST_BY_TIER: readonly CrewHireCostByTier[] = [
  { tier: "Grey", cost: 50 },
  { tier: "White", cost: 100 },
  { tier: "Green", cost: 200 },
  { tier: "Blue", cost: 350 },
  { tier: "Purple", cost: 550 },
  { tier: "Orange", cost: 800 },
  { tier: "Gold", cost: 1200 },
];
export function setCrewHireCostForTier(tier: CrewHireCostByTier["tier"], cost: number): void {
  const entry = CREW_HIRE_COST_BY_TIER.find((e) => e.tier === tier);
  if (entry) entry.cost = cost;
}

// §2.6 -- recurring upkeep wage by tier, paid every WAGE_PAYMENT_INTERVAL_HOURS.
// Alpha starting values (docs/profitable-alpha-tuning-values.md, locked
// 2026-07-29): doubling per tier throughout, for consistency with the
// doubling pattern used elsewhere (capacity/scanner cost curves).
// Supersedes this table's original originated-default Blue-Gold rows
// (35/55/80/120), which used a gentler, non-doubling curve.
export const CREW_WAGE_BY_TIER: readonly CrewWageByTier[] = [
  { tier: "Grey", wage: 5 },
  { tier: "White", wage: 10 },
  { tier: "Green", wage: 20 },
  { tier: "Blue", wage: 40 },
  { tier: "Purple", wage: 80 },
  { tier: "Orange", wage: 160 },
  { tier: "Gold", wage: 320 },
];
export function setCrewWageForTier(tier: CrewWageByTier["tier"], wage: number): void {
  const entry = CREW_WAGE_BY_TIER.find((e) => e.tier === tier);
  if (entry) entry.wage = wage;
}

// §2.6 -- how often wages are due.
export let WAGE_PAYMENT_INTERVAL_HOURS = 24;
export function setWagePaymentIntervalHours(value: number): void {
  WAGE_PAYMENT_INTERVAL_HOURS = value;
}

// §2.7 -- how long upkeep can go unpaid before a crew member departs.
export let UPKEEP_GRACE_PERIOD_HOURS = 48;
export function setUpkeepGracePeriodHours(value: number): void {
  UPKEEP_GRACE_PERIOD_HOURS = value;
}

// §2.3 -- how many unhired candidates sit in one planet's crew pool at once.
export let CREW_POOL_SIZE_PER_PLANET = 3;
export function setCrewPoolSizePerPlanet(value: number): void {
  CREW_POOL_SIZE_PER_PLANET = value;
}

// §2.3 -- how often a planet's crew pool re-rolls its candidates.
export let CREW_POOL_REFRESH_INTERVAL_HOURS = 24;
export function setCrewPoolRefreshIntervalHours(value: number): void {
  CREW_POOL_REFRESH_INTERVAL_HOURS = value;
}

// §2.1a -- documented example range is "24-48 hours max credited"; using
// the upper bound.
export let ELAPSED_TIME_CAP_HOURS = 48;
export function setElapsedTimeCapHours(value: number): void {
  ELAPSED_TIME_CAP_HOURS = value;
}

// §2.1a -- resolved (profitable-design-questions.md's Crew Crafters
// section: "Background/idle crafting rate: flat 50%, not tier-scaled...
// half the rate/yield they would if actively assigned"). Honest
// translation note: active crafting has no continuous per-hour
// throughput of its own to literally halve -- craft() is a single
// player/crew-triggered action, never time-gated, so there is no
// existing "active units/hour" figure anywhere in this codebase to
// derive 50% *of*. 0.5 units/hour is the concrete number that decision
// resolves to: at ELAPSED_TIME_CAP_HOURS (48h), a fully-idle crew member
// completes 24 units -- a real, noticeable trickle (per the design
// entry's own "real, noticeable penalty... without making idle crafting
// pointless" framing) without approaching what an attentive player could
// produce by actively re-triggering craft() themselves. Flat across every
// tier and recipe, matching the decision's own "not tier-scaled" (tier
// still affects output *quality* via craft()'s existing variance table,
// never this rate) -- and, by the same reasoning, not recipe-scaled
// either, since the design entry draws no such distinction.
export let BACKGROUND_IDLE_OUTPUT_RATE: number | null = 0.5;
export function setBackgroundIdleOutputRate(value: number | null): void {
  BACKGROUND_IDLE_OUTPUT_RATE = value;
}

// Alpha content roster (docs/profitable-alpha-content-roster.md §6) --
// closes the tier 6-7 profession taxonomy that profession.ts's own
// comment left as an explicitly open design question. Mapped one-to-one
// to the 4 ship component categories plus general (non-component) tier
// 6-7 crafted goods, replacing refreshCrewPool.ts's placeholder
// "unspecified-profession-N" identifiers.
export const TIER_6_7_PROFESSIONS: readonly string[] = [
  "Weaponsmith",
  "Engineer",
  "Shield Technician",
  "Cargo Specialist",
  "Artisan",
];
