import { test } from "node:test";
import assert from "node:assert/strict";
import { craft } from "../../src/simulation/craft.ts";
import { getPenaltyMultiplier } from "../../src/simulation/penaltyCurve.ts";
import { SCHEMATIC_TIER_CONTRIBUTION } from "../../src/data/constants/schematicTier.ts";
import { igneousOre, hydrogenGas, radiantAlloyBar } from "../fixtures/resources.ts";
import { makeInstance } from "../fixtures/instances.ts";
import { queueRandom } from "../fixtures/random.ts";
import { ionForgedHullPlateRecipe } from "../fixtures/recipes.ts";
import type { Recipe } from "../../src/data/types/recipe.ts";
import type { CraftAccepted } from "../../src/data/types/craftResult.ts";
import type { SchematicTierContribution } from "../../src/data/types/schematicTier.ts";

// Hardcoded directly from GDD §3.3, independent of SCHEMATIC_TIER_CONTRIBUTION
// -- compares the actual constant against literal expected values so a typo
// in the table itself gets caught.
const EXPECTED_SCHEMATIC_TIER_CONTRIBUTION: SchematicTierContribution[] = [
  { tier: "Grey", ceilingRaise: 0, varianceNarrowing: 0, penaltyForgiveness: 0 },
  { tier: "White", ceilingRaise: 0.01, varianceNarrowing: -0.005, penaltyForgiveness: 0.05 },
  { tier: "Green", ceilingRaise: 0.02, varianceNarrowing: -0.01, penaltyForgiveness: 0.1 },
  { tier: "Blue", ceilingRaise: 0.03, varianceNarrowing: -0.015, penaltyForgiveness: 0.15 },
  { tier: "Purple", ceilingRaise: 0.04, varianceNarrowing: -0.02, penaltyForgiveness: 0.2 },
  { tier: "Orange", ceilingRaise: 0.05, varianceNarrowing: -0.025, penaltyForgiveness: 0.25 },
  { tier: "Gold", ceilingRaise: 0.06, varianceNarrowing: -0.03, penaltyForgiveness: 0.35 },
];

for (const expected of EXPECTED_SCHEMATIC_TIER_CONTRIBUTION) {
  test(`SCHEMATIC_TIER_CONTRIBUTION.${expected.tier} matches the GDD §3.3 table exactly`, () => {
    const actual = SCHEMATIC_TIER_CONTRIBUTION.find((entry) => entry.tier === expected.tier);
    assert.deepEqual(actual, expected);
  });
}

const noThresholdRecipe: Recipe = {
  id: "test-no-threshold",
  name: "Test (no threshold)",
  inputs: [{ category: "any", quantity: 1 }],
  outputResourceId: "test-output",
  outputQuantity: 1,
};

test("craft() caps the combined ceiling raise at +18%, not the raw +21% sum", () => {
  const input = makeInstance(igneousOre, 1, {
    purity: 70,
    density: 70,
    potency: 70,
    durability: 70,
    rarity: 70,
  });

  // Gold crafter (+15%) + Gold schematic (+6%) would sum to +21%; capped at
  // +18%. Gold's downside also narrows to exactly 0 (crafter -0.5% widened
  // toward zero by schematic's -3% narrowing), so this is fully
  // deterministic regardless of the random draw.
  const result = craft([input], noThresholdRecipe, "Gold", "Gold") as CraftAccepted;

  assert.equal(result.accepted, true);
  assert.equal(result.qualities.purity, Math.round(70 * 1.18));
  assert.notEqual(result.qualities.purity, Math.round(70 * 1.21));
});

test("getPenaltyMultiplier matches the documented curve exactly, including the 41+ floor", () => {
  assert.equal(getPenaltyMultiplier(0), 1.0);
  assert.equal(getPenaltyMultiplier(1), 0.95);
  assert.equal(getPenaltyMultiplier(10), 0.95);
  assert.equal(getPenaltyMultiplier(11), 0.85);
  assert.equal(getPenaltyMultiplier(20), 0.85);
  assert.equal(getPenaltyMultiplier(21), 0.7);
  assert.equal(getPenaltyMultiplier(30), 0.7);
  assert.equal(getPenaltyMultiplier(31), 0.5);
  assert.equal(getPenaltyMultiplier(40), 0.5);
  assert.throws(() => getPenaltyMultiplier(41));
});

