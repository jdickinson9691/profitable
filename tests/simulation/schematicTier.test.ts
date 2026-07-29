import { test } from "node:test";
import assert from "node:assert/strict";
import { getSchematicTierContribution, resolveSchematicTier } from "../../src/simulation/schematicTier.ts";
import type { Schematic } from "../../src/data/types/schematicEntity.ts";

test("getSchematicTierContribution(Grey) is the zero-bonus row", () => {
  assert.deepEqual(getSchematicTierContribution("Grey"), {
    tier: "Grey",
    ceilingRaise: 0,
    varianceNarrowing: 0,
    penaltyForgiveness: 0,
  });
});

// Gap found during the alpha content roster's craftability spot-check,
// resolved in profitable-design-questions.md's Crafting & Recipes/
// Schematics section: no owned schematic resolves to Grey, since Grey's
// contribution row is already a no-op (+0%/-0%/0%) -- the same outcome
// as owning a real Grey-tier schematic, not a special case.
test("resolveSchematicTier(undefined) resolves to Grey (no schematic owned -- known-by-default recipe)", () => {
  assert.equal(resolveSchematicTier(undefined), "Grey");
});

test("resolveSchematicTier(null) resolves to Grey", () => {
  assert.equal(resolveSchematicTier(null), "Grey");
});

test("resolveSchematicTier(schematic) returns the owned schematic's real tier, not Grey", () => {
  const schematic: Schematic = { id: "s-1", name: "Test Schematic", recipeId: "test-recipe", tier: "Purple" };
  assert.equal(resolveSchematicTier(schematic), "Purple");
});

test("resolveSchematicTier(undefined)'s Grey result has an identical contribution to an owned Grey schematic", () => {
  const noSchematicTier = resolveSchematicTier(undefined);
  const ownedGreySchematic: Schematic = { id: "s-2", name: "Grey Schematic", recipeId: "test-recipe", tier: "Grey" };
  const ownedGreyTier = resolveSchematicTier(ownedGreySchematic);
  assert.equal(noSchematicTier, ownedGreyTier);
  assert.deepEqual(getSchematicTierContribution(noSchematicTier), getSchematicTierContribution(ownedGreyTier));
});
