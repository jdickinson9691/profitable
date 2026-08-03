import { test } from "node:test";
import assert from "node:assert/strict";
import { purchaseShip } from "../../src/ships/purchaseShip.ts";
import type { ShipCandidate } from "../../src/data/types/shipCandidate.ts";
import type { ShipyardPool } from "../../src/data/types/shipyardPool.ts";
import type { Wallet } from "../../src/data/types/wallet.ts";
import type { PurchaseShipSucceeded } from "../../src/data/types/purchaseShipResult.ts";
import { FUEL_CAPACITY_BY_TIER } from "../../src/data/constants/shipsAndTravelConfig.ts";

const candidate: ShipCandidate = {
  id: "candidate-1",
  name: "Ship-candidate-1",
  tier: "Blue",
  components: { weapon: null, engine: null, shield: null, cargoHold: null },
};

function basePool(overrides: Partial<ShipyardPool> = {}): ShipyardPool {
  return { planetId: "delta-rigelus", availableShips: [candidate], lastRefreshedAt: 0, ...overrides };
}

function baseWallet(overrides: Partial<Wallet> = {}): Wallet {
  return { playerId: "player-1", credits: 5000, ...overrides };
}

test("purchaseShip() succeeds: deducts the exact tier-scaled cost, removes the candidate from the pool", () => {
  const result = purchaseShip(candidate, basePool(), baseWallet(), "player-1") as PurchaseShipSucceeded;

  assert.equal(result.purchased, true);
  assert.equal(result.updatedWallet.credits, 5000 - 2200); // Blue tier ship purchase cost
  assert.equal(result.updatedPool.availableShips.length, 0);
});

test("purchaseShip() creates a Ship owned by the buyer, located at the shipyard's planet", () => {
  const result = purchaseShip(candidate, basePool(), baseWallet(), "player-1") as PurchaseShipSucceeded;

  const blueFuelCapacity = FUEL_CAPACITY_BY_TIER.find((e) => e.tier === "Blue")!.capacity;
  assert.deepEqual(result.ship, {
    id: "candidate-1",
    name: "Ship-candidate-1",
    ownerId: "player-1",
    tier: "Blue",
    currentPlanetId: "delta-rigelus",
    fuelCapacity: blueFuelCapacity,
    currentFuel: blueFuelCapacity,
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
  });
});

test("purchaseShip() gives a freshly-purchased ship a full tank at its own tier's capacity", () => {
  const result = purchaseShip(candidate, basePool(), baseWallet(), "player-1") as PurchaseShipSucceeded;
  assert.equal(result.ship.currentFuel, result.ship.fuelCapacity);
});

test("purchaseShip() rejects a candidate not present in the pool", () => {
  const stranger: ShipCandidate = { ...candidate, id: "not-in-pool" };
  const result = purchaseShip(stranger, basePool(), baseWallet(), "player-1");
  assert.equal(result.purchased, false);
});

test("purchaseShip() rejects when the wallet can't cover the purchase cost", () => {
  const result = purchaseShip(candidate, basePool(), baseWallet({ credits: 100 }), "player-1");
  assert.equal(result.purchased, false);
});
