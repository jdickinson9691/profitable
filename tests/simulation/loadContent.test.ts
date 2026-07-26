import { test } from "node:test";
import assert from "node:assert/strict";
import { loadContent } from "../../src/simulation/loadContent.ts";
import type { RawContentConfig } from "../../src/simulation/loadContent.ts";

// Mirrors the actual MVP content described in GDD §3.4 / CLAUDE.md §4 --
// not authoritative (that's Agent 6's job), just realistic enough to prove
// loadContent() round-trips real-shaped config correctly.
const validConfig: RawContentConfig = {
  resources: [
    {
      id: "igneous-ore",
      name: "Igneous Ore",
      category: "solid",
      applicableQualities: {
        purity: true,
        density: true,
        potency: true,
        durability: true,
        rarity: true,
      },
    },
    {
      id: "hydrogen-gas",
      name: "Hydrogen Gas",
      category: "gas",
      applicableQualities: {
        purity: true,
        density: true,
        potency: true,
        durability: false,
        rarity: true,
      },
    },
  ],
  recipes: [
    {
      id: "ion-forged-hull-plate",
      name: "Ion-Forged Hull Plate",
      inputs: [
        { category: "refined-metal", quantity: 1, thresholdQuality: "durability", thresholdValue: 60 },
        { category: "gas", quantity: 1 },
      ],
      outputResourceId: "ion-forged-hull-plate",
      outputQuantity: 1,
    },
  ],
  refiningRecipes: [
    {
      id: "radiant-alloy-bar",
      name: "Radiant Alloy Bar",
      inputs: [
        { resourceId: "igneous-ore", quantity: 2 },
        { resourceId: "autunite-crystal", quantity: 1 },
      ],
      outputResourceId: "radiant-alloy-bar",
      outputQuantity: 1,
    },
  ],
  schematics: [
    {
      id: "ion-forged-hull-plate-blue",
      name: "Ion-Forged Hull Plate Schematic",
      recipeId: "ion-forged-hull-plate",
      tier: "Blue",
    },
  ],
  planets: [
    {
      id: "delta-rigelus",
      name: "Delta Rigelus",
      producibleResourceIds: ["igneous-ore", "hydrogen-gas", "autunite-crystal"],
    },
  ],
};

test("loadContent() parses a fully valid config into typed objects", () => {
  const loaded = loadContent(validConfig);

  assert.equal(loaded.resources.length, 2);
  assert.equal(loaded.resources[0]?.id, "igneous-ore");
  assert.equal(loaded.recipes[0]?.id, "ion-forged-hull-plate");
  assert.equal(loaded.refiningRecipes[0]?.outputResourceId, "radiant-alloy-bar");
  assert.equal(loaded.schematics[0]?.tier, "Blue");
  assert.equal(loaded.planets[0]?.producibleResourceIds.length, 3);
});

test("loadContent() accepts a config with every section empty", () => {
  const loaded = loadContent({
    resources: [],
    recipes: [],
    refiningRecipes: [],
    schematics: [],
    planets: [],
  });

  assert.deepEqual(loaded, {
    resources: [],
    recipes: [],
    refiningRecipes: [],
    schematics: [],
    planets: [],
  });
});

test("loadContent() throws a clear error naming the section and index of an invalid item", () => {
  const invalid: RawContentConfig = {
    ...validConfig,
    resources: [
      { id: "igneous-ore", name: "Igneous Ore", category: "solid" }, // missing applicableQualities
    ],
  };

  assert.throws(() => loadContent(invalid), /resources\[0\]/);
});

test("loadContent() reports every invalid item across sections, not just the first", () => {
  const invalid: RawContentConfig = {
    ...validConfig,
    resources: [{ id: "x" }], // missing required fields
    planets: [{ id: "y", name: "Y", producibleResourceIds: [] }], // empty array violates minItems
  };

  try {
    loadContent(invalid);
    assert.fail("expected loadContent to throw");
  } catch (error) {
    const message = (error as Error).message;
    assert.match(message, /resources\[0\]/);
    assert.match(message, /planets\[0\]/);
  }
});

test("loadContent() rejects a rawConfig missing one of the required arrays", () => {
  const { planets: _planets, ...missingPlanets } = validConfig;
  assert.throws(() => loadContent(missingPlanets));
});

test("loadContent() rejects a non-object rawConfig", () => {
  assert.throws(() => loadContent("not an object"));
  assert.throws(() => loadContent(null));
});
