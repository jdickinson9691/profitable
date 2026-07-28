import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ENCOUNTER_CHECK_WINDOW_HOURS,
  ENCOUNTER_TRIGGER_CHANCE,
  ENCOUNTER_TYPE_WEIGHTS,
  ENCOUNTER_TRADE_OPPORTUNITY_MIN_CREDITS,
  ENCOUNTER_TRADE_OPPORTUNITY_MAX_CREDITS,
  HAZARD_PASS_THRESHOLD,
  HAZARD_SHIP_TIER_MODIFIER,
  HAZARD_BASE_FAILURE_COST,
  HAZARD_FAILURE_COST_CURVE,
} from "../../src/data/constants/shipsAndTravelConfig.ts";
import { TIER_VARIANCE } from "../../src/data/constants/tierVariance.ts";
import { PENALTY_CURVE } from "../../src/data/constants/penaltyCurve.ts";

// Same structural-invariant pattern as phase4Constants.test.ts/
// phase5Constants.test.ts: the Travel Encounters GDD documents the *shape*
// of each tunable without example numbers, so these tests check
// invariants rather than hardcoding "expected" values nobody specified.

const ALL_TIERS = TIER_VARIANCE.map((entry) => entry.tier);

test("ENCOUNTER_CHECK_WINDOW_HOURS and ENCOUNTER_TRIGGER_CHANCE are positive, and the trigger chance is a real probability", () => {
  assert.ok(ENCOUNTER_CHECK_WINDOW_HOURS > 0);
  assert.ok(ENCOUNTER_TRIGGER_CHANCE > 0 && ENCOUNTER_TRIGGER_CHANCE < 1);
});

test("ENCOUNTER_TYPE_WEIGHTS covers exactly the 3 encounter types, all positive, summing to 1, with hazard strictly the lowest", () => {
  const entries = Object.entries(ENCOUNTER_TYPE_WEIGHTS);
  assert.deepEqual(
    entries.map(([type]) => type).sort(),
    ["discovery", "hazard", "tradeOpportunity"],
  );
  for (const [, weight] of entries) {
    assert.ok(weight > 0);
  }
  const sum = entries.reduce((total, [, weight]) => total + weight, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);

  assert.ok(ENCOUNTER_TYPE_WEIGHTS.hazard < ENCOUNTER_TYPE_WEIGHTS.tradeOpportunity);
  assert.ok(ENCOUNTER_TYPE_WEIGHTS.hazard < ENCOUNTER_TYPE_WEIGHTS.discovery);
});

test("ENCOUNTER_TRADE_OPPORTUNITY_MIN_CREDITS/_MAX_CREDITS form a real, positive range", () => {
  assert.ok(ENCOUNTER_TRADE_OPPORTUNITY_MIN_CREDITS > 0);
  assert.ok(ENCOUNTER_TRADE_OPPORTUNITY_MAX_CREDITS > ENCOUNTER_TRADE_OPPORTUNITY_MIN_CREDITS);
});

test("HAZARD_PASS_THRESHOLD is a real threshold within the 1-100 roll range", () => {
  assert.ok(HAZARD_PASS_THRESHOLD > 1 && HAZARD_PASS_THRESHOLD < 100);
});

test("HAZARD_SHIP_TIER_MODIFIER covers all 7 tiers, Grey is exactly +0 (floor, not a penalty), and each higher tier strictly increases the bonus", () => {
  assert.equal(HAZARD_SHIP_TIER_MODIFIER.length, 7);
  const tiers = HAZARD_SHIP_TIER_MODIFIER.map((entry) => entry.tier);
  assert.deepEqual(tiers, ALL_TIERS);

  const grey = HAZARD_SHIP_TIER_MODIFIER.find((entry) => entry.tier === "Grey")!;
  assert.equal(grey.rollBonus, 0);

  for (let i = 1; i < HAZARD_SHIP_TIER_MODIFIER.length; i++) {
    assert.ok(
      HAZARD_SHIP_TIER_MODIFIER[i]!.rollBonus > HAZARD_SHIP_TIER_MODIFIER[i - 1]!.rollBonus,
      `${HAZARD_SHIP_TIER_MODIFIER[i]!.tier} should have a strictly larger roll bonus than ${HAZARD_SHIP_TIER_MODIFIER[i - 1]!.tier}`,
    );
  }
});

test("HAZARD_BASE_FAILURE_COST is positive", () => {
  assert.ok(HAZARD_BASE_FAILURE_COST > 0);
});

test("HAZARD_FAILURE_COST_CURVE mirrors PENALTY_CURVE's exact band boundaries (minus the 0-points/reject bands, which don't apply to a failure-only curve), strictly escalating, with the worst band unbounded", () => {
  // PENALTY_CURVE has 6 bands (0, 1-10, 11-20, 21-30, 31-40, 41+); the
  // failure-cost curve only needs the 4 non-zero, non-reject bands plus
  // the unbounded 41+ band -- 5 total.
  assert.equal(HAZARD_FAILURE_COST_CURVE.length, 5);

  const nonZeroPenaltyBands = PENALTY_CURVE.filter((band) => band.minPointsBelow > 0);
  assert.equal(HAZARD_FAILURE_COST_CURVE.length, nonZeroPenaltyBands.length);
  for (let i = 0; i < HAZARD_FAILURE_COST_CURVE.length; i++) {
    assert.equal(HAZARD_FAILURE_COST_CURVE[i]!.minPointsBelow, nonZeroPenaltyBands[i]!.minPointsBelow);
    assert.equal(HAZARD_FAILURE_COST_CURVE[i]!.maxPointsBelow, nonZeroPenaltyBands[i]!.maxPointsBelow);
  }

  for (let i = 1; i < HAZARD_FAILURE_COST_CURVE.length; i++) {
    assert.ok(HAZARD_FAILURE_COST_CURVE[i]!.costMultiplier > HAZARD_FAILURE_COST_CURVE[i - 1]!.costMultiplier);
  }

  const worstBand = HAZARD_FAILURE_COST_CURVE[HAZARD_FAILURE_COST_CURVE.length - 1]!;
  assert.equal(worstBand.maxPointsBelow, null);

  // Unlike PENALTY_CURVE, no band's multiplier is ever null -- a hazard
  // failure always resolves to some real cost, never a "reject."
  for (const band of HAZARD_FAILURE_COST_CURVE) {
    assert.equal(typeof band.costMultiplier, "number");
  }
});
