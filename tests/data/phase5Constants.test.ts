import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DISTANCE_TO_TRAVEL_HOURS_PER_UNIT,
  SHIP_TIER_SPEED_MODIFIER,
  SHIPYARD_POOL_SIZE_PER_PLANET,
  SHIPYARD_POOL_REFRESH_INTERVAL_HOURS,
  SHIP_PURCHASE_COST_BY_TIER,
} from "../../src/data/constants/shipsAndTravelConfig.ts";
import { TIER_VARIANCE } from "../../src/data/constants/tierVariance.ts";

// Same non-circular-but-structural pattern as phase4Constants.test.ts:
// the design doc gives no example numbers for most of these (only the
// *shape* each table should take), so these tests check structural
// invariants rather than hardcoding "expected" values nobody specified.

const ALL_TIERS = TIER_VARIANCE.map((entry) => entry.tier);

test("DISTANCE_TO_TRAVEL_HOURS_PER_UNIT is a small positive number", () => {
  assert.ok(DISTANCE_TO_TRAVEL_HOURS_PER_UNIT > 0);
});

test("SHIP_TIER_SPEED_MODIFIER covers all 7 tiers, Grey is exactly baseline (1.0), and each higher tier strictly shortens travel time", () => {
  assert.equal(SHIP_TIER_SPEED_MODIFIER.length, 7);
  const tiers = SHIP_TIER_SPEED_MODIFIER.map((entry) => entry.tier);
  assert.deepEqual(tiers, ALL_TIERS);

  const grey = SHIP_TIER_SPEED_MODIFIER.find((entry) => entry.tier === "Grey")!;
  assert.equal(grey.travelTimeMultiplier, 1.0);

  for (let i = 1; i < SHIP_TIER_SPEED_MODIFIER.length; i++) {
    assert.ok(
      SHIP_TIER_SPEED_MODIFIER[i]!.travelTimeMultiplier < SHIP_TIER_SPEED_MODIFIER[i - 1]!.travelTimeMultiplier,
      `${SHIP_TIER_SPEED_MODIFIER[i]!.tier} should travel strictly faster than ${SHIP_TIER_SPEED_MODIFIER[i - 1]!.tier}`,
    );
  }
});

test("SHIPYARD_POOL_SIZE_PER_PLANET and SHIPYARD_POOL_REFRESH_INTERVAL_HOURS are positive", () => {
  assert.ok(SHIPYARD_POOL_SIZE_PER_PLANET > 0);
  assert.ok(SHIPYARD_POOL_REFRESH_INTERVAL_HOURS > 0);
});

test("SHIP_PURCHASE_COST_BY_TIER covers all 7 tiers and strictly increases by tier", () => {
  assert.equal(SHIP_PURCHASE_COST_BY_TIER.length, 7);
  const tiers = SHIP_PURCHASE_COST_BY_TIER.map((entry) => entry.tier);
  assert.deepEqual(tiers, ALL_TIERS);
  for (let i = 1; i < SHIP_PURCHASE_COST_BY_TIER.length; i++) {
    assert.ok(SHIP_PURCHASE_COST_BY_TIER[i]!.cost > SHIP_PURCHASE_COST_BY_TIER[i - 1]!.cost);
  }
});
