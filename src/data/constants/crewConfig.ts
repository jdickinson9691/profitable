import type { CrewHireCostByTier } from "../types/crewHireCost.ts";
import type { CrewWageByTier } from "../types/crewWage.ts";

// Phase 4 GDD §2/§3 -- tunable crew constants. Unlike most of Phase 2/3's
// tunables, the design doc gives no example numbers for these (only the
// elapsed-time cap has a documented example range) -- these are
// originated defaults, not formalized examples, same latitude Agent 14
// used for Phase 3's base prices ("exact numbers are a tunable balance
// decision, not a locked design requirement"). All must still live here,
// the single source every crew formula reads, per GDD §5.3.

// §2.4 -- a player starts with this many crew slots before any purchase.
export const BASE_CREW_CAPACITY = 2;

// §2.4 -- capacity expansion cost curve: the Nth purchased slot costs
// CREW_CAPACITY_EXPANSION_BASE_COST * CREW_CAPACITY_EXPANSION_COST_MULTIPLIER^(N-1),
// so each additional slot costs more than the last (a real "who do I
// keep" tension, not a flat/arbitrary cap per §2.4's own reasoning).
export const CREW_CAPACITY_EXPANSION_BASE_COST = 200;
export const CREW_CAPACITY_EXPANSION_COST_MULTIPLIER = 1.5;

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

// §2.6 -- recurring upkeep wage by tier, paid every WAGE_PAYMENT_INTERVAL_HOURS.
export const CREW_WAGE_BY_TIER: readonly CrewWageByTier[] = [
  { tier: "Grey", wage: 5 },
  { tier: "White", wage: 10 },
  { tier: "Green", wage: 20 },
  { tier: "Blue", wage: 35 },
  { tier: "Purple", wage: 55 },
  { tier: "Orange", wage: 80 },
  { tier: "Gold", wage: 120 },
];

// §2.6 -- how often wages are due.
export const WAGE_PAYMENT_INTERVAL_HOURS = 24;

// §2.7 -- how long upkeep can go unpaid before a crew member departs.
export const UPKEEP_GRACE_PERIOD_HOURS = 48;

// §2.3 -- how many unhired candidates sit in one planet's crew pool at once.
export const CREW_POOL_SIZE_PER_PLANET = 3;

// §2.3 -- how often a planet's crew pool re-rolls its candidates.
export const CREW_POOL_REFRESH_INTERVAL_HOURS = 24;

// §2.1a -- documented example range is "24-48 hours max credited"; using
// the upper bound.
export const ELAPSED_TIME_CAP_HOURS = 48;

// §2.1a / Agent 1's own Must-NOT-Do: the exact background/idle output
// rate (relative to active output for the same crafter) is an explicitly
// open design question, not yet decided -- do not invent a number here.
// Agent 16 must treat this as "not yet available" rather than defaulting
// to some guessed fraction.
export const BACKGROUND_IDLE_OUTPUT_RATE: number | null = null;
