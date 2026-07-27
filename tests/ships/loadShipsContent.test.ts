import { test } from "node:test";
import assert from "node:assert/strict";
import { loadShipsContent } from "../../src/ships/loadShipsContent.ts";
import type { RawShipsContentConfig } from "../../src/ships/loadShipsContent.ts";

const validConfig: RawShipsContentConfig = {
  componentRecipes: [
    { recipeId: "weapon-component", category: "weapon" },
    { recipeId: "engine-component", category: "engine" },
  ],
};

test("loadShipsContent() parses a fully valid config into typed objects", () => {
  const loaded = loadShipsContent(validConfig);
  assert.equal(loaded.componentRecipes.length, 2);
  assert.equal(loaded.componentRecipes[0]?.recipeId, "weapon-component");
});

test("loadShipsContent() accepts an empty componentRecipes array", () => {
  const loaded = loadShipsContent({ componentRecipes: [] });
  assert.deepEqual(loaded, { componentRecipes: [] });
});

test("loadShipsContent() throws a clear error naming the section and index of an invalid item", () => {
  const invalid: RawShipsContentConfig = {
    componentRecipes: [{ recipeId: "weapon-component", category: "sensor" }], // invalid category
  };
  assert.throws(() => loadShipsContent(invalid), /componentRecipes\[0\]/);
});

test("loadShipsContent() rejects a rawConfig missing the componentRecipes array", () => {
  assert.throws(() => loadShipsContent({}));
});

test("loadShipsContent() rejects a non-object rawConfig", () => {
  assert.throws(() => loadShipsContent("not an object"));
  assert.throws(() => loadShipsContent(null));
});
