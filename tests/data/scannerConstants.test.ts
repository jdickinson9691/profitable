import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCANNER_POOL_SIZE_PER_PLANET,
  SCANNER_POOL_REFRESH_INTERVAL_HOURS,
  SCANNER_PURCHASE_COST_BY_TIER,
  SCANNER_BASE_SCAN_RADIUS,
  SCANNER_TIER_RADIUS_BONUS,
} from "../../src/data/constants/shipsAndTravelConfig.ts";
import { TIER_VARIANCE } from "../../src/data/constants/tierVariance.ts";

// Same structural-invariant pattern as travelEncountersConstants.test.ts:
// the Scanner/Probe GDD documents the *shape* of each tunable without
// example numbers, so these tests check invariants rather than hardcoding
// "expected" values nobody specified.

const ALL_TIERS = TIER_VARIANCE.map((entry) => entry.tier);

test("SCANNER_POOL_SIZE_PER_PLANET and SCANNER_POOL_REFRESH_INTERVAL_HOURS are positive", () => {
  assert.ok(SCANNER_POOL_SIZE_PER_PLANET > 0);
  assert.ok(SCANNER_POOL_REFRESH_INTERVAL_HOURS > 0);
});

test("SCANNER_PURCHASE_COST_BY_TIER covers all 7 tiers, strictly increasing by tier", () => {
  assert.equal(SCANNER_PURCHASE_COST_BY_TIER.length, 7);
  const tiers = SCANNER_PURCHASE_COST_BY_TIER.map((entry) => entry.tier);
  assert.deepEqual(tiers, ALL_TIERS);

  for (let i = 1; i < SCANNER_PURCHASE_COST_BY_TIER.length; i++) {
    assert.ok(
      SCANNER_PURCHASE_COST_BY_TIER[i]!.cost > SCANNER_PURCHASE_COST_BY_TIER[i - 1]!.cost,
      `${SCANNER_PURCHASE_COST_BY_TIER[i]!.tier} should cost more than ${SCANNER_PURCHASE_COST_BY_TIER[i - 1]!.tier}`,
    );
  }
});

test("SCANNER_BASE_SCAN_RADIUS is a positive real distance", () => {
  assert.ok(SCANNER_BASE_SCAN_RADIUS > 0);
});

test("SCANNER_TIER_RADIUS_BONUS covers all 7 tiers, Grey is exactly +0 (floor, not a penalty), and each higher tier strictly increases the bonus", () => {
  assert.equal(SCANNER_TIER_RADIUS_BONUS.length, 7);
  const tiers = SCANNER_TIER_RADIUS_BONUS.map((entry) => entry.tier);
  assert.deepEqual(tiers, ALL_TIERS);

  const grey = SCANNER_TIER_RADIUS_BONUS.find((entry) => entry.tier === "Grey")!;
  assert.equal(grey.radiusBonus, 0);

  for (let i = 1; i < SCANNER_TIER_RADIUS_BONUS.length; i++) {
    assert.ok(
      SCANNER_TIER_RADIUS_BONUS[i]!.radiusBonus > SCANNER_TIER_RADIUS_BONUS[i - 1]!.radiusBonus,
      `${SCANNER_TIER_RADIUS_BONUS[i]!.tier} should have a strictly larger radius bonus than ${SCANNER_TIER_RADIUS_BONUS[i - 1]!.tier}`,
    );
  }
});
