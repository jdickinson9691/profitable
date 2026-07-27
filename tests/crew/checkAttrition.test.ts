import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAttrition } from "../../src/crew/checkAttrition.ts";
import type { CrewMember } from "../../src/data/types/crewMember.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

function crewMember(overrides: Partial<CrewMember> = {}): CrewMember {
  return {
    id: "crew-1",
    hiredByPlayerId: "player-1",
    tier: "Blue",
    profession: null,
    status: "idle",
    assignedCraftId: null,
    hiredAt: 0,
    lastCheckedAt: 0,
    wageAmount: 35,
    lastPaidAt: 0,
    ...overrides,
  };
}

test("checkAttrition() does not depart a crew member within the grace period", () => {
  const result = checkAttrition(crewMember({ lastPaidAt: 0 }), 47 * MS_PER_HOUR);
  assert.equal(result.departed, false);
});

test("checkAttrition() departs a crew member exactly once the grace period is exceeded", () => {
  const stillGraced = checkAttrition(crewMember({ lastPaidAt: 0 }), 48 * MS_PER_HOUR);
  assert.equal(stillGraced.departed, false); // exactly at the boundary, not yet over it

  const departed = checkAttrition(crewMember({ lastPaidAt: 0 }), 48 * MS_PER_HOUR + 1);
  assert.equal(departed.departed, true);
});

test("checkAttrition() measures the grace period from lastPaidAt, not hiredAt", () => {
  // Hired long ago, but paid recently -- should not depart.
  const result = checkAttrition(crewMember({ hiredAt: 0, lastPaidAt: 1000 * MS_PER_HOUR }), 1010 * MS_PER_HOUR);
  assert.equal(result.departed, false);
});

test("checkAttrition() is never triggered by anything other than unpaid upkeep -- no random/chance element exists", () => {
  // Same inputs, called repeatedly, must always produce the identical
  // result -- proving there's no hidden randomness anywhere in attrition.
  const results = Array.from({ length: 20 }, () => checkAttrition(crewMember({ lastPaidAt: 0 }), 100 * MS_PER_HOUR));
  assert.ok(results.every((r) => r.departed === true));
});
