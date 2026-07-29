import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadContent } from "../../src/simulation/loadContent.ts";
import { loadShipsContent } from "../../src/ships/loadShipsContent.ts";
import { craft } from "../../src/simulation/craft.ts";
import { makeInstance } from "../fixtures/instances.ts";
import { queueRandom } from "../fixtures/random.ts";
import type { CraftAccepted } from "../../src/data/types/craftResult.ts";
import type { ComponentCategory } from "../../src/data/types/componentCategory.ts";

const CONTENT_DIR = join(import.meta.dirname, "../../content");

function readJson(filename: string): unknown {
  return JSON.parse(readFileSync(join(CONTENT_DIR, filename), "utf8"));
}

const content = loadContent({
  resources: readJson("resources.json"),
  recipes: readJson("recipes.json"),
  refiningRecipes: readJson("refiningRecipes.json"),
  schematics: readJson("schematics.json"),
  planets: readJson("planets.json"),
});

test("the real componentRecipes.json loads through loadShipsContent() with no errors", () => {
  const loaded = loadShipsContent({ componentRecipes: readJson("componentRecipes.json") });
  // Alpha content roster (docs/profitable-alpha-content-roster.md §4): 4
  // recipes per category (16 total), not 1 -- so players can choose a
  // build direction instead of every ship being identical.
  assert.equal(loaded.componentRecipes.length, 16);
});

test("every component category (weapon/engine/shield/cargoHold) has at least one recipe link, and every link's category is valid", () => {
  const loaded = loadShipsContent({ componentRecipes: readJson("componentRecipes.json") });
  const categories = loaded.componentRecipes.map((entry) => entry.category);
  const expected: ComponentCategory[] = ["weapon", "engine", "shield", "cargoHold"];
  for (const category of expected) {
    assert.ok(categories.includes(category), `no componentRecipes entry for category "${category}"`);
  }
  for (const category of categories) {
    assert.ok(expected.includes(category), `unexpected component category "${category}"`);
  }
});

test("no component category has a duplicate recipe link (same recipeId linked twice)", () => {
  const loaded = loadShipsContent({ componentRecipes: readJson("componentRecipes.json") });
  const recipeIds = loaded.componentRecipes.map((entry) => entry.recipeId);
  assert.equal(new Set(recipeIds).size, recipeIds.length, "componentRecipes.json has a duplicate recipeId");
});

test("every componentRecipes.json entry references a real recipe in recipes.json -- no dangling references", () => {
  const componentRecipes = readJson("componentRecipes.json") as Array<{ recipeId: string }>;
  const recipeIds = new Set(content.recipes.map((r) => r.id));
  for (const entry of componentRecipes) {
    assert.ok(recipeIds.has(entry.recipeId), `componentRecipes references unknown recipe id "${entry.recipeId}"`);
  }
});

test("every componentRecipes.json entry's recipe output resolves to a real resource -- no dangling references", () => {
  const componentRecipes = readJson("componentRecipes.json") as Array<{ recipeId: string }>;
  const resourceIds = new Set(content.resources.map((r) => r.id));
  for (const entry of componentRecipes) {
    const recipe = content.recipes.find((r) => r.id === entry.recipeId)!;
    assert.ok(resourceIds.has(recipe.outputResourceId), `recipe "${entry.recipeId}" outputs unknown resource id`);
  }
});

test("at least one component recipe exists per category, and each is craftable end-to-end via the real craft()", () => {
  const componentRecipes = readJson("componentRecipes.json") as Array<{ recipeId: string; category: ComponentCategory }>;

  for (const { recipeId } of componentRecipes) {
    const recipe = content.recipes.find((r) => r.id === recipeId)!;
    assert.ok(recipe, `no recipe found for componentRecipes entry "${recipeId}"`);

    const inputs = recipe.inputs.map((slot) => {
      const resource = content.resources.find((r) => r.category === slot.category)!;
      assert.ok(resource, `no resource found for category "${slot.category}" (recipe "${recipeId}")`);
      return makeInstance(resource, slot.quantity, {
        purity: 70,
        density: 70,
        potency: 70,
        durability: 70,
        rarity: 70,
      });
    });

    const result = craft(inputs, recipe, "Blue", "Green", queueRandom([0.5])) as CraftAccepted;
    assert.equal(result.accepted, true, `craft() rejected recipe "${recipeId}"`);
  }
});
