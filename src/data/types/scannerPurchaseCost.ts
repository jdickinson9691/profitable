import type { TierColor } from "./tierColor.ts";

// Scanner/Probe GDD §3 -- "scanner acquisition cost curve by tier," same
// "higher tier = more valuable/harder to get" shape as
// CrewHireCostByTier/ShipPurchaseCostByTier.
export interface ScannerPurchaseCostByTier {
  tier: TierColor;
  cost: number;
}
