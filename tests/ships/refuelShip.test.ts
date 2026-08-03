import { test } from "node:test";
import assert from "node:assert/strict";
import { refuelShip } from "../../src/ships/refuelShip.ts";
import { REFUEL_COST_PER_UNIT } from "../../src/data/constants/shipsAndTravelConfig.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { Wallet } from "../../src/data/types/wallet.ts";
import type { Planet } from "../../src/data/types/planet.ts";

// Ship Fuel (profitable-design-questions.md), plus the Citadels amendment's
// Level 2+ refuel-discount hook (planet-ownership.md). Agent 20's own
// Definition of Done named this file; it was never actually written until
// task #89's follow-on pass added the Citadel discount and this coverage
// alongside it.

function ship(overrides: Partial<Ship> = {}): Ship {
  return {
    id: "ship-1",
    name: "Ship-1",
    ownerId: "player-1",
    tier: "Grey",
    currentPlanetId: "planet-a",
    fuelCapacity: 100,
    currentFuel: 50,
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
    ...overrides,
  };
}

function wallet(overrides: Partial<Wallet> = {}): Wallet {
  return { playerId: "player-1", credits: 1000, ...overrides };
}

function planet(overrides: Partial<Planet> = {}): Planet {
  return { id: "planet-a", name: "Planet A", producibleResourceIds: [], ...overrides };
}

test("refuelShip() rejects a non-positive amount", () => {
  const result = refuelShip(ship(), wallet(), 0);
  assert.equal(result.refueled, false);
});

test("refuelShip() rejects insufficient funds", () => {
  const result = refuelShip(ship(), wallet({ credits: 1 }), 50);
  assert.equal(result.refueled, false);
});

test("refuelShip() rejects an amount that would exceed fuel capacity", () => {
  const result = refuelShip(ship({ currentFuel: 90, fuelCapacity: 100 }), wallet(), 20);
  assert.equal(result.refueled, false);
});

test("refuelShip() charges the flat rate with no dockedPlanet supplied", () => {
  const result = refuelShip(ship(), wallet(), 20);
  assert.equal(result.refueled, true);
  if (!result.refueled) return;
  assert.equal(result.updatedShip.currentFuel, 70);
  assert.equal(result.updatedWallet.credits, 1000 - 20 * REFUEL_COST_PER_UNIT);
});

test("refuelShip() charges the flat rate at an unowned planet", () => {
  const result = refuelShip(ship(), wallet(), 20, planet());
  assert.equal(result.refueled, true);
  if (!result.refueled) return;
  assert.equal(result.updatedWallet.credits, 1000 - 20 * REFUEL_COST_PER_UNIT);
});

test("refuelShip() charges the flat rate at a Level 1 (docking-only) citadel", () => {
  const result = refuelShip(ship(), wallet(), 20, planet({ citadelLevel: 1, ownedByPlayerId: "player-1" }));
  assert.equal(result.refueled, true);
  if (!result.refueled) return;
  assert.equal(result.updatedWallet.credits, 1000 - 20 * REFUEL_COST_PER_UNIT);
});

test("refuelShip() applies the Level 2 discount at an owned citadel", () => {
  const result = refuelShip(ship(), wallet(), 20, planet({ citadelLevel: 2, ownedByPlayerId: "player-1" }));
  assert.equal(result.refueled, true);
  if (!result.refueled) return;
  const discountedCost = Math.round(20 * REFUEL_COST_PER_UNIT * 0.75);
  assert.equal(result.updatedWallet.credits, 1000 - discountedCost);
  assert.ok(discountedCost < 20 * REFUEL_COST_PER_UNIT);
});

test("refuelShip() applies the Level 3 discount at an owned citadel", () => {
  const result = refuelShip(ship(), wallet(), 20, planet({ citadelLevel: 3, ownedByPlayerId: "player-1" }));
  assert.equal(result.refueled, true);
  if (!result.refueled) return;
  const discountedCost = Math.round(20 * REFUEL_COST_PER_UNIT * 0.75);
  assert.equal(result.updatedWallet.credits, 1000 - discountedCost);
});

test("refuelShip() does not apply the discount at a citadel owned by someone else", () => {
  const result = refuelShip(ship(), wallet(), 20, planet({ citadelLevel: 3, ownedByPlayerId: "someone-else" }));
  assert.equal(result.refueled, true);
  if (!result.refueled) return;
  assert.equal(result.updatedWallet.credits, 1000 - 20 * REFUEL_COST_PER_UNIT);
});
