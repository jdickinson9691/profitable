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

  // Alpha content roster (docs/profitable-alpha-content-roster.md): 21 raw
  // + 10 refined + 13 general-crafted + 16 ship-component resources; 13
  // general crafting recipes + 16 component recipes; 10 refining recipes;
  // 24 schematics (29 recipes minus the 5 known-by-default starters) --
  // see content/README.md's Alpha Content Roster section.
  assert.equal(loaded.resources.length, 60);
  assert.equal(loaded.recipes.length, 29);
  assert.equal(loaded.refiningRecipes.length, 10);
  assert.equal(loaded.schematics.length, 24);
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
  const resources = readJson("resources.json") as Array<{ id: string; category: string }>;
  const resourceIds = new Set(resources.map((r) => r.id));
  const planets = readJson("planets.json") as Array<{ producibleResourceIds: string[] }>;
  const refiningRecipes = readJson("refiningRecipes.json") as Array<{
    id: string;
    inputs: Array<{ resourceId: string }>;
    outputResourceId: string;
  }>;
  const recipes = readJson("recipes.json") as Array<{
    id: string;
    outputResourceId: string;
    inputs: Array<{ category: string }>;
  }>;
  const schematics = readJson("schematics.json") as Array<{ recipeId: string }>;
  const recipeIds = new Set(recipes.map((r) => r.id));

  // Alpha content roster: checked across every entry, not just index 0 --
  // with 10 refining recipes, 29 crafting recipes, and 24 schematics now
  // in real content (vs. the MVP's original 1 each), only checking index
  // 0 would leave the other 9/28/23 entries structurally unverified.
  for (const planet of planets) {
    for (const id of planet.producibleResourceIds) {
      assert.ok(resourceIds.has(id), `planet "${planet.producibleResourceIds}" references unknown resource id "${id}"`);
    }
  }
  for (const recipe of refiningRecipes) {
    for (const input of recipe.inputs) {
      assert.ok(
        resourceIds.has(input.resourceId),
        `refining recipe "${recipe.id}" references unknown resource id "${input.resourceId}"`,
      );
    }
    assert.ok(resourceIds.has(recipe.outputResourceId), `refining recipe "${recipe.id}" outputs unknown resource id`);
  }
  for (const recipe of recipes) {
    assert.ok(resourceIds.has(recipe.outputResourceId), `recipe "${recipe.id}" outputs unknown resource id`);
  }
  for (const schematic of schematics) {
    assert.ok(recipeIds.has(schematic.recipeId), `schematic references unknown recipe id "${schematic.recipeId}"`);
  }
});

test("every crafting recipe's input category resolves to exactly one resource (CraftScene/CrewScene/ShipAssemblyScene resolve by first-match)", () => {
  // CraftScene.resolveSlotResource() et al. resolve a recipe input's
  // category via `resources.find((r) => r.category === category)` -- the
  // first match wins. If two different resources ever shared a non-raw
  // category, a recipe naming that category would silently resolve to
  // whichever resource happens to sort first, never the other one.
  const resources = readJson("resources.json") as Array<{ id: string; category: string }>;
  const recipes = readJson("recipes.json") as Array<{ id: string; inputs: Array<{ category: string }> }>;

  const categoryCounts = new Map<string, number>();
  for (const resource of resources) {
    categoryCounts.set(resource.category, (categoryCounts.get(resource.category) ?? 0) + 1);
  }

  const referencedCategories = new Set<string>();
  for (const recipe of recipes) {
    for (const input of recipe.inputs) referencedCategories.add(input.category);
  }

  for (const category of referencedCategories) {
    const count = categoryCounts.get(category) ?? 0;
    assert.ok(count > 0, `recipe input category "${category}" matches no resource`);
    assert.equal(
      count,
      1,
      `recipe input category "${category}" matches ${count} resources -- .find()-based resolution would silently pick only the first`,
    );
  }
});

test("every componentRecipes.json category is unique enough that ShipAssemblyScene shows every recipe (no two recipes with the same id linked twice)", () => {
  const componentRecipes = readJson("componentRecipes.json") as Array<{ recipeId: string; category: string }>;
  const recipeIds = componentRecipes.map((entry) => entry.recipeId);
  assert.equal(new Set(recipeIds).size, recipeIds.length);
});
