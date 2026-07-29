import type { TierColor } from "../data/types/tierColor.ts";
import { TIER_COLOR_BREAKPOINTS } from "../data/constants/tierColor.ts";

// Bug fix (alpha content spot-check, tests/content/alphaContentSpotCheck.test.ts):
// TIER_COLOR_BREAKPOINTS' min/max are integers (Blue max=85, Purple
// min=86, etc.), but getTierColor() is also called with non-integer
// averages -- refine()'s outputTier and computeAggregateTier() both
// average 5 already-rounded-to-integer qualities, and that average is
// only an integer 1 time in 5. A value like 85.2 satisfied neither
// `<= 85` nor `>= 86` under the old `value <= max` check and threw, even
// though it's squarely a real, in-range quality value -- reproducible on
// any crafted item whose 5 qualities happen to average into one of the
// six integer gaps (40/41, 60/61, 75/76, 85/86, 91/92, 96/97), which is
// most averages, not an edge case. `value < max + 1` closes every gap
// exactly, since each tier's `max + 1` equals the next tier's `min` --
// and still correctly includes Gold's ceiling (100 < 101).
export function getTierColor(value: number): TierColor {
  const breakpoint = TIER_COLOR_BREAKPOINTS.find(
    ({ min, max }) => value >= min && value < max + 1,
  );
  if (!breakpoint) {
    throw new RangeError(`quality value ${value} is outside the 1-100 tier range`);
  }
  return breakpoint.tier;
}
