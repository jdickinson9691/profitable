import type { TierColor } from "./tierColor.ts";

// Phase 5 GDD §2.2 -- one-time purchase cost by (derived) ship tier,
// same "better = more valuable/harder to get" pattern already used for
// NPC crew hire cost (crewHireCost.ts).
export interface ShipPurchaseCostByTier {
  tier: TierColor;
  cost: number;
}
