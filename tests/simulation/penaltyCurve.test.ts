import { test } from "node:test";
import assert from "node:assert/strict";
import { getPenaltyMultiplier } from "../../src/simulation/penaltyCurve.ts";

// Same shape as tests/simulation/tierColor.test.ts's boundaryCases --
// every documented integer boundary from GDD §3.3's penalty curve table.
const boundaryCases: Array<[number, number]> = [
  [0, 1.0],
  [1, 0.95],
  [10, 0.95],
  [11, 0.85],
  [20, 0.85],
  [21, 0.7],
  [30, 0.7],
  [31, 0.5],
  [40, 0.5],
];

for (const [pointsBelow, expected] of boundaryCases) {
  test(`getPenaltyMultiplier(${pointsBelow}) === ${expected}`, () => {
    assert.equal(getPenaltyMultiplier(pointsBelow), expected);
  });
}

test("getPenaltyMultiplier rejects 41+ points below", () => {
  assert.throws(() => getPenaltyMultiplier(41));
});

// Regression: craft()'s `effectivePointsBelow = worstPointsBelow * (1 -
// schematic.penaltyForgiveness)` produces a non-integer value whenever a
// schematic's forgiveness is nonzero (i.e. every schematic tier except
// Grey) -- PENALTY_CURVE's bands are defined on integers, so a fractional
// value landing in one of the four gap zones just above 0, 10, 20, or 30
// used to satisfy neither band's comparison and throw `RangeError`, even
// though it's a real, in-range effective value. Reproduces the real
// crash: crafting the MVP's own Ion-Forged Hull Plate recipe (Blue
// schematic, 15% forgiveness) with an input 12 points below threshold --
// 12 * 0.85 = 10.2, previously uncaught.
//
// A fresh quantification across all 7 schematic tiers x every integer
// points-below value 1-40 (280 combinations) found 23 that land in one of
// the four gap zones and would have crashed pre-fix -- every non-Grey
// tier crashes at 1 point below threshold specifically, the mildest
// possible violation, not a deep edge case. Cases below cover all four
// gap zones plus the real-world crash reproduction; expected values
// independently verified against src/simulation/penaltyCurve.ts's actual
// (corrected) band logic, not just hand-guessed.
const fractionalGapCases: Array<[number, number, string]> = [
  [1 * (1 - 0.15), 0.95, "Blue, 1 point below (0.85) -- gap just above 0"],
  [12 * (1 - 0.15), 0.95, "Blue, 12 points below (10.2) -- the exact real-world crash case"],
  [11 * (1 - 0.05), 0.95, "White, 11 points below (10.45) -- gap just above 10"],
  [22 * (1 - 0.1), 0.85, "Green, 22 points below (20.7) -- gap just above 20"],
  [32 * (1 - 0.05), 0.7, "White, 32 points below (30.4) -- gap just above 30"],
  [31 * (1 - 0.35), 0.85, "Gold, 31 points below (20.15) -- gap just above 20, deepest forgiveness"],
];

for (const [effectivePointsBelow, expected, label] of fractionalGapCases) {
  test(`getPenaltyMultiplier(${effectivePointsBelow.toFixed(2)}) === ${expected} (${label})`, () => {
    assert.equal(getPenaltyMultiplier(effectivePointsBelow), expected);
  });
}

// The {0,0} band needed different handling from the other three gaps (see
// penaltyCurve.ts's own comment): every one of these is a genuine,
// nonzero violation reduced by forgiveness down to just under 1 -- none
// of them may resolve to 1.0 (no penalty), which a naive uniform "extend
// every band's upper bound" fix would have produced.
const nearZeroForgivenessCases: Array<[number, string]> = [
  [1 * (1 - 0.05), "White"],
  [1 * (1 - 0.1), "Green"],
  [1 * (1 - 0.15), "Blue"],
  [1 * (1 - 0.2), "Purple"],
  [1 * (1 - 0.25), "Orange"],
  [1 * (1 - 0.35), "Gold"],
];

for (const [effectivePointsBelow, tier] of nearZeroForgivenessCases) {
  test(`getPenaltyMultiplier(${effectivePointsBelow.toFixed(2)}) is still a real penalty, not 1.0 (${tier}, 1 point below threshold)`, () => {
    const multiplier = getPenaltyMultiplier(effectivePointsBelow);
    assert.equal(multiplier, 0.95);
    assert.notEqual(multiplier, 1.0, "forgiveness must never fully erase a real violation, however mild");
  });
}
