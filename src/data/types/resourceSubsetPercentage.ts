import type { TierColor } from "./tierColor.ts";

export interface ResourceSubsetPercentage {
  tier: TierColor;
  percentage: number; // fraction, e.g. 0.2 for 20%
}
