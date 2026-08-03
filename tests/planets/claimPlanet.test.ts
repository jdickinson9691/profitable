import { test } from "node:test";
import assert from "node:assert/strict";
import { claimPlanet } from "../../src/planets/claimPlanet.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { Planet } from "../../src/data/types/planet.ts";
import { DEFAULT_PLANET_OWNERSHIP_ENTRY } from "../../src/data/types/planetOwnershipEntry.ts";
import { MINIMUM_COLONISTS_TO_PRODUCE } from "../../src/data/constants/planetOwnership.ts";

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

test("claimPlanet() rejects when the ship isn't docked at the planet", () => {
  const result = claimPlanet(
    ship({ currentPlanetId: "elsewhere" }),
    planet(),
    "player-1",
    { ...DEFAULT_PLANET_OWNERSHIP_ENTRY, colonistCount: MINIMUM_COLONISTS_TO_PRODUCE },
  );
  assert.equal(result.success, false);
});

test("claimPlanet() rejects below the colonist threshold", () => {
  const result = claimPlanet(ship(), planet(), "player-1", {
    ...DEFAULT_PLANET_OWNERSHIP_ENTRY,
    colonistCount: MINIMUM_COLONISTS_TO_PRODUCE - 1,
  });
  assert.equal(result.success, false);
});

test("claimPlanet() rejects a planet that's already claimed", () => {
  const result = claimPlanet(ship(), planet(), "player-2", {
    colonistCount: MINIMUM_COLONISTS_TO_PRODUCE,
    citadelLevel: 0,
    ownedByPlayerId: "player-1",
  });
  assert.equal(result.success, false);
});

test("claimPlanet() succeeds for a sufficiently-colonized, unclaimed planet and sets ownedByPlayerId", () => {
  const result = claimPlanet(ship(), planet(), "player-1", {
    ...DEFAULT_PLANET_OWNERSHIP_ENTRY,
    colonistCount: MINIMUM_COLONISTS_TO_PRODUCE,
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.updatedOwnershipEntry.ownedByPlayerId, "player-1");
    assert.equal(result.updatedOwnershipEntry.colonistCount, MINIMUM_COLONISTS_TO_PRODUCE);
  }
});
