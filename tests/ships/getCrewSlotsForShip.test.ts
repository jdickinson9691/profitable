import { test } from "node:test";
import assert from "node:assert/strict";
import { getCrewSlotsForShip } from "../../src/ships/getCrewSlotsForShip.ts";
import { CREW_SLOTS_BY_TIER } from "../../src/data/constants/shipsAndTravelConfig.ts";
import type { Ship } from "../../src/data/types/ship.ts";

function ship(overrides: Partial<Ship> = {}): Ship {
  return {
    id: "ship-1",
    name: "Ship-1",
    ownerId: "player-1",
    tier: "Grey",
    currentPlanetId: "delta-rigelus",
    fuelCapacity: 100,
    currentFuel: 100,
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
    ...overrides,
  };
}

test("getCrewSlotsForShip() returns the CREW_SLOTS_BY_TIER entry matching the ship's derived tier", () => {
  // No components installed -> deriveShipTier() falls back to Grey.
  const entry = getCrewSlotsForShip(ship());
  assert.deepEqual(entry, CREW_SLOTS_BY_TIER.find((e) => e.tier === "Grey"));
});

test("getCrewSlotsForShip() re-derives tier from components, not the ship's own stale .tier field", () => {
  // .tier says Gold but zero components are installed -> derived tier is Grey.
  const entry = getCrewSlotsForShip(ship({ tier: "Gold" }));
  assert.equal(entry.tier, "Grey");
});
