import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveArrival } from "../../src/ships/resolveArrival.ts";
import type { Voyage } from "../../src/data/types/voyage.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { ArrivalResolved } from "../../src/data/types/arrivalResult.ts";

function ship(): Ship {
  return {
    id: "ship-1",
    name: "Ship-1",
    ownerId: "player-1",
    tier: "Grey",
    currentPlanetId: "origin",
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
  };
}

function voyage(overrides: Partial<Voyage> = {}): Voyage {
  return {
    id: "voyage-1",
    shipId: "ship-1",
    originPlanetId: "origin",
    destinationPlanetId: "destination",
    departedAt: 0,
    arrivesAt: 1000,
    cargo: [],
    ...overrides,
  };
}

test("resolveArrival() rejects resolution before arrivesAt -- explicit early-resolution test", () => {
  const result = resolveArrival(voyage({ arrivesAt: 1000 }), ship(), 999);
  assert.equal(result.resolved, false);
});

test("resolveArrival() succeeds exactly at arrivesAt", () => {
  const result = resolveArrival(voyage({ arrivesAt: 1000 }), ship(), 1000);
  assert.equal(result.resolved, true);
});

test("resolveArrival() delivers the ship to the destination planet", () => {
  const result = resolveArrival(voyage({ arrivesAt: 1000, destinationPlanetId: "destination" }), ship(), 1000) as ArrivalResolved;
  assert.equal(result.updatedShip.currentPlanetId, "destination");
});

test("resolveArrival() reports the exact cargo carried, only once arrived -- proving the Phase 3 remote-sale connection point never fires early", () => {
  const cargo = [{ itemId: "ion-forged-hull-plate", quantity: 1 }];

  const early = resolveArrival(voyage({ arrivesAt: 1000, cargo }), ship(), 500);
  assert.equal(early.resolved, false);

  const onTime = resolveArrival(voyage({ arrivesAt: 1000, cargo }), ship(), 1000) as ArrivalResolved;
  assert.equal(onTime.resolved, true);
  assert.deepEqual(onTime.cargo, cargo);
  assert.equal(onTime.destinationPlanetId, "destination");
});

test("resolveArrival() does not mutate the input ship", () => {
  const s = ship();
  const snapshot = { ...s };
  resolveArrival(voyage(), s, 1000);
  assert.deepEqual(s, snapshot);
});
