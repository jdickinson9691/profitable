import type { TierColor } from "./tierColor.ts";

export interface RefundChance {
  tier: TierColor;
  chance: number; // fraction, e.g. 0.25 for 25%
  secondaryUnitChance?: number; // e.g. Gold's ~20% chance of a 2nd refunded unit
}
