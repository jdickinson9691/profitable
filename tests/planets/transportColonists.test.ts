import { test } from "node:test";
import assert from "node:assert/strict";
import { transportColonists } from "../../src/planets/transportColonists.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { Planet } from "../../src/data/types/planet.ts";
import type { Wallet } from "../../src/data/types/wallet.ts";
import { DEFAULT_PLANET_OWNERSHIP_ENTRY } from "../../src/data/types/planetOwnershipEntry.ts";
import { COLONIST_TRANSPORT_COST } from "../../src/data/constants/planetOwnership.ts";

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
  return { playerId: "player-1", credits: 1000, ...overrides };
}

test("transportColonists() rejects when the ship isn't docked at the destination planet", () => {
  const result = transportColonists(
    ship({ currentPlanetId: "somewhere-else" }),
    planet(),
    5,
    wallet(),
    DEFAULT_PLANET_OWNERSHIP_ENTRY,
  );
  assert.equal(result.success, false);
});

test("transportColonists() rejects a non-positive quantity", () => {
  const result = transportColonists(ship(), planet(), 0, wallet(), DEFAULT_PLANET_OWNERSHIP_ENTRY);
  assert.equal(result.success, false);
});

test("transportColonists() rejects on insufficient funds", () => {
  const result = transportColonists(
    ship(),
    planet(),
    100,
    wallet({ credits: 1 }),
    DEFAULT_PLANET_OWNERSHIP_ENTRY,
  );
  assert.equal(result.success, false);
});

test("transportColonists() deducts exactly quantity * COLONIST_TRANSPORT_COST and increments colonistCount", () => {
  const result = transportColonists(ship(), planet(), 5, wallet({ credits: 1000 }), DEFAULT_PLANET_OWNERSHIP_ENTRY);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.updatedWallet.credits, 1000 - 5 * COLONIST_TRANSPORT_COST);
    assert.equal(result.updatedOwnershipEntry.colonistCount, 5);
  }
});

test("transportColonists() adds to an existing colonistCount rather than overwriting it", () => {
  const existing = { ...DEFAULT_PLANET_OWNERSHIP_ENTRY, colonistCount: 3 };
  const result = transportColonists(ship(), planet(), 2, wallet(), existing);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.updatedOwnershipEntry.colonistCount, 5);
  }
});

test("transportColonists() preserves citadelLevel/ownedByPlayerId on the updated entry", () => {
  const existing = { colonistCount: 0, citadelLevel: 2 as const, ownedByPlayerId: "player-1" };
  const result = transportColonists(ship(), planet(), 1, wallet(), existing);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.updatedOwnershipEntry.citadelLevel, 2);
    assert.equal(result.updatedOwnershipEntry.ownedByPlayerId, "player-1");
  }
});
