import type { TierColor } from "./tierColor.ts";

export interface TierVariance {
  tier: TierColor;
  negative: number; // fraction, e.g. -0.10 for -10%
  positive: number; // fraction, e.g. +0.10 for +10%
}
