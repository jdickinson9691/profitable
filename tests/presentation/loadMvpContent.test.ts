import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMvpContent } from "../../src/presentation/loadMvpContent.ts";

test("loadMvpContent() loads the real bundled content with no errors", () => {
  const content = loadMvpContent();

  // 5 MVP resources + 4 Phase 5 ship component outputs; 1 MVP recipe +
  // 4 Phase 5 component recipes -- see content/README.md's Phase 5 section.
  assert.equal(content.resources.length, 9);
  assert.equal(content.recipes.length, 5);
  assert.equal(content.refiningRecipes.length, 1);
  assert.equal(content.schematics.length, 1);
  assert.equal(content.planets.length, 1);
});

test("loadMvpContent() caches -- repeated calls return the same object", () => {
  assert.equal(loadMvpContent(), loadMvpContent());
});
