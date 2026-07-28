import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveArrival } from "../../src/ships/resolveArrival.ts";
import { resolveEncounters } from "../../src/ships/resolveEncounters.ts";
import { queueRandom } from "../fixtures/random.ts";
import { igneousOre } from "../fixtures/resources.ts";
import type { Voyage } from "../../src/data/types/voyage.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { Planet } from "../../src/data/types/planet.ts";
import type { Resource } from "../../src/data/types/resource.ts";
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

// Travel Encounters (Non-Combat) amendment -- regression + integration.
// The most important test in this file, per the amendment's own contract:
// proves the addition is genuinely additive, not just additive-in-intent.

test("regression: resolveArrival() called without destinationPlanet/resources (every pre-amendment call site) is byte-for-byte unaffected -- encounters is simply empty", () => {
  const cargo = [{ itemId: "ion-forged-hull-plate", quantity: 1 }];
  const result = resolveArrival(voyage({ arrivesAt: 1000, cargo }), ship(), 1000) as ArrivalResolved;

  assert.equal(result.resolved, true);
  assert.equal(result.updatedShip.currentPlanetId, "destination");
  assert.deepEqual(result.cargo, cargo);
  assert.equal(result.destinationPlanetId, "destination");
  assert.deepEqual(result.encounters, []);
});

test("regression: arrival timing, cargo delivery, and ship delivery are identical whether or not encounters resolve -- only `encounters` itself differs", () => {
  const destinationPlanet: Planet = {
    id: "destination",
    name: "Destination",
    producibleResourceIds: [igneousOre.id],
    discovered: false,
  };
  const resources: Resource[] = [igneousOre];
  const cargo = [{ itemId: "ion-forged-hull-plate", quantity: 1 }];

  const withoutEncounters = resolveArrival(voyage({ arrivesAt: 1000, cargo }), ship(), 1000) as ArrivalResolved;
  const withEncounters = resolveArrival(
    voyage({ arrivesAt: 1000, cargo }),
    ship(),
    1000,
    destinationPlanet,
    resources,
    queueRandom([0, 0, 0.5]), // forces one tradeOpportunity encounter
  ) as ArrivalResolved;

  assert.equal(withoutEncounters.resolved, withEncounters.resolved);
  assert.deepEqual(withoutEncounters.updatedShip, withEncounters.updatedShip);
  assert.deepEqual(withoutEncounters.cargo, withEncounters.cargo);
  assert.equal(withoutEncounters.destinationPlanetId, withEncounters.destinationPlanetId);

  assert.deepEqual(withoutEncounters.encounters, []);
  assert.equal(withEncounters.encounters.length, 1);
});

test("integration: resolveArrival()'s encounters match a direct resolveEncounters() call with the same inputs -- proving real delegation, not a reimplementation", () => {
  const destinationPlanet: Planet = {
    id: "destination",
    name: "Destination",
    producibleResourceIds: [igneousOre.id],
    discovered: false,
  };
  const resources: Resource[] = [igneousOre];
  const v = voyage({ arrivesAt: 1000 });
  const s = ship();

  const viaArrival = resolveArrival(v, s, 1000, destinationPlanet, resources, queueRandom([0, 0, 0.5])) as ArrivalResolved;
  const direct = resolveEncounters(v, s, destinationPlanet, resources, queueRandom([0, 0, 0.5]));

  assert.deepEqual(viaArrival.encounters, direct);
});
