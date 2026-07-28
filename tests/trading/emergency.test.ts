import { test } from "node:test";
import assert from "node:assert/strict";
import { getActiveEmergency, getEmergencyPriceMultiplier } from "../../src/trading/emergency.ts";
import {
  EMERGENCY_CHECK_INTERVAL_HOURS,
  EMERGENCY_TRIGGER_CHANCE,
  EMERGENCY_DURATION_HOURS,
  EMERGENCY_PRICE_PREMIUM_PERCENT,
} from "../../src/data/constants/tradingConfig.ts";

const MS_PER_HOUR = 60 * 60 * 1000;
const WINDOW_MS = EMERGENCY_CHECK_INTERVAL_HOURS * MS_PER_HOUR;
const CATEGORIES = ["solid", "gas", "refined-metal"];

// Bug fix (Galactic Map Agent 25/26 verification): emergencies were never
// implemented before this. Deterministic given fixed inputs, same
// discipline as every other pure function in this codebase -- "random" here
// means "a seeded hash of (planetId, windowIndex)," not real nondeterminism,
// so every test below is exactly reproducible.

test("EMERGENCY_DURATION_HOURS never exceeds EMERGENCY_CHECK_INTERVAL_HOURS -- a still-active emergency can never bleed into the next window's own roll", () => {
  assert.ok(EMERGENCY_DURATION_HOURS <= EMERGENCY_CHECK_INTERVAL_HOURS);
});

test("getActiveEmergency() returns null when the planet has no live-traded categories", () => {
  assert.equal(getActiveEmergency("planet-1", 0, []), null);
});

test("getActiveEmergency() is deterministic -- same planetId/now/categories always produce the same result", () => {
  const a = getActiveEmergency("planet-deterministic", 5 * WINDOW_MS, CATEGORIES);
  const b = getActiveEmergency("planet-deterministic", 5 * WINDOW_MS, CATEGORIES);
  assert.deepEqual(a, b);
});

test("triggers roughly EMERGENCY_TRIGGER_CHANCE of the time across many independent planets (structural invariant, not an exact count)", () => {
  const sampleSize = 500;
  let triggeredCount = 0;
  for (let i = 0; i < sampleSize; i++) {
    if (getActiveEmergency(`planet-sample-${i}`, 0, CATEGORIES)) triggeredCount++;
  }
  const observedRate = triggeredCount / sampleSize;
  assert.ok(
    Math.abs(observedRate - EMERGENCY_TRIGGER_CHANCE) < 0.1,
    `observed trigger rate ${observedRate} too far from documented ${EMERGENCY_TRIGGER_CHANCE}`,
  );
});

test("no advance warning: a triggered emergency is active from the very first instant of its window, and reports the category from the given list", () => {
  // Deterministic search for a (planetId, windowIndex=0) pair that
  // actually triggers -- reproducible every run, not flaky, since
  // getActiveEmergency has zero real randomness.
  let planetId: string | null = null;
  for (let i = 0; i < 1000; i++) {
    const candidate = `planet-search-${i}`;
    if (getActiveEmergency(candidate, 0, CATEGORIES)) {
      planetId = candidate;
      break;
    }
  }
  assert.ok(planetId, "expected at least one triggering planet id within the search budget");

  // now=0 IS the window's very first instant -- the emergency is already
  // active here, with no earlier "announced but not yet in effect" state
  // computed or checked anywhere in getActiveEmergency() (there is no
  // separate lead-time parameter or delay added to windowStart at all).
  const atWindowStart = getActiveEmergency(planetId!, 0, CATEGORIES);
  assert.ok(atWindowStart);
  assert.ok(CATEGORIES.includes(atWindowStart.category));
  assert.equal(atWindowStart.endsAt, EMERGENCY_DURATION_HOURS * MS_PER_HOUR);
});

test("an active emergency ends exactly at endsAt -- present the instant before, gone at or after", () => {
  let planetId: string | null = null;
  let emergency: { category: string; endsAt: number } | null = null;
  for (let i = 0; i < 1000; i++) {
    const candidate = `planet-end-search-${i}`;
    const result = getActiveEmergency(candidate, 0, CATEGORIES);
    if (result) {
      planetId = candidate;
      emergency = result;
      break;
    }
  }
  assert.ok(planetId && emergency);

  assert.ok(getActiveEmergency(planetId!, emergency!.endsAt - 1, CATEGORIES));
  assert.equal(getActiveEmergency(planetId!, emergency!.endsAt, CATEGORIES), null);
});

test("getEmergencyPriceMultiplier() applies the exact documented premium to the affected category only", () => {
  const emergency = { category: "solid", endsAt: 1_000_000 };
  assert.equal(getEmergencyPriceMultiplier("solid", emergency), 1 + EMERGENCY_PRICE_PREMIUM_PERCENT);
  assert.equal(getEmergencyPriceMultiplier("gas", emergency), 1);
});

test("getEmergencyPriceMultiplier() returns 1 (no effect) when there is no active emergency at all", () => {
  assert.equal(getEmergencyPriceMultiplier("solid", null), 1);
});
