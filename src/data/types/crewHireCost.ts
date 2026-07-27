import type { TierColor } from "./tierColor.ts";

// Phase 4 GDD §2.3 -- one-time hire cost by tier, reusing the same
// "higher tier = more valuable/harder to get" shape used everywhere else.
export interface CrewHireCostByTier {
  tier: TierColor;
  cost: number;
}
