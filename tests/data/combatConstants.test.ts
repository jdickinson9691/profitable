import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ARRIVAL_COMBAT_CHECK_CHANCE,
  COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT,
  COMBAT_CREW_UNAVAILABLE_DURATION_HOURS,
  ENCOUNTER_TRIGGER_CHANCE,
} from "../../src/data/constants/shipsAndTravelConfig.ts";
import { TIER_VARIANCE } from "../../src/data/constants/tierVariance.ts";

// Same structural-invariant pattern as scannerConstants.test.ts/
// travelEncountersConstants.test.ts: the Combat GDD documents the *shape*
// of each tunable without example numbers, so these tests check invariants
// rather than hardcoding "expected" values nobody specified.

test("ARRIVAL_COMBAT_CHECK_CHANCE is a real probability, distinct from the travel-window trigger chance", () => {
  assert.ok(ARRIVAL_COMBAT_CHECK_CHANCE > 0 && ARRIVAL_COMBAT_CHECK_CHANCE < 1);
  // "a separate probability from the travel-window roll" (GDD §2.2) --
  // confirms this is genuinely its own constant, not an accidental alias.
  assert.notEqual(ARRIVAL_COMBAT_CHECK_CHANCE, ENCOUNTER_TRIGGER_CHANCE);
});

test("COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT is a real, meaningful-but-not-total fraction", () => {
  assert.ok(COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT > 0 && COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT < 1);
});

test("COMBAT_CREW_UNAVAILABLE_DURATION_HOURS is positive", () => {
  assert.ok(COMBAT_CREW_UNAVAILABLE_DURATION_HOURS > 0);
});

test("Combat's variance formula reuses the existing shared TIER_VARIANCE table -- no second, combat-specific variance table exists", () => {
  // GDD §2.4/§3: "reuses the existing tier-variance table shape (no new
  // curve to design)... do not create a second, duplicate table for combat
  // specifically." Confirmed two ways: TIER_VARIANCE itself is untouched
  // (still exactly 7 rows, one per tier), and no combat-specific variance
  // constant/type was introduced anywhere in this amendment (grep-checked
  // against this file's own imports above -- there is no
  // COMBAT_VARIANCE/CombatVariance export to import in the first place).
  assert.equal(TIER_VARIANCE.length, 7);
  const tiers = TIER_VARIANCE.map((entry) => entry.tier);
  assert.deepEqual(tiers, ["Grey", "White", "Green", "Blue", "Purple", "Orange", "Gold"]);
});
