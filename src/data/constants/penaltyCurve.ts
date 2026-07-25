import type { PenaltyBand } from "../types/penaltyCurve.ts";

// GDD §3.3 — threshold penalty curve (escalating, hard floor at 41+).
export const PENALTY_CURVE: readonly PenaltyBand[] = [
  { minPointsBelow: 0, maxPointsBelow: 0, multiplier: 1.0 },
  { minPointsBelow: 1, maxPointsBelow: 10, multiplier: 0.95 },
  { minPointsBelow: 11, maxPointsBelow: 20, multiplier: 0.85 },
  { minPointsBelow: 21, maxPointsBelow: 30, multiplier: 0.7 },
  { minPointsBelow: 31, maxPointsBelow: 40, multiplier: 0.5 },
  { minPointsBelow: 41, maxPointsBelow: null, multiplier: null },
];
