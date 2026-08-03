import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateFuelCost } from "../../src/ships/calculateFuelCost.ts";
import { FUEL_CAPACITY_BY_TIER, FUEL_COST_PER_DISTANCE_UNIT } from "../../src/data/constants/shipsAndTravelConfig.ts";
import { POSITION_RANGE } from "../../src/galaxy/generateGalaxy.ts";
import type { Planet } from "../../src/data/types/planet.ts";

// Ship Fuel (profitable-design-questions.md) -- ship.md's own Testing
// Requirements named two checks that were never actually written: a
// hand-calculated fuel cost, and a real regression test locking in
// "Blue is the first always-reachable-in-one-hop tier" against the
// galaxy's actual worst-case route distance (previously just asserted in
// prose, not verified by a test that would fail if either constant drifted
// independently).

function planet(id: string, x: number, y: number): Planet {
  return { id, name: id, producibleResourceIds: [], position: { x, y } };
}

function fuelCapacityFor(tier: string): number {
  const entry = FUEL_CAPACITY_BY_TIER.find((e) => e.tier === tier);
  if (!entry) throw new Error(`no fuel capacity fixture for tier ${tier}`);
  return entry.capacity;
}

test("calculateFuelCost() matches a hand-calculated value for a known origin/destination pair", () => {
  // 3-4-5 triangle: dx=300, dy=400 -> distance=500 exactly.
  const origin = planet("origin", 0, 0);
  const destination = planet("destination", 300, 400);
  const cost = calculateFuelCost(origin, destination);
  assert.equal(cost, 500 * FUEL_COST_PER_DISTANCE_UNIT);
});

test("calculateFuelCost() is symmetric -- origin/destination order doesn't change the cost", () => {
  const a = planet("a", -200, 150);
  const b = planet("b", 400, -300);
  assert.equal(calculateFuelCost(a, b), calculateFuelCost(b, a));
});

test("calculateFuelCost() throws when either planet has no generated position", () => {
  const withPosition = planet("a", 0, 0);
  const withoutPosition: Planet = { id: "b", name: "b", producibleResourceIds: [] };
  assert.throws(() => calculateFuelCost(withPosition, withoutPosition));
  assert.throws(() => calculateFuelCost(withoutPosition, withPosition));
});

test("FUEL_CAPACITY_BY_TIER: Blue is the first tier that can always reach any planet in one hop, verified against the galaxy's real worst-case distance", () => {
  // The galaxy's actual worst case is corner-to-corner: both axes span
  // -POSITION_RANGE to +POSITION_RANGE, so the maximum possible distance
  // between any two generated planets is the diagonal of a
  // (2*POSITION_RANGE) x (2*POSITION_RANGE) square -- not an assumed or
  // separately-guessed figure, derived from the same constant
  // generatePlanet() itself uses to roll positions.
  const maxPossibleDistance = Math.sqrt((2 * POSITION_RANGE) ** 2 + (2 * POSITION_RANGE) ** 2);
  const worstCaseFuelCost = maxPossibleDistance * FUEL_COST_PER_DISTANCE_UNIT;

  // Documented expectation (shipsAndTravelConfig.ts's own comment): the
  // real worst case is ~85 fuel. Confirms the test's own derivation
  // matches the design doc's stated figure, not just an internally
  // self-consistent computation.
  assert.ok(worstCaseFuelCost > 84 && worstCaseFuelCost < 86, `expected ~85 fuel, got ${worstCaseFuelCost}`);

  for (const tier of ["Grey", "White", "Green"] as const) {
    assert.ok(
      fuelCapacityFor(tier) < worstCaseFuelCost,
      `${tier} tier's capacity (${fuelCapacityFor(tier)}) was expected to be insufficient for the worst-case trip (${worstCaseFuelCost}), but wasn't`,
    );
  }

  for (const tier of ["Blue", "Purple", "Orange", "Gold"] as const) {
    assert.ok(
      fuelCapacityFor(tier) >= worstCaseFuelCost,
      `${tier} tier's capacity (${fuelCapacityFor(tier)}) was expected to cover the worst-case trip (${worstCaseFuelCost}), but didn't`,
    );
  }
});
