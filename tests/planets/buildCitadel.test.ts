import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCitadel } from "../../src/planets/buildCitadel.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { Planet } from "../../src/data/types/planet.ts";
import type { Wallet } from "../../src/data/types/wallet.ts";
import type { PlanetOwnershipEntry } from "../../src/data/types/planetOwnershipEntry.ts";
import { CITADEL_LEVEL_BENEFITS } from "../../src/data/constants/planetOwnership.ts";

function ship(overrides: Partial<Ship> = {}): Ship {
  return {
    id: "ship-1",
    name: "Ship",
    ownerId: "player-1",
    tier: "Grey",
    currentPlanetId: "planet-a",
    fuelCapacity: 100,
    currentFuel: 100,
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
    ...overrides,
  };
}

function planet(overrides: Partial<Planet> = {}): Planet {
  return { id: "planet-a", name: "Planet A", producibleResourceIds: [], ...overrides };
}

function wallet(overrides: Partial<Wallet> = {}): Wallet {
  return { playerId: "player-1", credits: 10_000, ...overrides };
}

function ownedEntry(overrides: Partial<PlanetOwnershipEntry> = {}): PlanetOwnershipEntry {
  return { colonistCount: 100, citadelLevel: 0, ownedByPlayerId: "player-1", ...overrides };
}

test("buildCitadel() rejects when the ship isn't docked at the planet", () => {
  const result = buildCitadel(ship({ currentPlanetId: "elsewhere" }), planet(), 1, wallet(), 0, ownedEntry());
  assert.equal(result.success, false);
});

test("buildCitadel() rejects without ownership", () => {
  const result = buildCitadel(ship(), planet(), 1, wallet(), 0, ownedEntry({ ownedByPlayerId: null }));
  assert.equal(result.success, false);
});

test("buildCitadel() rejects out of sequence (can't skip from level 0 to 2)", () => {
  const result = buildCitadel(ship(), planet(), 2, wallet(), 100, ownedEntry({ citadelLevel: 0 }));
  assert.equal(result.success, false);
});

test("buildCitadel() rejects on insufficient funds", () => {
  const level1Cost = CITADEL_LEVEL_BENEFITS.find((b) => b.level === 1)!.constructionCost.credits;
  const result = buildCitadel(ship(), planet(), 1, wallet({ credits: level1Cost - 1 }), 0, ownedEntry());
  assert.equal(result.success, false);
});

test("buildCitadel() rejects on insufficient materials", () => {
  const result = buildCitadel(ship(), planet(), 2, wallet(), 0, ownedEntry({ citadelLevel: 1 }));
  assert.equal(result.success, false);
});

test("buildCitadel() succeeds for level 1 (no material required) and deducts exact credits", () => {
  const level1 = CITADEL_LEVEL_BENEFITS.find((b) => b.level === 1)!;
  const result = buildCitadel(ship(), planet(), 1, wallet({ credits: 10_000 }), 0, ownedEntry());
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.updatedWallet.credits, 10_000 - level1.constructionCost.credits);
    assert.equal(result.updatedOwnershipEntry.citadelLevel, 1);
    assert.equal(result.materialQuantityConsumed, 0);
    assert.equal(result.materialResourceId, null);
  }
});

test("buildCitadel() succeeds for level 2 with sufficient materials, reporting what to consume", () => {
  const level2 = CITADEL_LEVEL_BENEFITS.find((b) => b.level === 2)!;
  const materialQty = level2.constructionCost.material!.quantity;
  const result = buildCitadel(ship(), planet(), 2, wallet(), materialQty, ownedEntry({ citadelLevel: 1 }));
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.updatedOwnershipEntry.citadelLevel, 2);
    assert.equal(result.materialResourceId, level2.constructionCost.material!.resourceId);
    assert.equal(result.materialQuantityConsumed, materialQty);
  }
});
