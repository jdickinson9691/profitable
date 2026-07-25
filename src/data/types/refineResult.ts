import type { QualityRoll } from "./quality.ts";
import type { TierColor } from "./tierColor.ts";

export interface RefineResult {
  qualities: QualityRoll;
  // Tier used to key the refund chance table -- the straight-average-then-
  // tier stub (GDD §3.1's documented fallback) applied to the 5 final
  // output values, since refined items display per-quality tiers rather
  // than one aggregate. Exposed so tests can verify refund chance was keyed
  // off this rather than the inputs' tier.
  outputTier: TierColor;
  refundUnits: number;
}
