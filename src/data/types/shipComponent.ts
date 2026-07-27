import type { ComponentCategory } from "./componentCategory.ts";
import type { QualityRoll } from "./quality.ts";
import type { TierColor } from "./tierColor.ts";

// Phase 5 GDD §2.1/§2.2/§2.5 -- a crafted ship component. Carries the same
// 5-quality data as every other crafted item (no separate stat system);
// `tier` is derived from those qualities via the existing straight-
// average-to-tier aggregation (src/simulation/aggregateTier.ts), same
// formula already used for crafted-item display tier and Listing.marketTier.
export interface ShipComponent {
  id: string;
  category: ComponentCategory;
  qualities: QualityRoll;
  tier: TierColor;
}
