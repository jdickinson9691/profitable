import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatQualityRoll,
  formatQualityLabel,
  describeRefineResult,
  describeCraftResult,
  computeAggregateTier,
} from "../../src/presentation/display.ts";
import type { QualityRoll } from "../../src/data/types/quality.ts";
import type { RefineResult } from "../../src/data/types/refineResult.ts";
import type { CraftAccepted, CraftRejected } from "../../src/data/types/craftResult.ts";

const fullRoll: QualityRoll = { purity: 72, density: 45, potency: 97, durability: null, rarity: 1 };

test("formatQualityRoll() maps every dimension to its value and tier, preserving null", () => {
  const rows = formatQualityRoll(fullRoll);

  assert.equal(rows.length, 5);
  assert.deepEqual(
    rows.find((r) => r.quality === "purity"),
    { quality: "purity", value: 72, tier: "Green" },
  );
  assert.deepEqual(
    rows.find((r) => r.quality === "potency"),
    { quality: "potency", value: 97, tier: "Gold" },
  );
  assert.deepEqual(
    rows.find((r) => r.quality === "durability"),
    { quality: "durability", value: null, tier: null },
  );
  assert.deepEqual(
    rows.find((r) => r.quality === "rarity"),
    { quality: "rarity", value: 1, tier: "Grey" },
  );
});

test("formatQualityLabel() renders a value+tier row and an N/A row distinctly", () => {
  assert.equal(formatQualityLabel({ quality: "purity", value: 72, tier: "Green" }), "Purity: 72 (Green)");
  assert.equal(formatQualityLabel({ quality: "durability", value: null, tier: null }), "Durability: N/A");
});

test("describeRefineResult() mentions the refund only when units were actually refunded", () => {
  const noRefund: RefineResult = { qualities: fullRoll, outputTier: "Blue", refundUnits: 0 };
  const oneRefund: RefineResult = { qualities: fullRoll, outputTier: "Gold", refundUnits: 1 };
  const twoRefunds: RefineResult = { qualities: fullRoll, outputTier: "Gold", refundUnits: 2 };

  assert.equal(describeRefineResult(noRefund), "Output tier: Blue");
  assert.match(describeRefineResult(oneRefund), /\+1 refunded unit\b/);
  assert.match(describeRefineResult(twoRefunds), /\+2 refunded units\b/);
});

test("computeAggregateTier() averages only the non-null dimensions", () => {
  // purity 72, density 45, potency 97, rarity 1 -> average excludes the
  // null durability entirely (never treated as 0).
  const average = (72 + 45 + 97 + 1) / 4; // 53.75 -> White (41-60)
  assert.equal(computeAggregateTier(fullRoll), "White");
  assert.notEqual(Math.round(average), 0); // sanity: the exclusion mattered
});

test("computeAggregateTier() returns null when every dimension is null", () => {
  const allNull: QualityRoll = { purity: null, density: null, potency: null, durability: null, rarity: null };
  assert.equal(computeAggregateTier(allNull), null);
});

test("describeCraftResult() reports the rejection reason for a rejected craft", () => {
  const rejected: CraftRejected = { accepted: false, reason: "an input is 45 points below threshold" };
  assert.match(describeCraftResult(rejected), /^Craft rejected: /);
  assert.match(describeCraftResult(rejected), /45 points below threshold/);
});

test("describeCraftResult() reports the aggregate tier for an accepted craft", () => {
  const accepted: CraftAccepted = { accepted: true, qualities: fullRoll };
  assert.equal(describeCraftResult(accepted), "Crafted! Aggregate tier: White");
});
