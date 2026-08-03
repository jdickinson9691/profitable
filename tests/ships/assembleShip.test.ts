import { test } from "node:test";
import assert from "node:assert/strict";
import { assembleShip } from "../../src/ships/assembleShip.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { ShipComponent } from "../../src/data/types/shipComponent.ts";

function bareShip(): Ship {
  return {
    id: "ship-1",
    name: "Ship-1",
    ownerId: "player-1",
    tier: "Grey",
    currentPlanetId: "delta-rigelus",
    fuelCapacity: 100,
    currentFuel: 100,
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
  };
}

function goldEngine(): ShipComponent {
  return {
    id: "engine-1",
    category: "engine",
    qualities: { purity: 98, density: 98, potency: 98, durability: 98, rarity: 98 },
    tier: "Gold",
  };
}

test("assembleShip() installs the component into the specified slot", () => {
  const result = assembleShip(bareShip(), goldEngine(), "engine");
  assert.deepEqual(result.components.engine, goldEngine());
});

test("assembleShip() recomputes ship.tier after installation -- never stale", () => {
  const result = assembleShip(bareShip(), goldEngine(), "engine");
  assert.equal(result.tier, "Gold");
});

test("assembleShip() replaces whatever was previously in that slot", () => {
  const shipWithGrey: Ship = {
    ...bareShip(),
    components: {
      ...bareShip().components,
      engine: { id: "old-engine", category: "engine", qualities: { purity: 10, density: 10, potency: 10, durability: 10, rarity: 10 }, tier: "Grey" },
    },
  };
  const result = assembleShip(shipWithGrey, goldEngine(), "engine");
  assert.equal(result.components.engine?.id, "engine-1");
});

test("assembleShip() throws when the component's category doesn't match the target slot", () => {
  assert.throws(() => assembleShip(bareShip(), goldEngine(), "weapon"));
});

test("assembleShip() does not mutate the input ship", () => {
  const ship = bareShip();
  const snapshot = JSON.parse(JSON.stringify(ship));
  assembleShip(ship, goldEngine(), "engine");
  assert.deepEqual(ship, snapshot);
});
