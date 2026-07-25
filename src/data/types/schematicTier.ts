import type { TierColor } from "./tierColor.ts";

export interface SchematicTierContribution {
  tier: TierColor;
  ceilingRaise: number; // fraction, e.g. 0.06 for +6%
  varianceNarrowing: number; // fraction, e.g. -0.03 for Gold
  penaltyForgiveness: number; // fraction, e.g. 0.35 for 35%
}
