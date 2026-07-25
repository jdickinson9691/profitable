import { PENALTY_CURVE } from "../data/constants/penaltyCurve.ts";

export function getPenaltyMultiplier(pointsBelow: number): number {
  const band = PENALTY_CURVE.find(
    (entry) =>
      pointsBelow >= entry.minPointsBelow &&
      (entry.maxPointsBelow === null || pointsBelow <= entry.maxPointsBelow),
  );
  if (!band || band.multiplier === null) {
    throw new RangeError(
      `no penalty multiplier for ${pointsBelow} points below threshold (should have been rejected)`,
    );
  }
  return band.multiplier;
}
