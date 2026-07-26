import type { TierColor } from "./tierColor.ts";

export interface PlanetTierModifier {
  tier: TierColor;
  qualityRollModifier: number;
}
