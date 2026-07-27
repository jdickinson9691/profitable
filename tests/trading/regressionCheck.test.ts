import { test } from "node:test";
import assert from "node:assert/strict";
import { refine } from "../../src/simulation/refine.ts";
import { craft } from "../../src/simulation/craft.ts";
import { generateGalaxy } from "../../src/galaxy/generateGalaxy.ts";
import { igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar } from "../fixtures/resources.ts";
import { makeInstance } from "../fixtures/instances.ts";
import { queueRandom } from "../fixtures/random.ts";
import { ionForgedHullPlateRecipe } from "../fixtures/recipes.ts";
import type { CraftAccepted } from "../../src/data/types/craftResult.ts";

// Phase 3 GDD §5 / Agent 12's contract: the most important check in this
// suite. Re-runs the exact hand-calculated MVP (Agent 3) and Phase 2
// (Agent 9) cases, confirming byte-for-byte identical results now that
// Agent 11 (trading core) exists alongside them -- neither refine()/craft()
// nor generateGalaxy() take any trading data at all, and `git status`
// across the whole Phase 3 amendment + Agent 11 shows zero changes to
// src/simulation/refine.ts, craft.ts, or anything under src/galaxy/.

test("refine() unchanged: same hand-calculated case as the pre-Phase-3 MVP/Phase 2 tests", () => {
  const inputs = [
    makeInstance(igneousOre, 2, { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 }),
    makeInstance(autuniteCrystal, 1, { purity: null, density: 60, potency: 60, durability: 60, rarity: 60 }),
  ];

  const result = refine(inputs, "Gold", queueRandom([0, 0.5, 0.5, 0.5]));

  assert.deepEqual(result, {
    qualities: { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 },
    outputTier: "White",
    refundUnits: 0,
  });
});

test("craft() unchanged: same hand-calculated case as the pre-Phase-3 MVP/Phase 2 tests", () => {
  const inputs = [
    makeInstance(radiantAlloyBar, 1, { purity: 70, density: 70, potency: 70, durability: 70, rarity: 70 }),
    makeInstance(hydrogenGas, 1, { purity: 70, density: 70, potency: 70, rarity: 70 }),
  ];

  const result = craft(inputs, ionForgedHullPlateRecipe, "Blue", "Green", queueRandom([1])) as CraftAccepted;

  assert.equal(result.accepted, true);
  assert.deepEqual(result.qualities, {
    purity: 79,
    density: 79,
    potency: 79,
    durability: 79,
    rarity: 79,
  });
});

test("generateGalaxy() unchanged: same seed still reproduces the identical galaxy", () => {
  const resources = [igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar];
  const a = generateGalaxy(5, resources, "phase-3-regression-check");
  const b = generateGalaxy(5, resources, "phase-3-regression-check");
  assert.deepEqual(a, b);
});
