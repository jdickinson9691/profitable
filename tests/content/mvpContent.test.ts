import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadContent } from "../../src/simulation/loadContent.ts";

const CONTENT_DIR = join(import.meta.dirname, "../../content");

function readJson(filename: string): unknown {
  return JSON.parse(readFileSync(join(CONTENT_DIR, filename), "utf8"));
}

test("the real content/ files load through loadContent() with no errors", () => {
  const loaded = loadContent({
    resources: readJson("resources.json"),
    recipes: readJson("recipes.json"),
    refiningRecipes: readJson("refiningRecipes.json"),
    schematics: readJson("schematics.json"),
    planets: readJson("planets.json"),
  });

  // 5 MVP resources + 4 Phase 5 ship component outputs (weapon/engine/
  // shield/cargoHold); 1 MVP recipe + 4 Phase 5 component recipes -- see
  // content/README.md's Phase 5 section.
  assert.equal(loaded.resources.length, 9);
  assert.equal(loaded.recipes.length, 5);
  assert.equal(loaded.refiningRecipes.length, 1);
  assert.equal(loaded.schematics.length, 1);
  assert.equal(loaded.planets.length, 1);
});

test("Delta Rigelus (pre-Phase-2 content) still loads unchanged through the Phase-2-extended planet schema", () => {
  // Confirms the Agent 1 Phase 2 amendment is genuinely additive: this
  // MVP-era planet record has none of the new fields (planetType, tier,
  // position, specialtyResourceId, discovered) and still validates/loads
  // with no changes to the file itself.
  const planets = readJson("planets.json") as Array<{ id: string; planetType?: unknown }>;
  const deltaRigelus = planets.find((p) => p.id === "delta-rigelus");
  assert.ok(deltaRigelus, "Delta Rigelus must still be present");
  assert.equal(deltaRigelus?.planetType, undefined);

  const loaded = loadContent({
    resources: readJson("resources.json"),
    recipes: readJson("recipes.json"),
    refiningRecipes: readJson("refiningRecipes.json"),
    schematics: readJson("schematics.json"),
    planets: readJson("planets.json"),
  });
  assert.equal(loaded.planets.length, 1);
  assert.equal(loaded.planets[0]?.id, "delta-rigelus");
});

test("content exercises the null-quality branch for both the refining and crafting recipes", () => {
  const resources = readJson("resources.json") as Array<{
    id: string;
    applicableQualities: Record<string, boolean>;
  }>;

  // Autunite Crystal (refining input) has no purity.
  const autuniteCrystal = resources.find((r) => r.id === "autunite-crystal");
  assert.equal(autuniteCrystal?.applicableQualities.purity, false);

  // Hydrogen Gas (crafting input) has no durability.
  const hydrogenGas = resources.find((r) => r.id === "hydrogen-gas");
  assert.equal(hydrogenGas?.applicableQualities.durability, false);
});

test("the crafting recipe has a real, violable quality threshold", () => {
  const recipes = readJson("recipes.json") as Array<{
    inputs: Array<{ thresholdQuality?: string; thresholdValue?: number }>;
  }>;

  const thresholded = recipes[0]?.inputs.find((input) => input.thresholdValue !== undefined);

  assert.equal(thresholded?.thresholdQuality, "durability");
  // Strictly between 1 and 100 -- a roll can land either side of it, so the
  // penalty curve actually gets exercised rather than never triggering.
  assert.ok(thresholded && thresholded.thresholdValue! > 1 && thresholded.thresholdValue! < 100);
});

test("the schematic is neither Grey nor Gold, so ceiling-raise and forgiveness are non-trivial", () => {
  const schematics = readJson("schematics.json") as Array<{ tier: string }>;
  assert.notEqual(schematics[0]?.tier, "Grey");
  assert.notEqual(schematics[0]?.tier, "Gold");
});

test("every id referenced across content files resolves to a real entry", () => {
  const resources = readJson("resources.json") as Array<{ id: string }>;
  const resourceIds = new Set(resources.map((r) => r.id));
  const planets = readJson("planets.json") as Array<{ producibleResourceIds: string[] }>;
  const refiningRecipes = readJson("refiningRecipes.json") as Array<{
    inputs: Array<{ resourceId: string }>;
    outputResourceId: string;
  }>;
  const recipes = readJson("recipes.json") as Array<{ outputResourceId: string; id: string }>;
  const schematics = readJson("schematics.json") as Array<{ recipeId: string }>;
  const recipeIds = new Set(recipes.map((r) => r.id));

  for (const id of planets[0]?.producibleResourceIds ?? []) {
    assert.ok(resourceIds.has(id), `planet references unknown resource id "${id}"`);
  }
  for (const input of refiningRecipes[0]?.inputs ?? []) {
    assert.ok(
      resourceIds.has(input.resourceId),
      `refining recipe references unknown resource id "${input.resourceId}"`,
    );
  }
  assert.ok(resourceIds.has(refiningRecipes[0]?.outputResourceId ?? ""));
  assert.ok(resourceIds.has(recipes[0]?.outputResourceId ?? ""));
  assert.ok(recipeIds.has(schematics[0]?.recipeId ?? ""));
});