test("craft() rejects when an input is 41+ points below its recipe threshold", () => {
  const input = makeInstance(radiantAlloyBar, 1, {
    purity: 70,
    density: 70,
    potency: 70,
    durability: 19, // 60 - 19 = 41 points below threshold
    rarity: 70,
  });
  const gas = makeInstance(hydrogenGas, 1, { purity: 70, density: 70, potency: 70, rarity: 70 });

  const result = craft([input, gas], ionForgedHullPlateRecipe, "Grey", "Grey");

  assert.equal(result.accepted, false);
});

test("schematic forgiveness reduces effective points-below-threshold but never fully cancels the penalty", () => {
  // A Gold schematic's 35% forgiveness turns 25 raw points under into an
  // effective 16.25 -- crossing from the 21-30 band (0.70) into the 11-20
  // band (0.85). Without forgiveness (Grey), the same 25 points stays in
  // the 21-30 band.
  const withoutForgiveness = getPenaltyMultiplier(25 * (1 - 0));
  const withGoldForgiveness = getPenaltyMultiplier(25 * (1 - 0.35));
  assert.equal(withoutForgiveness, 0.7);
  assert.equal(withGoldForgiveness, 0.85);

  // Even at Gold's max forgiveness, a nonzero raw violation still incurs
  // some penalty -- softened, never bypassed.
  const smallViolationForgiven = getPenaltyMultiplier(10 * (1 - 0.35));
  assert.equal(smallViolationForgiven, 0.95);
  assert.notEqual(smallViolationForgiven, 1.0);
});

test("craft() applies the threshold penalty AFTER the ceiling raise and variance roll", () => {
  // base_avg = 50 uniformly. Gold+Gold: ceiling capped at +18% -> raised
  // ceiling = 59 exactly, and the roll is deterministically 0 (Gold's
  // downside narrows to 0), so preThreshold = 59 for every dimension
  // regardless of the random draw.
  const input = makeInstance(igneousOre, 1, {
    purity: 50,
    density: 50,
    potency: 50,
    durability: 50,
    rarity: 50,
  });
  const recipe: Recipe = {
    id: "test-order",
    name: "Test (order of operations)",
    // durability 50 is 20 points below a threshold of 70.
    inputs: [{ category: "any", quantity: 1, thresholdQuality: "durability", thresholdValue: 70 }],
    outputResourceId: "test-output",
    outputQuantity: 1,
  };

  const result = craft([input], recipe, "Gold", "Gold") as CraftAccepted;

  // Correct order: round(59 * 0.85) = 50. Penalty-before-ceiling would
  // instead give round(round(50 * 0.85) * 1.18) = round(43 * 1.18) = 51.
  assert.equal(result.accepted, true);
  assert.equal(result.qualities.purity, 50);
  assert.notEqual(result.qualities.purity, 51);
});

test("craft() excludes a null/N/A quality from the threshold check entirely", () => {
  const gas = makeInstance(hydrogenGas, 1, { purity: 50, density: 50, potency: 50, rarity: 50 });
  const recipe: Recipe = {
    id: "test-null-threshold",
    name: "Test (null threshold)",
    // Hydrogen Gas has no durability -- this must be excluded, not treated
    // as a catastrophic (0 - 999) violation.
    inputs: [{ category: "gas", quantity: 1, thresholdQuality: "durability", thresholdValue: 999 }],
    outputResourceId: "test-output",
    outputQuantity: 1,
  };

  const result = craft([gas], recipe, "Grey", "Grey") as CraftAccepted;

  assert.equal(result.accepted, true);
  assert.equal(result.qualities.durability, null);
});

test("craft() runs the MVP recipe end-to-end matching a hand-calculated value", () => {
  const alloyBar = makeInstance(radiantAlloyBar, 1, {
    purity: 70,
    density: 70,
    potency: 70,
    durability: 70,
    rarity: 70,
  });
  const gas = makeInstance(hydrogenGas, 1, { purity: 70, density: 70, potency: 70, rarity: 70 });

  // base_avg = 70 on every dimension (durability comes solely from the
  // alloy bar, since Hydrogen Gas has none -- still 70). Green crafter
  // (+10%) + Blue schematic (+3%) = +13% ceiling -> raisedCeiling = 79.1.
  // random() = 1 forces the roll to exactly 0 (no downside applied).
  // Durability 70 is at/above the recipe's 60 threshold, so no penalty.
  // round(79.1) = 79 on every dimension.
  const result = craft(
    [alloyBar, gas],
    ionForgedHullPlateRecipe,
    "Blue",
    "Green",
    queueRandom([1]),
  ) as CraftAccepted;

  assert.equal(result.accepted, true);
  assert.deepEqual(result.qualities, {
    purity: 79,
    density: 79,
    potency: 79,
    durability: 79,
    rarity: 79,
  });
});
