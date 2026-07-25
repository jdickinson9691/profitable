import type { TierColor } from "../data/types/tierColor.ts";
import { TIER_COLOR_BREAKPOINTS } from "../data/constants/tierColor.ts";

export function getTierColor(value: number): TierColor {
  const breakpoint = TIER_COLOR_BREAKPOINTS.find(
    ({ min, max }) => value >= min && value <= max,
  );
  if (!breakpoint) {
    throw new RangeError(`quality value ${value} is outside the 1-100 tier range`);
  }
  return breakpoint.tier;
}
