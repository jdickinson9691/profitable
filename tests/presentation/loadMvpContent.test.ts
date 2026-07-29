import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMvpContent } from "../../src/presentation/loadMvpContent.ts";

test("loadMvpContent() loads the real bundled content with no errors", () => {
  const content = loadMvpContent();

  // Alpha content roster -- see content/README.md's Alpha Content Roster
  // section.
  assert.equal(content.resources.length, 60);
  assert.equal(content.recipes.length, 29);
  assert.equal(content.refiningRecipes.length, 10);
  assert.equal(content.schematics.length, 24);
  assert.equal(content.planets.length, 1);
});

test("loadMvpContent() caches -- repeated calls return the same object", () => {
  assert.equal(loadMvpContent(), loadMvpContent());
});
