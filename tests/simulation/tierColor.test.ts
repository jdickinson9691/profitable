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
