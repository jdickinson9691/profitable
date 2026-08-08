import { test } from "node:test";
import assert from "node:assert/strict";
import { refuelShip } from "../../src/ships/refuelShip.ts";
import { REFUEL_COST_PER_UNIT } from "../../src/data/constants/shipsAndTravelConfig.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { Wallet } from "../../src/data/types/wallet.ts";

// Ship Fuel (profitable-design-questions.md).
//
// Retroactive removal (2026-08-04): this file used to also cover the
// Citadels amendment's Level 2+ refuel-discount hook (planet-ownership.md)
// -- see that doc's own retroactive note. refuelShip() reverted to its
// original flat-rate-only signature; those discount cases are removed.

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

test("refuelShip() charges the flat rate", () => {
  const result = refuelShip(ship(), wallet(), 20);
  assert.equal(result.refueled, true);
  if (!result.refueled) return;
  assert.equal(result.updatedShip.currentFuel, 70);
  assert.equal(result.updatedWallet.credits, 1000 - 20 * REFUEL_COST_PER_UNIT);
});
