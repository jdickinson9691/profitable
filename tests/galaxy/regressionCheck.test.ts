import { test } from "node:test";
import assert from "node:assert/strict";
import { refine } from "../../src/simulation/refine.ts";
import { craft } from "../../src/simulation/craft.ts";
import { igneousOre, autuniteCrystal, radiantAlloyBar, hydrogenGas } from "../fixtures/resources.ts";
import { makeInstance } from "../fixtures/instances.ts";
import { queueRandom } from "../fixtures/random.ts";
import { ionForgedHullPlateRecipe } from "../fixtures/recipes.ts";
import type { CraftAccepted } from "../../src/data/types/craftResult.ts";

// Phase 2 GDD §2.6 / Agent 9's contract: the single most important check
// in the Phase 2 suite is that refine()/craft() are byte-for-byte
// unchanged now that Agent 8 (galaxy/planet generation) exists alongside
// them. Neither function takes a planet argument at all, and `git status`
// across the whole Phase 2 amendment + Agent 8 shows zero changes to
// src/simulation/refine.ts or craft.ts. This re-runs the exact same
// hand-calculated scenarios already proven correct in
// tests/simulation/refine.test.ts / craft.test.ts and
// tests/integration/mvpLoop.test.ts -- this file's job isn't re-proving
// correctness, it's a dedicated marker that Phase 2 didn't disturb it.

test("refine() unchanged: same hand-calculated case as the pre-Phase-2 MVP integration test", () => {
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

test("craft() unchanged: same hand-calculated case as the pre-Phase-2 MVP integration test", () => {
  const inputs = [
    makeInstance(radiantAlloyBar, 1, { purity: 70, density: 70, potency: 70, durability: 70, rarity: 70 }),
    makeInstance(hydrogenGas, 1, { purity: 70, density: 70, potency: 70, rarity: 70 }),
  ];

  const result = craft(
    inputs,
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
