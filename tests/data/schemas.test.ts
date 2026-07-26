import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Ajv } from "ajv";

const SCHEMAS_DIR = join(import.meta.dirname, "../../src/data/schemas");

function loadAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true });
  for (const file of readdirSync(SCHEMAS_DIR)) {
    if (!file.endsWith(".schema.json")) continue;
    const schema = JSON.parse(readFileSync(join(SCHEMAS_DIR, file), "utf8"));
    ajv.addSchema(schema);
  }
  return ajv;
}

const ajv = loadAjv();

function getValidator(schemaId: string) {
  const validate = ajv.getSchema(schemaId);
  if (!validate) throw new Error(`no schema registered under ${schemaId}`);
  return validate;
}

test("resource.schema.json accepts a valid resource (Igneous Ore)", () => {
  const validate = getValidator("resource.schema.json");
  const valid = validate({
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
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("resource.schema.json rejects an unknown applicableQualities key", () => {
  const validate = getValidator("resource.schema.json");
  const valid = validate({
    id: "x",
    name: "X",
    category: "solid",
    applicableQualities: {
      purity: true,
      density: true,
      potency: true,
      durability: true,
      rarity: true,
      strength: true,
    },
  });
  assert.equal(valid, false);
});

test("resource.schema.json rejects a resource missing a required field", () => {
  const validate = getValidator("resource.schema.json");
  const valid = validate({
    id: "x",
    name: "X",
    applicableQualities: {
      purity: true,
      density: true,
      potency: true,
      durability: true,
      rarity: true,
    },
  });
  assert.equal(valid, false);
});

test("recipe.schema.json accepts the MVP crafting recipe", () => {
  const validate = getValidator("recipe.schema.json");
  const valid = validate({
    id: "ion-forged-hull-plate",
    name: "Ion-Forged Hull Plate",
    inputs: [
      { category: "refined-metal", quantity: 1, thresholdQuality: "durability", thresholdValue: 60 },
      { category: "gas", quantity: 1 },
    ],
    outputResourceId: "ion-forged-hull-plate",
    outputQuantity: 1,
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("recipe.schema.json rejects a quality value of 101", () => {
  const validate = getValidator("recipe.schema.json");
  const valid = validate({
    id: "x",
    name: "X",
    inputs: [{ category: "metal", quantity: 1, thresholdQuality: "durability", thresholdValue: 101 }],
    outputResourceId: "out",
    outputQuantity: 1,
  });
  assert.equal(valid, false);
});

test("recipe.schema.json rejects a negative threshold", () => {
  const validate = getValidator("recipe.schema.json");
  const valid = validate({
    id: "x",
    name: "X",
    inputs: [{ category: "metal", quantity: 1, thresholdQuality: "durability", thresholdValue: -5 }],
    outputResourceId: "out",
    outputQuantity: 1,
  });
  assert.equal(valid, false);
});

test("recipe.schema.json rejects thresholdQuality without a matching thresholdValue", () => {
  const validate = getValidator("recipe.schema.json");
  const valid = validate({
    id: "x",
    name: "X",
    inputs: [{ category: "metal", quantity: 1, thresholdQuality: "durability" }],
    outputResourceId: "out",
    outputQuantity: 1,
  });
  assert.equal(valid, false);
});

test("refiningRecipe.schema.json accepts the MVP refining recipe", () => {
  const validate = getValidator("refiningRecipe.schema.json");
  const valid = validate({
    id: "radiant-alloy-bar",
    name: "Radiant Alloy Bar",
    inputs: [
      { resourceId: "igneous-ore", quantity: 2 },
      { resourceId: "autunite-crystal", quantity: 1 },
    ],
    outputResourceId: "radiant-alloy-bar",
    outputQuantity: 1,
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("refiningRecipe.schema.json rejects a zero-quantity input", () => {
  const validate = getValidator("refiningRecipe.schema.json");
  const valid = validate({
    id: "x",
    name: "X",
    inputs: [{ resourceId: "igneous-ore", quantity: 0 }],
    outputResourceId: "out",
    outputQuantity: 1,
  });
  assert.equal(valid, false);
});

test("schematic.schema.json accepts a valid schematic", () => {
  const validate = getValidator("schematic.schema.json");
  const valid = validate({
    id: "ion-forged-hull-plate-blue",
    name: "Ion-Forged Hull Plate Schematic",
    recipeId: "ion-forged-hull-plate",
    tier: "Blue",
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("schematic.schema.json rejects an invalid tier value", () => {
  const validate = getValidator("schematic.schema.json");
  const valid = validate({ id: "x", name: "X", recipeId: "y", tier: "Platinum" });
  assert.equal(valid, false);
});

test("planet.schema.json accepts the MVP planet (Delta Rigelus)", () => {
  const validate = getValidator("planet.schema.json");
  const valid = validate({
    id: "delta-rigelus",
    name: "Delta Rigelus",
    producibleResourceIds: ["igneous-ore", "hydrogen-gas", "autunite-crystal"],
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("planet.schema.json rejects an empty producibleResourceIds list", () => {
  const validate = getValidator("planet.schema.json");
  const valid = validate({ id: "x", name: "X", producibleResourceIds: [] });
  assert.equal(valid, false);
});

test("planet.schema.json accepts a fully Phase-2-populated planet", () => {
  const validate = getValidator("planet.schema.json");
  const valid = validate({
    id: "planet-1",
    name: "Planet-1",
    producibleResourceIds: ["igneous-ore"],
    planetType: "Terrestrial",
    tier: "Blue",
    position: { x: 12, y: -4 },
    specialtyResourceId: "igneous-ore",
    discovered: false,
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("planet.schema.json accepts a null specialtyResourceId (Grey-tier planets)", () => {
  const validate = getValidator("planet.schema.json");
  const valid = validate({
    id: "planet-2",
    name: "Planet-2",
    producibleResourceIds: ["igneous-ore"],
    planetType: "GasGiant",
    tier: "Grey",
    position: { x: 0, y: 0 },
    specialtyResourceId: null,
    discovered: false,
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("planet.schema.json rejects an invalid planetType value", () => {
  const validate = getValidator("planet.schema.json");
  const valid = validate({
    id: "x",
    name: "X",
    producibleResourceIds: ["igneous-ore"],
    planetType: "Moon",
  });
  assert.equal(valid, false);
});

test("planet.schema.json rejects a position missing a coordinate", () => {
  const validate = getValidator("planet.schema.json");
  const valid = validate({
    id: "x",
    name: "X",
    producibleResourceIds: ["igneous-ore"],
    position: { x: 5 },
  });
  assert.equal(valid, false);
});

test("planetType.schema.json only accepts the 4 documented planet types", () => {
  const validate = getValidator("planetType.schema.json");
  assert.equal(validate("Terrestrial"), true);
  assert.equal(validate("SuperEarth"), true);
  assert.equal(validate("Neptunian"), true);
  assert.equal(validate("GasGiant"), true);
  assert.equal(validate("Moon"), false);
});

test("resource.schema.json accepts an itemTier in range 1-7 (Phase 3)", () => {
  const validate = getValidator("resource.schema.json");
  const valid = validate({
    id: "ion-forged-hull-plate",
    name: "Ion-Forged Hull Plate",
    category: "crafted-item",
    applicableQualities: {
      purity: true,
      density: true,
      potency: true,
      durability: true,
      rarity: true,
    },
    itemTier: 5,
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("resource.schema.json rejects an itemTier outside 1-7", () => {
  const validate = getValidator("resource.schema.json");
  const valid = validate({
    id: "x",
    name: "X",
    category: "solid",
    applicableQualities: {
      purity: true,
      density: true,
      potency: true,
      durability: true,
      rarity: true,
    },
    itemTier: 8,
  });
  assert.equal(valid, false);
});

test("resource.schema.json still accepts a pre-Phase-3 resource with no itemTier (backward compat)", () => {
  const validate = getValidator("resource.schema.json");
  const valid = validate({
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
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("listing.schema.json accepts a valid planet-market listing", () => {
  const validate = getValidator("listing.schema.json");
  const valid = validate({
    id: "listing-1",
    itemId: "radiant-alloy-bar",
    quantity: 5,
    pricePerUnit: 12.5,
    marketTier: "Blue",
    location: { planetId: "delta-rigelus" },
    createdByPlayerId: "player-1",
    createdAt: 1000,
    expiresAt: 1000 + 72 * 60 * 60 * 1000,
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("listing.schema.json accepts a valid global-market listing", () => {
  const validate = getValidator("listing.schema.json");
  const valid = validate({
    id: "listing-2",
    itemId: "igneous-ore",
    quantity: 1,
    pricePerUnit: 3,
    marketTier: "Grey",
    location: "global",
    createdByPlayerId: "player-1",
    createdAt: 0,
    expiresAt: 1,
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("listing.schema.json rejects a negative pricePerUnit", () => {
  const validate = getValidator("listing.schema.json");
  const valid = validate({
    id: "listing-3",
    itemId: "igneous-ore",
    quantity: 1,
    pricePerUnit: -5,
    marketTier: "Grey",
    location: "global",
    createdByPlayerId: "player-1",
    createdAt: 0,
    expiresAt: 1,
  });
  assert.equal(valid, false);
});

test("listing.schema.json rejects an invalid location value", () => {
  const validate = getValidator("listing.schema.json");
  const valid = validate({
    id: "listing-4",
    itemId: "igneous-ore",
    quantity: 1,
    pricePerUnit: 5,
    marketTier: "Grey",
    location: "moon-base",
    createdByPlayerId: "player-1",
    createdAt: 0,
    expiresAt: 1,
  });
  assert.equal(valid, false);
});

test("planetMarketState.schema.json accepts a valid market state", () => {
  const validate = getValidator("planetMarketState.schema.json");
  const valid = validate({
    planetId: "delta-rigelus",
    itemId: "igneous-ore",
    currentPrice: 12,
    basePrice: 10,
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("planetMarketState.schema.json rejects a zero or negative basePrice", () => {
  const validate = getValidator("planetMarketState.schema.json");
  const valid = validate({
    planetId: "delta-rigelus",
    itemId: "igneous-ore",
    currentPrice: 12,
    basePrice: 0,
  });
  assert.equal(valid, false);
});

test("wallet.schema.json accepts a valid wallet", () => {
  const validate = getValidator("wallet.schema.json");
  const valid = validate({ playerId: "player-1", credits: 500 });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("wallet.schema.json rejects negative credits", () => {
  const validate = getValidator("wallet.schema.json");
  const valid = validate({ playerId: "player-1", credits: -10 });
  assert.equal(valid, false);
});

test("quality.schema.json and tierColor.schema.json only accept their documented enum values", () => {
  const quality = getValidator("quality.schema.json");
  const tier = getValidator("tierColor.schema.json");
  assert.equal(quality("durability"), true);
  assert.equal(quality("strength"), false);
  assert.equal(tier("Gold"), true);
  assert.equal(tier("Diamond"), false);
});
