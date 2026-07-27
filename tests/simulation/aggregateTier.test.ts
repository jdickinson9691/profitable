import { test } from "node:test";
import assert from "node:assert/strict";
import { computeAggregateTier } from "../../src/simulation/aggregateTier.ts";
import type { QualityRoll } from "../../src/data/types/quality.ts";

// Moved here from src/presentation/display.ts for Phase 3 (see
// aggregateTier.ts's own comment) -- tests/presentation/display.test.ts
// still covers this via display.ts's re-export, so this is a light direct
// check at the layer that now actually owns the formula.

test("computeAggregateTier() averages only the non-null dimensions", () => {
  const roll: QualityRoll = { purity: 72, density: 45, potency: 97, durability: null, rarity: 1 };
  assert.equal(computeAggregateTier(roll), "White"); // (72+45+97+1)/4 = 53.75
});

test("computeAggregateTier() returns null when every dimension is null", () => {
  const allNull: QualityRoll = { purity: null, density: null, potency: null, durability: null, rarity: null };
  assert.equal(computeAggregateTier(allNull), null);
});
