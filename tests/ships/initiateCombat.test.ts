import { test } from "node:test";
import assert from "node:assert/strict";
import { initiateCombat } from "../../src/ships/initiateCombat.ts";
import { queueRandom } from "../fixtures/random.ts";

// Combat GDD §2.2/§2.4/§3 -- Agent 21 (amendment): proves initiateCombat()
// (shared by both trigger points) creates a correctly-shaped pending
// CombatEncounter and rolls opponentThreatTier exactly once, at detection.

test("initiateCombat() creates a pending encounter with outcome null and the given id/voyageId/triggerContext/windowIndex passed through exactly", () => {
  const encounter = initiateCombat("voyage-1-combat-w0", "voyage-1", "travel", 0, queueRandom([0.5]));
  assert.equal(encounter.id, "voyage-1-combat-w0");
  assert.equal(encounter.voyageId, "voyage-1");
  assert.equal(encounter.triggerContext, "travel");
  assert.equal(encounter.windowIndex, 0);
  assert.equal(encounter.status, "pending");
  assert.equal(encounter.outcome, null);
});

test("initiateCombat() supports an arrival trigger with windowIndex: null", () => {
  const encounter = initiateCombat("voyage-1-combat-arrival", "voyage-1", "arrival", null, queueRandom([0.5]));
  assert.equal(encounter.triggerContext, "arrival");
  assert.equal(encounter.windowIndex, null);
});

test("initiateCombat() rolls opponentThreatTier as a 1-100 roll through the shared tier breakpoint table, consuming exactly one random() call", () => {
  // floor(0 * 100) + 1 = 1 -- bottom of Grey's 1-40 range.
  const grey = initiateCombat("c1", "v1", "travel", 0, queueRandom([0]));
  assert.equal(grey.opponentThreatTier, "Grey");

  // floor(0.99 * 100) + 1 = 100 -- top of Gold's 97-100 range.
  const gold = initiateCombat("c2", "v1", "travel", 0, queueRandom([0.99]));
  assert.equal(gold.opponentThreatTier, "Gold");

  // Exactly one value queued -- if initiateCombat() consumed a second
  // random() call for anything else at detection time, queueRandom would
  // throw "exhausted" instead of returning cleanly.
  const midpoint = initiateCombat("c3", "v1", "travel", 0, queueRandom([0.5]));
  assert.equal(midpoint.opponentThreatTier, "White"); // floor(50)+1=51, in White's 41-60 range
});
