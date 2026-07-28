// Travel Encounters (Non-Combat) GDD §2.6 -- "a scaled currency cost using
// the same escalating curve shape as the crafting threshold penalty."
// Mirrors PenaltyBand's exact band-boundary shape (minPointsBelow/
// maxPointsBelow, null = unbounded), but there is no "reject" band here --
// a hazard failure always resolves to some cost, so costMultiplier is
// never null the way PenaltyBand.multiplier can be. Only failure bands are
// represented (a passed roll has 0 points below threshold, which never
// reaches this table at all).
export interface HazardFailureCostBand {
  minPointsBelow: number;
  maxPointsBelow: number | null; // null = unbounded (the worst band)
  costMultiplier: number;
}
