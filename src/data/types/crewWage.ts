import type { TierColor } from "./tierColor.ts";

// Phase 4 GDD §2.6 -- recurring upkeep wage by tier, paid at
// WAGE_PAYMENT_INTERVAL_HOURS. Same tier-scaling shape as hire cost
// (crewHireCost.ts), kept as a separate table since they're conceptually
// distinct amounts (one-time vs. recurring), matching this project's
// existing convention of not merging similarly-shaped but distinct tables.
export interface CrewWageByTier {
  tier: TierColor;
  wage: number;
}
