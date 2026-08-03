import { test } from "node:test";
import assert from "node:assert/strict";
import { refreshShipyardPool } from "../../src/ships/refreshShipyardPool.ts";
import { deriveShipTier } from "../../src/ships/deriveShipTier.ts";
import { SHIPYARD_POOL_SIZE_PER_PLANET } from "../../src/data/constants/shipsAndTravelConfig.ts";

test("refreshShipyardPool() produces exactly SHIPYARD_POOL_SIZE_PER_PLANET candidates", () => {
  const pool = refreshShipyardPool("delta-rigelus", "seed-1", 0);
  assert.equal(pool.availableShips.length, SHIPYARD_POOL_SIZE_PER_PLANET);
});

test("refreshShipyardPool() is deterministic given the same seed", () => {
  const a = refreshShipyardPool("delta-rigelus", "seed-1", 0);
  const b = refreshShipyardPool("delta-rigelus", "seed-1", 0);
  assert.deepEqual(a, b);
});

test("refreshShipyardPool() with no seed produces a different pool on a separate call", () => {
  const a = refreshShipyardPool("delta-rigelus");
  const b = refreshShipyardPool("delta-rigelus");
  assert.notDeepEqual(a.availableShips, b.availableShips);
});

test("refreshShipyardPool() sets lastRefreshedAt to the given time", () => {
  const pool = refreshShipyardPool("delta-rigelus", "seed-1", 12345);
  assert.equal(pool.lastRefreshedAt, 12345);
});

test("refreshShipyardPool() gives every candidate a unique id", () => {
  const pool = refreshShipyardPool("delta-rigelus", "seed-1", 0);
  const ids = pool.availableShips.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("refreshShipyardPool() generates components matching the candidate's own rolled tier, across many pools", () => {
  for (let i = 0; i < 20; i++) {
    const pool = refreshShipyardPool("delta-rigelus", `seed-${i}`, 0);
    for (const candidate of pool.availableShips) {
      assert.equal(
        deriveShipTier({ ...candidate, ownerId: "x", currentPlanetId: "y", fuelCapacity: 100, currentFuel: 100 }),
        candidate.tier,
      );
      assert.equal(candidate.components.weapon?.tier, candidate.tier);
      assert.equal(candidate.components.engine?.tier, candidate.tier);
      assert.equal(candidate.components.shield?.tier, candidate.tier);
      assert.equal(candidate.components.cargoHold?.tier, candidate.tier);
    }
  }
});
