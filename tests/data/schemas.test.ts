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

function baseCrewMember(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "crew-1",
    hiredByPlayerId: "player-1",
    tier: "Blue",
    profession: null,
    status: "idle",
    assignedCraftId: null,
    hiredAt: 0,
    lastCheckedAt: 0,
    wageAmount: 35,
    lastPaidAt: 0,
    ...overrides,
  };
}

test("crewMember.schema.json accepts a valid tier 3-5 crew member (profession null)", () => {
  const validate = getValidator("crewMember.schema.json");
  const valid = validate(baseCrewMember());
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("crewMember.schema.json accepts a valid tier 6-7 crew member with a profession set", () => {
  const validate = getValidator("crewMember.schema.json");
  const valid = validate(baseCrewMember({ tier: "Gold", profession: "weaponsmith", wageAmount: 120 }));
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("crewMember.schema.json accepts a valid actively-assigned crew member", () => {
  const validate = getValidator("crewMember.schema.json");
  const valid = validate(baseCrewMember({ status: "active", assignedCraftId: "craft-1" }));
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("crewMember.schema.json rejects a non-positive wageAmount", () => {
  const validate = getValidator("crewMember.schema.json");
  const valid = validate(baseCrewMember({ wageAmount: 0 }));
  assert.equal(valid, false);
});

test("crewMember.schema.json rejects an invalid status value", () => {
  const validate = getValidator("crewMember.schema.json");
  const valid = validate(baseCrewMember({ status: "hired" }));
  assert.equal(valid, false);
});

test("crewCandidate.schema.json accepts a valid tier 3-5 candidate (profession null)", () => {
  const validate = getValidator("crewCandidate.schema.json");
  const valid = validate({ id: "candidate-1", tier: "Blue", profession: null });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("crewCandidate.schema.json accepts a valid tier 6-7 candidate with a profession", () => {
  const validate = getValidator("crewCandidate.schema.json");
  const valid = validate({ id: "candidate-1", tier: "Gold", profession: "unspecified-profession-1" });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("crewCandidate.schema.json rejects a missing tier", () => {
  const validate = getValidator("crewCandidate.schema.json");
  const valid = validate({ id: "candidate-1", profession: null });
  assert.equal(valid, false);
});

test("crewCapacity.schema.json accepts a valid capacity record", () => {
  const validate = getValidator("crewCapacity.schema.json");
  const valid = validate({ playerId: "player-1", baseCapacity: 2, purchasedSlots: 1 });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("crewCapacity.schema.json rejects a negative purchasedSlots", () => {
  const validate = getValidator("crewCapacity.schema.json");
  const valid = validate({ playerId: "player-1", baseCapacity: 2, purchasedSlots: -1 });
  assert.equal(valid, false);
});

test("planetCrewPool.schema.json accepts a valid pool with crew candidate entries", () => {
  const validate = getValidator("planetCrewPool.schema.json");
  const valid = validate({
    planetId: "delta-rigelus",
    availableHires: [{ id: "candidate-1", tier: "Blue", profession: null }],
    lastRefreshedAt: 0,
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("planetCrewPool.schema.json accepts an empty pool", () => {
  const validate = getValidator("planetCrewPool.schema.json");
  const valid = validate({ planetId: "delta-rigelus", availableHires: [], lastRefreshedAt: 0 });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("planetCrewPool.schema.json rejects a pool containing an invalid crew candidate", () => {
  const validate = getValidator("planetCrewPool.schema.json");
  const valid = validate({
    planetId: "delta-rigelus",
    availableHires: [{ id: "candidate-1", tier: "NotATier", profession: null }],
    lastRefreshedAt: 0,
  });
  assert.equal(valid, false);
});

function baseQualityRoll(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { purity: 50, density: 50, potency: 50, durability: 50, rarity: 50, ...overrides };
}

function baseShipComponent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "component-1",
    category: "engine",
    qualities: baseQualityRoll(),
    tier: "Blue",
    ...overrides,
  };
}

function emptyComponentSlots(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { weapon: null, engine: null, shield: null, cargoHold: null, ...overrides };
}

test("componentCategory.schema.json only accepts the 4 documented categories", () => {
  const validate = getValidator("componentCategory.schema.json");
  assert.equal(validate("weapon"), true);
  assert.equal(validate("engine"), true);
  assert.equal(validate("shield"), true);
  assert.equal(validate("cargoHold"), true);
  assert.equal(validate("sensor"), false);
});

test("qualityRoll.schema.json accepts a full roll and preserves null for non-applicable qualities", () => {
  const validate = getValidator("qualityRoll.schema.json");
  const valid = validate(baseQualityRoll({ durability: null }));
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("qualityRoll.schema.json rejects a value of 0 (never a valid quality value)", () => {
  const validate = getValidator("qualityRoll.schema.json");
  const valid = validate(baseQualityRoll({ purity: 0 }));
  assert.equal(valid, false);
});

test("shipComponent.schema.json accepts a valid component", () => {
  const validate = getValidator("shipComponent.schema.json");
  const valid = validate(baseShipComponent());
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("shipComponent.schema.json rejects an invalid category", () => {
  const validate = getValidator("shipComponent.schema.json");
  const valid = validate(baseShipComponent({ category: "sensor" }));
  assert.equal(valid, false);
});

test("ship.schema.json accepts a fully-assembled ship", () => {
  const validate = getValidator("ship.schema.json");
  const valid = validate({
    id: "ship-1",
    name: "Ship-1",
    ownerId: "player-1",
    tier: "Blue",
    currentPlanetId: "delta-rigelus",
    components: emptyComponentSlots({
      weapon: baseShipComponent({ id: "weapon-1", category: "weapon" }),
      engine: baseShipComponent({ id: "engine-1", category: "engine" }),
      shield: baseShipComponent({ id: "shield-1", category: "shield" }),
      cargoHold: baseShipComponent({ id: "cargo-1", category: "cargoHold" }),
    }),
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("ship.schema.json accepts a ship under construction with all four component slots null", () => {
  const validate = getValidator("ship.schema.json");
  const valid = validate({
    id: "ship-2",
    name: "Ship-2",
    ownerId: "player-1",
    tier: "Grey",
    currentPlanetId: "delta-rigelus",
    components: emptyComponentSlots(),
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("ship.schema.json rejects a missing ownerId", () => {
  const validate = getValidator("ship.schema.json");
  const valid = validate({
    id: "ship-3",
    name: "Ship-3",
    tier: "Grey",
    currentPlanetId: "delta-rigelus",
    components: emptyComponentSlots(),
  });
  assert.equal(valid, false);
});

test("ship.schema.json rejects a missing currentPlanetId", () => {
  const validate = getValidator("ship.schema.json");
  const valid = validate({
    id: "ship-4",
    name: "Ship-4",
    ownerId: "player-1",
    tier: "Grey",
    components: emptyComponentSlots(),
  });
  assert.equal(valid, false);
});

test("shipCandidate.schema.json accepts a valid pool candidate (no ownerId field)", () => {
  const validate = getValidator("shipCandidate.schema.json");
  const valid = validate({
    id: "candidate-1",
    name: "Ship-candidate-1",
    tier: "Green",
    components: emptyComponentSlots(),
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("shipyardPool.schema.json accepts a valid pool and rejects one containing an invalid candidate", () => {
  const validate = getValidator("shipyardPool.schema.json");
  const valid = validate({
    planetId: "delta-rigelus",
    availableShips: [{ id: "candidate-1", name: "Ship-candidate-1", tier: "Green", components: emptyComponentSlots() }],
    lastRefreshedAt: 0,
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));

  const invalid = validate({
    planetId: "delta-rigelus",
    availableShips: [{ id: "candidate-1", name: "Ship-candidate-1", tier: "NotATier", components: emptyComponentSlots() }],
    lastRefreshedAt: 0,
  });
  assert.equal(invalid, false);
});

test("voyage.schema.json accepts a valid voyage with cargo", () => {
  const validate = getValidator("voyage.schema.json");
  const valid = validate({
    id: "voyage-1",
    shipId: "ship-1",
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    departedAt: 0,
    arrivesAt: 1000,
    cargo: [{ itemId: "ion-forged-hull-plate", quantity: 1 }],
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("voyage.schema.json accepts an empty cargo array", () => {
  const validate = getValidator("voyage.schema.json");
  const valid = validate({
    id: "voyage-2",
    shipId: "ship-1",
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    departedAt: 0,
    arrivesAt: 1000,
    cargo: [],
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("voyage.schema.json rejects a zero-quantity cargo entry", () => {
  const validate = getValidator("voyage.schema.json");
  const valid = validate({
    id: "voyage-3",
    shipId: "ship-1",
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    departedAt: 0,
    arrivesAt: 1000,
    cargo: [{ itemId: "ion-forged-hull-plate", quantity: 0 }],
  });
  assert.equal(valid, false);
});

test("voyage.schema.json accepts a voyage with no `encounters` field at all -- backward compatible with pre-Travel-Encounters persisted data", () => {
  const validate = getValidator("voyage.schema.json");
  const valid = validate({
    id: "voyage-no-encounters",
    shipId: "ship-1",
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    departedAt: 0,
    arrivesAt: 1000,
    cargo: [],
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("voyage.schema.json accepts a voyage with one of each encounter type", () => {
  const validate = getValidator("voyage.schema.json");
  const valid = validate({
    id: "voyage-with-encounters",
    shipId: "ship-1",
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    departedAt: 0,
    arrivesAt: 1000,
    cargo: [],
    encounters: [
      { type: "tradeOpportunity", windowIndex: 0, outcome: { creditsGranted: 75 } },
      {
        type: "discovery",
        windowIndex: 1,
        outcome: {
          resourceId: "igneous-ore",
          qualities: { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 },
        },
      },
      { type: "hazard", windowIndex: 2, outcome: { passed: false, creditsLost: 45 } },
    ],
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("voyage.schema.json accepts an empty encounters array", () => {
  const validate = getValidator("voyage.schema.json");
  const valid = validate({
    id: "voyage-empty-encounters",
    shipId: "ship-1",
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    departedAt: 0,
    arrivesAt: 1000,
    cargo: [],
    encounters: [],
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("voyage.schema.json rejects an encounter with an invalid type value", () => {
  const validate = getValidator("voyage.schema.json");
  const valid = validate({
    id: "voyage-bad-encounter",
    shipId: "ship-1",
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    departedAt: 0,
    arrivesAt: 1000,
    cargo: [],
    encounters: [{ type: "combat", windowIndex: 0, outcome: {} }],
  });
  assert.equal(valid, false);
});

test("voyage.schema.json rejects a discovery encounter with a hazard-shaped outcome (wrong outcome for its own type)", () => {
  const validate = getValidator("voyage.schema.json");
  const valid = validate({
    id: "voyage-mismatched-encounter",
    shipId: "ship-1",
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    departedAt: 0,
    arrivesAt: 1000,
    cargo: [],
    encounters: [{ type: "discovery", windowIndex: 0, outcome: { passed: true, creditsLost: 0 } }],
  });
  assert.equal(valid, false);
});

test("componentRecipe.schema.json accepts a valid recipe-to-category link", () => {
  const validate = getValidator("componentRecipe.schema.json");
  const valid = validate({ recipeId: "recipe-engine-mk1", category: "engine" });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("componentRecipe.schema.json rejects an invalid category", () => {
  const validate = getValidator("componentRecipe.schema.json");
  const valid = validate({ recipeId: "recipe-engine-mk1", category: "sensor" });
  assert.equal(valid, false);
});

test("scanner.schema.json accepts a valid owned scanner", () => {
  const validate = getValidator("scanner.schema.json");
  const valid = validate({ id: "scanner-1", tier: "Blue", ownerId: "player-1" });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("scanner.schema.json rejects a missing ownerId", () => {
  const validate = getValidator("scanner.schema.json");
  const valid = validate({ id: "scanner-1", tier: "Blue" });
  assert.equal(valid, false);
});

test("scannerCandidate.schema.json accepts a valid pool candidate (no ownerId field)", () => {
  const validate = getValidator("scannerCandidate.schema.json");
  const valid = validate({ id: "candidate-1", tier: "Green" });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("scannerCandidate.schema.json rejects a missing tier", () => {
  const validate = getValidator("scannerCandidate.schema.json");
  const valid = validate({ id: "candidate-1" });
  assert.equal(valid, false);
});

test("scannerPool.schema.json accepts a valid pool and rejects one containing an invalid candidate", () => {
  const validate = getValidator("scannerPool.schema.json");
  const valid = validate({
    planetId: "delta-rigelus",
    availableScanners: [{ id: "candidate-1", tier: "Green" }],
    lastRefreshedAt: 0,
  });
  assert.equal(valid, true, JSON.stringify(validate.errors));

  const invalid = validate({
    planetId: "delta-rigelus",
    availableScanners: [{ id: "candidate-1", tier: "NotATier" }],
    lastRefreshedAt: 0,
  });
  assert.equal(invalid, false);
});

test("scannerPool.schema.json accepts an empty pool", () => {
  const validate = getValidator("scannerPool.schema.json");
  const valid = validate({ planetId: "delta-rigelus", availableScanners: [], lastRefreshedAt: 0 });
  assert.equal(valid, true, JSON.stringify(validate.errors));
});

test("quality.schema.json and tierColor.schema.json only accept their documented enum values", () => {
  const quality = getValidator("quality.schema.json");
  const tier = getValidator("tierColor.schema.json");
  assert.equal(quality("durability"), true);
  assert.equal(quality("strength"), false);
  assert.equal(tier("Gold"), true);
  assert.equal(tier("Diamond"), false);
});
