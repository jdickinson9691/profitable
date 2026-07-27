import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BASE_CREW_CAPACITY,
  CREW_CAPACITY_EXPANSION_BASE_COST,
  CREW_CAPACITY_EXPANSION_COST_MULTIPLIER,
  CREW_HIRE_COST_BY_TIER,
  CREW_WAGE_BY_TIER,
  WAGE_PAYMENT_INTERVAL_HOURS,
  UPKEEP_GRACE_PERIOD_HOURS,
  CREW_POOL_SIZE_PER_PLANET,
  CREW_POOL_REFRESH_INTERVAL_HOURS,
  ELAPSED_TIME_CAP_HOURS,
  BACKGROUND_IDLE_OUTPUT_RATE,
} from "../../src/data/constants/crewConfig.ts";
import { TIER_VARIANCE } from "../../src/data/constants/tierVariance.ts";

// Unlike Phase 2/3's constants, the design doc gives no example numbers
// for most of these (only the elapsed-time cap has a documented example
// range) -- these are originated defaults, so the tests here check
// structural invariants (positive, monotonically increasing by tier,
// covers all 7 tiers) rather than hardcoding "expected" numbers nobody
// ever specified, which would just be circular. The one constant the
// design doc explicitly forbids guessing (background/idle rate) gets its
// own dedicated pending-check instead.

const ALL_TIERS = TIER_VARIANCE.map((entry) => entry.tier);

test("BASE_CREW_CAPACITY is a small positive integer", () => {
  assert.ok(Number.isInteger(BASE_CREW_CAPACITY));
  assert.ok(BASE_CREW_CAPACITY > 0);
});

test("capacity expansion cost curve makes each additional slot cost more than the last", () => {
  assert.ok(CREW_CAPACITY_EXPANSION_BASE_COST > 0);
  assert.ok(CREW_CAPACITY_EXPANSION_COST_MULTIPLIER > 1);
});

test("CREW_HIRE_COST_BY_TIER covers all 7 tiers and strictly increases by tier", () => {
  assert.equal(CREW_HIRE_COST_BY_TIER.length, 7);
  const tiers = CREW_HIRE_COST_BY_TIER.map((entry) => entry.tier);
  assert.deepEqual(tiers, ALL_TIERS);
  for (let i = 1; i < CREW_HIRE_COST_BY_TIER.length; i++) {
    assert.ok(CREW_HIRE_COST_BY_TIER[i]!.cost > CREW_HIRE_COST_BY_TIER[i - 1]!.cost);
  }
});

test("CREW_WAGE_BY_TIER covers all 7 tiers and strictly increases by tier", () => {
  assert.equal(CREW_WAGE_BY_TIER.length, 7);
  const tiers = CREW_WAGE_BY_TIER.map((entry) => entry.tier);
  assert.deepEqual(tiers, ALL_TIERS);
  for (let i = 1; i < CREW_WAGE_BY_TIER.length; i++) {
    assert.ok(CREW_WAGE_BY_TIER[i]!.wage > CREW_WAGE_BY_TIER[i - 1]!.wage);
  }
});

test("wage is always cheaper than the one-time hire cost, at every tier", () => {
  for (const tier of ALL_TIERS) {
    const hireCost = CREW_HIRE_COST_BY_TIER.find((e) => e.tier === tier)!.cost;
    const wage = CREW_WAGE_BY_TIER.find((e) => e.tier === tier)!.wage;
    assert.ok(wage < hireCost, `${tier}: wage (${wage}) should be less than hire cost (${hireCost})`);
  }
});

test("timing tunables are all positive", () => {
  assert.ok(WAGE_PAYMENT_INTERVAL_HOURS > 0);
  assert.ok(UPKEEP_GRACE_PERIOD_HOURS > 0);
  assert.ok(CREW_POOL_REFRESH_INTERVAL_HOURS > 0);
  assert.ok(CREW_POOL_SIZE_PER_PLANET > 0);
});

test("ELAPSED_TIME_CAP_HOURS falls within the documented 24-48 hour example range", () => {
  assert.ok(ELAPSED_TIME_CAP_HOURS >= 24 && ELAPSED_TIME_CAP_HOURS <= 48);
});

test("BACKGROUND_IDLE_OUTPUT_RATE is explicitly pending (null), not a guessed number", () => {
  assert.equal(BACKGROUND_IDLE_OUTPUT_RATE, null);
});
