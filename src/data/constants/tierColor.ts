import type { TierColor } from "../types/tierColor.ts";

export interface TierColorBreakpoint {
  tier: TierColor;
  min: number;
  max: number;
}

// GDD §3.1 — 7-tier color scale over the 1-100 quality range.
export const TIER_COLOR_BREAKPOINTS: readonly TierColorBreakpoint[] = [
  { tier: "Grey", min: 1, max: 40 },
  { tier: "White", min: 41, max: 60 },
  { tier: "Green", min: 61, max: 75 },
  { tier: "Blue", min: 76, max: 85 },
  { tier: "Purple", min: 86, max: 91 },
  { tier: "Orange", min: 92, max: 96 },
  { tier: "Gold", min: 97, max: 100 },
];
