import { test } from "node:test";
import assert from "node:assert/strict";
import { initiateVoyage } from "../../src/ships/initiateVoyage.ts";
import { calculateTravelTime } from "../../src/ships/calculateTravelTime.ts";
import type { Planet } from "../../src/data/types/planet.ts";
import type { Ship } from "../../src/data/types/ship.ts";

function planet(id: string, x: number, y: number): Planet {
  return { id, name: id, producibleResourceIds: ["igneous-ore"], position: { x, y } };
}

function ship(tier: Ship["tier"] = "Grey"): Ship {
  return {
    id: "ship-1",
    name: "Ship-1",
    ownerId: "player-1",
    tier,
    currentPlanetId: "origin",
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
  };
}

const origin = planet("origin", 0, 0);
const destination = planet("destination", 300, 400);

test("initiateVoyage() sets arrivesAt to currentTime + calculateTravelTime()'s exact output", () => {
  const currentTime = 1000;
  const s = ship("Grey");
  const voyage = initiateVoyage(s, origin, destination, [], currentTime, "voyage-1");

  const expectedTravelTime = calculateTravelTime(origin, destination, s);
  assert.equal(voyage.arrivesAt, currentTime + expectedTravelTime);
  assert.equal(voyage.departedAt, currentTime);
});

test("initiateVoyage() records the correct shipId/originPlanetId/destinationPlanetId", () => {
  const voyage = initiateVoyage(ship(), origin, destination, [], 0, "voyage-1");
  assert.equal(voyage.shipId, "ship-1");
  assert.equal(voyage.originPlanetId, "origin");
  assert.equal(voyage.destinationPlanetId, "destination");
});

test("initiateVoyage() carries cargo through unchanged, supporting the Phase 3 remote-sale mechanic", () => {
  const cargo = [{ itemId: "ion-forged-hull-plate", quantity: 1 }];
  const voyage = initiateVoyage(ship(), origin, destination, cargo, 0, "voyage-1");
  assert.deepEqual(voyage.cargo, cargo);
});

test("initiateVoyage() locks in arrivesAt at departure time -- a later ship-tier change does not retroactively affect it", () => {
  const greyShip = ship("Grey");
  const voyage = initiateVoyage(greyShip, origin, destination, [], 1000, "voyage-1");

  // Simulate the ship being upgraded to Gold *after* the voyage already
  // departed -- initiateVoyage() was never called again, so nothing
  // should change about the already-locked-in arrival time.
  const upgradedShip = { ...greyShip, tier: "Gold" as const };
  const goldTravelTime = calculateTravelTime(origin, destination, upgradedShip);

  assert.notEqual(voyage.arrivesAt, 1000 + goldTravelTime);
  assert.equal(voyage.arrivesAt, 1000 + calculateTravelTime(origin, destination, greyShip));
});
