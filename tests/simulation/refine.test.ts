import { test } from "node:test";
import assert from "node:assert/strict";
import { refine, computeBaseAverages } from "../../src/simulation/refine.ts";
import { TIER_VARIANCE } from "../../src/data/constants/tierVariance.ts";
import { REFUND_CHANCE } from "../../src/data/constants/refundChance.ts";
import { igneousOre, autuniteCrystal } from "../fixtures/resources.ts";
import { makeInstance } from "../fixtures/instances.ts";
import { queueRandom } from "../fixtures/random.ts";
import type { TierVariance } from "../../src/data/types/tierVariance.ts";
import type { RefundChance } from "../../src/data/types/refundChance.ts";

// Hardcoded directly from GDD §3.2, independent of TIER_VARIANCE/
// REFUND_CHANCE -- these compare the *actual* constants against literal
// expected values, so a typo in the table itself gets caught (a test that
// destructures its expectations from the same table it's checking can't
// catch that).
const EXPECTED_TIER_VARIANCE: TierVariance[] = [
  { tier: "Grey", negative: -0.1, positive: 0.1 },
  { tier: "White", negative: -0.08, positive: 0.1 },
  { tier: "Green", negative: -0.06, positive: 0.1 },
  { tier: "Blue", negative: -0.045, positive: 0.11 },
  { tier: "Purple", negative: -0.03, positive: 0.12 },
  { tier: "Orange", negative: -0.015, positive: 0.13 },
  { tier: "Gold", negative: -0.005, positive: 0.15 },
];

const EXPECTED_REFUND_CHANCE: RefundChance[] = [
  { tier: "Grey", chance: 0 },
  { tier: "White", chance: 0 },
  { tier: "Green", chance: 0.05 },
  { tier: "Blue", chance: 0.1 },
  { tier: "Purple", chance: 0.15 },
  { tier: "Orange", chance: 0.2 },
  { tier: "Gold", chance: 0.25, secondaryUnitChance: 0.2 },
];

for (const expected of EXPECTED_TIER_VARIANCE) {
  test(`TIER_VARIANCE.${expected.tier} matches the GDD §3.2 table exactly`, () => {
    const actual = TIER_VARIANCE.find((entry) => entry.tier === expected.tier);
    assert.deepEqual(actual, expected);
  });
}

for (const expected of EXPECTED_REFUND_CHANCE) {
  test(`REFUND_CHANCE.${expected.tier} matches the GDD §3.2 table exactly`, () => {
    const actual = REFUND_CHANCE.find((entry) => entry.tier === expected.tier);
    assert.deepEqual(actual, expected);
  });
}

test("computeBaseAverages combines mixed resources via quantity-weighted straight average", () => {
  const ore = makeInstance(igneousOre, 2, {
    purity: 80,
    density: 60,
    potency: 70,
    durability: 50,
    rarity: 40,
  });
  const crystal = makeInstance(autuniteCrystal, 1, {
    purity: null, // Autunite Crystal has no purity
    density: 90,
    potency: 30,
    durability: 70,
    rarity: 60,
  });

  const averages = computeBaseAverages([ore, crystal]);

  // purity: only the ore contributes -- must NOT be zero-padded by the
  // crystal's null (that would wrongly pull it down to 160/3).
  assert.equal(averages.purity, 80);
  assert.equal(averages.density, (60 * 2 + 90 * 1) / 3);
  assert.equal(averages.potency, (70 * 2 + 30 * 1) / 3);
  assert.equal(averages.durability, (50 * 2 + 70 * 1) / 3);
  assert.equal(averages.rarity, (40 * 2 + 60 * 1) / 3);
});

test("computeBaseAverages returns null when a quality is null on every input", () => {
  const crystal = makeInstance(autuniteCrystal, 1, { purity: null, density: 90 });
  const averages = computeBaseAverages([crystal]);
  assert.equal(averages.purity, null);
});

for (const { tier, negative, positive } of EXPECTED_TIER_VARIANCE) {
  test(`refine() applies ${tier} tier's exact variance range`, () => {
    const input = makeInstance(igneousOre, 1, {
      purity: 50,
      density: 50,
      potency: 50,
      durability: 50,
      rarity: 50,
    });

    const atFloor = refine([input], tier, queueRandom([0, 1]));
    const expectedFloor = Math.min(Math.max(Math.round(50 * (1 + negative)), 1), 100);
    assert.equal(atFloor.qualities.purity, expectedFloor);

    const atCeiling = refine([input], tier, queueRandom([1, 1]));
    const expectedCeiling = Math.min(Math.max(Math.round(50 * (1 + positive)), 1), 100);
    assert.equal(atCeiling.qualities.purity, expectedCeiling);
  });
}

test("refine() keys refund chance to the output tier, not the inputs' base tier", () => {
  // base_avg is 90 (Purple, 86-91) on every dimension, but Gold's +15%
  // variance pushes the output to 100 (Gold, 97-100). The refund roll
  // (0.20) is below Gold's 25% chance but above Purple's 15% -- so it only
  // triggers a refund if the implementation correctly used the OUTPUT tier.
  const input = makeInstance(igneousOre, 1, {
    purity: 90,
    density: 90,
    potency: 90,
    durability: 90,
    rarity: 90,
  });

  const result = refine([input], "Gold", queueRandom([1, 0.2, 0.5]));

  assert.equal(result.outputTier, "Gold");
  assert.equal(result.qualities.purity, 100);
  assert.equal(result.refundUnits, 1); // triggered, but no secondary bonus unit (0.5 >= 0.20)
});

test("refine() can award a secondary refund unit at Gold tier", () => {
  const input = makeInstance(igneousOre, 1, {
    purity: 90,
    density: 90,
    potency: 90,
    durability: 90,
    rarity: 90,
  });

  const result = refine([input], "Gold", queueRandom([1, 0.2, 0.1]));

  assert.equal(result.outputTier, "Gold");
  assert.equal(result.refundUnits, 2); // primary refund (0.2 < 0.25) + secondary (0.1 < 0.20)
});

test("refine() never fails and always returns a valid result", () => {
  const ore = makeInstance(igneousOre, 2, {
    purity: 20,
    density: 20,
    potency: 20,
    durability: 20,
    rarity: 20,
  });
  const crystal = makeInstance(autuniteCrystal, 1, {
    density: 30,
    potency: 30,
    durability: 30,
    rarity: 30,
  });

  const result = refine([ore, crystal], "Grey");

  assert.ok(typeof result.qualities.purity === "number");
  assert.ok((result.qualities.purity as number) >= 1 && (result.qualities.purity as number) <= 100);
  assert.notEqual(result.qualities.density, null);
  assert.ok(result.refundUnits >= 0);
});
