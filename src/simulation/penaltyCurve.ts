import { PENALTY_CURVE } from "../data/constants/penaltyCurve.ts";

// Bug fix (same shape as getTierColor()'s boundary fix, src/simulation/
// tierColor.ts): PENALTY_CURVE's min/max are integers (band {1,10} then
// {11,20}, etc.), but craft() calls this with a non-integer
// `effectivePointsBelow` whenever a schematic's forgiveness is nonzero --
// `worstPointsBelow * (1 - forgiveness)` is only an integer in the
// no-schematic/Grey-schematic case. A value like 10.2 (12 raw points
// below, 15% Blue-schematic forgiveness -- the MVP's own Ion-Forged Hull
// Plate recipe) satisfied neither `<= 10` nor `>= 11` under the old
// `pointsBelow <= max` check and threw, even though it's a real,
// in-range effective value. `pointsBelow < max + 1` closes every gap
// exactly, the same way it did for getTierColor().
//
// Direction matters here, unlike a pure display lookup: rounding a
// fractional value UP into the next (harsher) band would sometimes
// silently defeat the schematic forgiveness that produced the fraction in
// the first place -- e.g. a raw 12-points-below input with 15% forgiveness
// (12 * 0.85 = 10.2) rounded up to 11 would land in the same 11-20 band
// (0.85 multiplier) as an *unforgiven* 12-points-below input, making the
// schematic's forgiveness bonus worth nothing for that input. Rounding
// down instead keeps 10.2 in the 1-10 band (0.95), so forgiveness still
// measurably softens the penalty -- consistent with
// profitable-design-questions.md's own description of the mechanic
// ("softens but never fully erases the penalty"), and directionally the
// same choice getTierColor()'s `value < max + 1` fix already made.
//
// One case needs more than a uniform "extend every band's upper bound"
// rule, though: PENALTY_CURVE[0] ({0,0}, multiplier 1.0) is a zero-width
// band representing "no violation at all," not a range to extend the same
// way as the others. `worstPointsBelow` is only ever exactly 0 as an
// integer (Math.max(threshold - value, 0)), so forgiveness scaling
// (0 * anything = 0) can never itself produce a small positive fraction
// like 0.95 from *that* band -- but it very much can from a genuine
// 1-point violation (the mildest real violation there is): White's 5%
// forgiveness turns 1 point under into 0.95. If {0,0}'s upper bound were
// extended the same way as every other band (`pointsBelow < 1`), that 0.95
// -- a real violation -- would incorrectly match "no violation," handing
// out zero penalty and directly contradicting the "never fully erases the
// penalty" rule this function's tests already lock in. So {0,0} keeps its
// original tight, exact check, and the band immediately after it extends
// its *lower* bound down to meet it (`pointsBelow > previousBand.max`)
// instead -- absorbing the gap from the low side rather than the high
// side. Every other adjacent pair only needs the high-side extension,
// since both sides of those gaps are already "some violation" bands.
export function getPenaltyMultiplier(pointsBelow: number): number {
  const band = PENALTY_CURVE.find((entry, index) => {
    if (index === 0) {
      return pointsBelow <= entry.maxPointsBelow!;
    }
    const previousBand = PENALTY_CURVE[index - 1]!;
    return (
      pointsBelow > previousBand.maxPointsBelow! &&
      (entry.maxPointsBelow === null || pointsBelow < entry.maxPointsBelow + 1)
    );
  });
  if (!band || band.multiplier === null) {
    throw new RangeError(
      `no penalty multiplier for ${pointsBelow} points below threshold (should have been rejected)`,
    );
  }
  return band.multiplier;
}
