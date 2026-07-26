import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANET_TYPE_ELIGIBILITY } from "../../src/data/constants/planetTypeEligibility.ts";
import {
  PLANET_TIER_MODIFIER,
  SPECIALTY_QUALITY_MODIFIER,
} from "../../src/data/constants/planetTierModifier.ts";
import { RESOURCE_SUBSET_PERCENTAGE } from "../../src/data/constants/resourceSubsetPercentage.ts";
import type { PlanetType } from "../../src/data/types/planetType.ts";
import type { TierColor } from "../../src/data/types/tierColor.ts";

// Hardcoded directly from Phase 2 GDD §2.2-2.5, independent of the actual
// constants -- a typo in the real table gets caught, not silently
// rubber-stamped (same pattern as the MVP's TIER_VARIANCE/REFUND_CHANCE/
// SCHEMATIC_TIER_CONTRIBUTION tests).
const EXPECTED_PLANET_TIER_MODIFIER: Array<{ tier: TierColor; qualityRollModifier: number }> = [
  { tier: "Grey", qualityRollModifier: -15 },
  { tier: "White", qualityRollModifier: -8 },
  { tier: "Green", qualityRollModifier: 0 },
  { tier: "Blue", qualityRollModifier: 8 },
  { tier: "Purple", qualityRollModifier: 15 },
  { tier: "Orange", qualityRollModifier: 22 },
  { tier: "Gold", qualityRollModifier: 30 },
];

const EXPECTED_RESOURCE_SUBSET_PERCENTAGE: Array<{ tier: TierColor; percentage: number }> = [
  { tier: "Grey", percentage: 0.2 },
  { tier: "White", percentage: 0.35 },
  { tier: "Green", percentage: 0.5 },
  { tier: "Blue", percentage: 0.65 },
  { tier: "Purple", percentage: 0.8 },
  { tier: "Orange", percentage: 0.9 },
  { tier: "Gold", percentage: 1.0 },
];

const EXPECTED_PLANET_TYPE_ELIGIBILITY: Array<{ planetType: PlanetType; eligibleCategories: string[] }> = [
  { planetType: "Terrestrial", eligibleCategories: ["Solid", "Crystal"] },
  { planetType: "SuperEarth", eligibleCategories: ["Solid", "Crystal", "Gas"] },
  { planetType: "Neptunian", eligibleCategories: ["Gas", "Crystal"] },
  { planetType: "GasGiant", eligibleCategories: ["Gas"] },
];

for (const expected of EXPECTED_PLANET_TIER_MODIFIER) {
  test(`PLANET_TIER_MODIFIER.${expected.tier} matches Phase 2 GDD §2.2 exactly`, () => {
    const actual = PLANET_TIER_MODIFIER.find((entry) => entry.tier === expected.tier);
    assert.deepEqual(actual, expected);
  });
}

test("PLANET_TIER_MODIFIER's neutral point is Green (+0), not Grey", () => {
  // This is the one detail that inverts the pattern every other tier table
  // in the project follows (Grey = no bonus elsewhere) -- worth its own
  // explicit assertion, not just coverage-by-loop.
  const green = PLANET_TIER_MODIFIER.find((entry) => entry.tier === "Green");
  const grey = PLANET_TIER_MODIFIER.find((entry) => entry.tier === "Grey");
  assert.equal(green?.qualityRollModifier, 0);
  assert.notEqual(grey?.qualityRollModifier, 0);
});

test("SPECIALTY_QUALITY_MODIFIER matches Phase 2 GDD §2.5 exactly", () => {
  assert.equal(SPECIALTY_QUALITY_MODIFIER, 15);
});

for (const expected of EXPECTED_RESOURCE_SUBSET_PERCENTAGE) {
  test(`RESOURCE_SUBSET_PERCENTAGE.${expected.tier} matches Phase 2 GDD §2.4 exactly`, () => {
    const actual = RESOURCE_SUBSET_PERCENTAGE.find((entry) => entry.tier === expected.tier);
    assert.deepEqual(actual, expected);
  });
}

for (const expected of EXPECTED_PLANET_TYPE_ELIGIBILITY) {
  test(`PLANET_TYPE_ELIGIBILITY.${expected.planetType} matches Phase 2 GDD §2.3 exactly`, () => {
    const actual = PLANET_TYPE_ELIGIBILITY.find((entry) => entry.planetType === expected.planetType);
    assert.deepEqual(actual, expected);
  });
}

test("PLANET_TYPE_ELIGIBILITY treats Planet Type as a hard filter (Gas Giant never lists Solid)", () => {
  const gasGiant = PLANET_TYPE_ELIGIBILITY.find((entry) => entry.planetType === "GasGiant");
  assert.ok(!gasGiant?.eligibleCategories.includes("Solid"));
});
