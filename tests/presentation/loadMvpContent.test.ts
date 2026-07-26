import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMvpContent } from "../../src/presentation/loadMvpContent.ts";

test("loadMvpContent() loads the real bundled content with no errors", () => {
  const content = loadMvpContent();

  assert.equal(content.resources.length, 5);
  assert.equal(content.recipes.length, 1);
  assert.equal(content.refiningRecipes.length, 1);
  assert.equal(content.schematics.length, 1);
  assert.equal(content.planets.length, 1);
});

test("loadMvpContent() caches -- repeated calls return the same object", () => {
  assert.equal(loadMvpContent(), loadMvpContent());
});
