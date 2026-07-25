import type { TierColor } from "../data/types/tierColor.ts";
import type { TierVariance } from "../data/types/tierVariance.ts";
import { TIER_VARIANCE } from "../data/constants/tierVariance.ts";

export function getTierVariance(tier: TierColor): TierVariance {
  const variance = TIER_VARIANCE.find((entry) => entry.tier === tier);
  if (!variance) {
    throw new RangeError(`no variance table entry for tier ${tier}`);
  }
  return variance;
}
