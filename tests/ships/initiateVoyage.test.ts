import { test } from "node:test";
import assert from "node:assert/strict";
import { initiateVoyage } from "../../src/ships/initiateVoyage.ts";
import { calculateTravelTime } from "../../src/ships/calculateTravelTime.ts";
import { calculateFuelCost } from "../../src/ships/calculateFuelCost.ts";
import type { Planet } from "../../src/data/types/planet.ts";
import type { Ship } from "../../src/data/types/ship.ts";

function planet(id: string, x: number, y: number): Planet {
  return { id, name: id, producibleResourceIds: ["igneous-ore"], position: { x, y } };
}

function ship(overrides: Partial<Ship> = {}): Ship {
  return {
    id: "ship-1",
    name: "Ship-1",
    ownerId: "player-1",
    tier: "Grey",
    currentPlanetId: "origin",
    fuelCapacity: 100,
    currentFuel: 100,
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
    ...overrides,
  };
}

const origin = planet("origin", 0, 0);
const destination = planet("destination", 300, 400);

test("initiateVoyage() sets arrivesAt to currentTime + calculateTravelTime()'s exact output", () => {
  const currentTime = 1000;
  const s = ship({ tier: "Grey" });
  const { voyage } = initiateVoyage(s, origin, destination, [], currentTime, "voyage-1");

  const expectedTravelTime = calculateTravelTime(origin, destination, s);
  assert.equal(voyage.arrivesAt, currentTime + expectedTravelTime);
  assert.equal(voyage.departedAt, currentTime);
});

test("initiateVoyage() records the correct shipId/originPlanetId/destinationPlanetId", () => {
  const { voyage } = initiateVoyage(ship(), origin, destination, [], 0, "voyage-1");
  assert.equal(voyage.shipId, "ship-1");
  assert.equal(voyage.originPlanetId, "origin");
  assert.equal(voyage.destinationPlanetId, "destination");
});

test("initiateVoyage() carries cargo through unchanged, supporting the Phase 3 remote-sale mechanic", () => {
  const cargo = [{ itemId: "ion-forged-hull-plate", quantity: 1 }];
  const { voyage } = initiateVoyage(ship(), origin, destination, cargo, 0, "voyage-1");
  assert.deepEqual(voyage.cargo, cargo);
});

test("initiateVoyage() locks in arrivesAt at departure time -- a later ship-tier change does not retroactively affect it", () => {
  const greyShip = ship({ tier: "Grey" });
  const { voyage } = initiateVoyage(greyShip, origin, destination, [], 1000, "voyage-1");

  // Simulate the ship being upgraded to Gold *after* the voyage already
  // departed -- initiateVoyage() was never called again, so nothing
  // should change about the already-locked-in arrival time.
  const upgradedShip = { ...greyShip, tier: "Gold" as const };
  const goldTravelTime = calculateTravelTime(origin, destination, upgradedShip);

  assert.notEqual(voyage.arrivesAt, 1000 + goldTravelTime);
  assert.equal(voyage.arrivesAt, 1000 + calculateTravelTime(origin, destination, greyShip));
});

// --- Ship Fuel amendment ---

test("initiateVoyage() throws when currentFuel is below the computed fuel cost", () => {
  const cost = calculateFuelCost(origin, destination);
  const underfueled = ship({ currentFuel: cost - 1 });
  assert.throws(() => initiateVoyage(underfueled, origin, destination, [], 0, "voyage-1"));
});

test("initiateVoyage() deducts exactly calculateFuelCost() from currentFuel on success", () => {
  const s = ship({ currentFuel: 100 });
  const cost = calculateFuelCost(origin, destination);
  const { updatedShip } = initiateVoyage(s, origin, destination, [], 0, "voyage-1");
  assert.equal(updatedShip.currentFuel, 100 - cost);
});

test("initiateVoyage() does not mutate the input Ship on success or rejection", () => {
  const s = ship({ currentFuel: 100 });
  const snapshot = JSON.parse(JSON.stringify(s));
  initiateVoyage(s, origin, destination, [], 0, "voyage-1");
  assert.deepEqual(s, snapshot);

  const underfueled = ship({ currentFuel: 0 });
  const underfueledSnapshot = JSON.parse(JSON.stringify(underfueled));
  assert.throws(() => initiateVoyage(underfueled, origin, destination, [], 0, "voyage-1"));
  assert.deepEqual(underfueled, underfueledSnapshot);
});

// --- Cargo Hold Capacity amendment ---

test("initiateVoyage() throws when supplied cargo quantity exceeds cargoHold capacity", () => {
  // Grey tier (no cargoHold component) caps at 5 per CARGO_HOLD_CAPACITY_BY_TIER.
  const cargo = [{ itemId: "igneous-ore", quantity: 6 }];
  assert.throws(() => initiateVoyage(ship(), origin, destination, cargo, 0, "voyage-1"));
});

test("initiateVoyage() succeeds at exactly the cargo hold capacity", () => {
  const cargo = [{ itemId: "igneous-ore", quantity: 5 }];
  assert.doesNotThrow(() => initiateVoyage(ship(), origin, destination, cargo, 0, "voyage-1"));
});

test("initiateVoyage() gives a ship with no cargoHold component Grey-tier capacity, not zero", () => {
  const cargo = [{ itemId: "igneous-ore", quantity: 1 }];
  assert.doesNotThrow(() => initiateVoyage(ship(), origin, destination, cargo, 0, "voyage-1"));
});

// --- Retreat exemption ---

test("initiateVoyage() skips the fuel check entirely for a retreat voyage", () => {
  const emptyTank = ship({ currentFuel: 0 });
  assert.doesNotThrow(() =>
    initiateVoyage(emptyTank, destination, origin, [], 0, "retreat-1", true),
  );
});

test("initiateVoyage() skips the cargo check entirely for a retreat voyage", () => {
  const emptyTank = ship({ currentFuel: 0 });
  const bigCargo = [{ itemId: "igneous-ore", quantity: 999 }];
  assert.doesNotThrow(() =>
    initiateVoyage(emptyTank, destination, origin, bigCargo, 0, "retreat-1", true),
  );
});

test("initiateVoyage() consumes no fuel for a retreat voyage -- updatedShip is unchanged", () => {
  const s = ship({ currentFuel: 42 });
  const { updatedShip } = initiateVoyage(s, destination, origin, [], 0, "retreat-1", true);
  assert.equal(updatedShip.currentFuel, 42);
});
