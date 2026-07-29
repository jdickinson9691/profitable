import { test } from "node:test";
import assert from "node:assert/strict";
import { getTierColor } from "../../src/simulation/tierColor.ts";
import type { TierColor } from "../../src/data/types/tierColor.ts";

const boundaryCases: Array<[number, TierColor]> = [
  [1, "Grey"],
  [40, "Grey"],
  [41, "White"],
  [60, "White"],
  [61, "Green"],
  [75, "Green"],
  [76, "Blue"],
  [85, "Blue"],
  [86, "Purple"],
  [91, "Purple"],
  [92, "Orange"],
  [96, "Orange"],
  [97, "Gold"],
  [100, "Gold"],
];

for (const [value, expected] of boundaryCases) {
  test(`getTierColor(${value}) === ${expected}`, () => {
    assert.equal(getTierColor(value), expected);
  });
}

test("getTierColor rejects values outside 1-100", () => {
  assert.throws(() => getTierColor(0));
  assert.throws(() => getTierColor(101));
});

// Regression (found by tests/content/alphaContentSpotCheck.test.ts's Ion
// Beam Array craft: real qualities [83, 83, 94, 83, 83] average to 85.2,
// which used to throw). computeAggregateTier()/refine()'s outputTier both
// call getTierColor() with a non-integer average of 5 already-rounded
// integers -- only 1 in 5 possible averages is itself an integer, so a
// fractional value landing in one of the six gaps between adjacent
// integer breakpoints (40/41, 60/61, 75/76, 85/86, 91/92, 96/97) is common,
// not a rare edge case.
const fractionalGapCases: Array<[number, TierColor]> = [
  [40.5, "Grey"],
  [60.5, "White"],
  [75.5, "Green"],
  [85.2, "Blue"],
  [91.9, "Purple"],
  [96.1, "Orange"],
  [99.99, "Gold"],
];

for (const [value, expected] of fractionalGapCases) {
  test(`getTierColor(${value}) === ${expected} (fractional value in a former integer-boundary gap)`, () => {
    assert.equal(getTierColor(value), expected);
  });
}
