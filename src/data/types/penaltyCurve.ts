export interface PenaltyBand {
  minPointsBelow: number;
  maxPointsBelow: number | null; // null = unbounded (the 41+ band)
  multiplier: number | null; // null = reject, craft cannot proceed
}
