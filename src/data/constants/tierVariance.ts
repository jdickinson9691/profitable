import type { TierVariance } from "../types/tierVariance.ts";

// GDD §3.2 — shared refiner/crafter tier variance table.
export const TIER_VARIANCE: readonly TierVariance[] = [
  { tier: "Grey", negative: -0.1, positive: 0.1 },
  { tier: "White", negative: -0.08, positive: 0.1 },
  { tier: "Green", negative: -0.06, positive: 0.1 },
  { tier: "Blue", negative: -0.045, positive: 0.11 },
  { tier: "Purple", negative: -0.03, positive: 0.12 },
  { tier: "Orange", negative: -0.015, positive: 0.13 },
  { tier: "Gold", negative: -0.005, positive: 0.15 },
];
