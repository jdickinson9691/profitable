import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveBackgroundCrafting } from "../../src/crew/resolveBackgroundCrafting.ts";
import { radiantAlloyBar, hydrogenGas } from "../fixtures/resources.ts";
import { makeInstance } from "../fixtures/instances.ts";
import { ionForgedHullPlateRecipe } from "../fixtures/recipes.ts";
import { queueRandom } from "../fixtures/random.ts";
import type { CrewMember } from "../../src/data/types/crewMember.ts";
import type { CraftAction } from "../../src/data/types/craftAction.ts";
import type { BackgroundResolved } from "../../src/data/types/backgroundResult.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

function idleCrewMember(overrides: Partial<CrewMember> = {}): CrewMember {
  return {
    id: "crew-1",
    hiredByPlayerId: "player-1",
    tier: "Blue",
    profession: null,
    status: "idle",
    assignedCraftId: "craft-1",
    hiredAt: 0,
    lastCheckedAt: 0,
    wageAmount: 35,
    lastPaidAt: 0,
    ...overrides,
  };
}

const action: CraftAction = {
  id: "craft-1",
  inputs: [
    makeInstance(radiantAlloyBar, 1, { purity: 70, density: 70, potency: 70, durability: 70, rarity: 70 }),
    makeInstance(hydrogenGas, 1, { purity: 70, density: 70, potency: 70, rarity: 70 }),
  ],
  recipe: ionForgedHullPlateRecipe,
  schematicTier: "Blue",
};

test("resolveBackgroundCrafting() returns not-yet-available when the background rate is explicitly overridden to null", () => {
  const result = resolveBackgroundCrafting(idleCrewMember(), action, 10 * MS_PER_HOUR, null);
  assert.equal(result.resolved, false);
});

test("resolveBackgroundCrafting() still advances lastCheckedAt even when the rate is unavailable", () => {
  const result = resolveBackgroundCrafting(idleCrewMember({ lastCheckedAt: 0 }), action, 10 * MS_PER_HOUR, null);
  assert.equal(result.updatedCrewMember.lastCheckedAt, 10 * MS_PER_HOUR);
});

test("resolveBackgroundCrafting() resolves real production using the real default rate (0.5/hour) when no override is supplied", () => {
  const result = resolveBackgroundCrafting(
    idleCrewMember({ lastCheckedAt: 0 }),
    action,
    10 * MS_PER_HOUR,
    undefined,
    queueRandom(Array(5).fill(0)),
  ) as BackgroundResolved;

  assert.equal(result.resolved, true);
  assert.equal(result.unitsCompleted, 5); // 10h * 0.5/h
  assert.equal(result.results.length, 5);
});

test("resolveBackgroundCrafting() computes unitsCompleted from elapsed hours * rate when a rate is supplied", () => {
  const result = resolveBackgroundCrafting(
    idleCrewMember({ lastCheckedAt: 0 }),
    action,
    3 * MS_PER_HOUR,
    1, // 1 unit/hour
    queueRandom([0, 0, 0]),
  ) as BackgroundResolved;

  assert.equal(result.resolved, true);
  assert.equal(result.unitsCompleted, 3);
  assert.equal(result.results.length, 3);
});

test("resolveBackgroundCrafting() derives elapsed time from currentTime - lastCheckedAt, never from a caller-supplied duration", () => {
  // Same currentTime, but a different lastCheckedAt -> a different real
  // elapsed time and a different unit count. There is no "elapsed
  // duration" parameter at all for a caller to override with -- this
  // confirms the only way to affect the result is through the two real
  // timestamps.
  const soonChecked = resolveBackgroundCrafting(
    idleCrewMember({ lastCheckedAt: 9 * MS_PER_HOUR }),
    action,
    10 * MS_PER_HOUR,
    1,
    queueRandom([0]),
  ) as BackgroundResolved;
  assert.equal(soonChecked.unitsCompleted, 1);

  const longAgoChecked = resolveBackgroundCrafting(
    idleCrewMember({ lastCheckedAt: 0 }),
    action,
    10 * MS_PER_HOUR,
    1,
    queueRandom(Array(10).fill(0)),
  ) as BackgroundResolved;
  assert.equal(longAgoChecked.unitsCompleted, 10);
});

test("resolveBackgroundCrafting() caps elapsed time at ELAPSED_TIME_CAP_HOURS, not crediting a full week-long absence", () => {
  const weekInHours = 24 * 7;
  const result = resolveBackgroundCrafting(
    idleCrewMember({ lastCheckedAt: 0 }),
    action,
    weekInHours * MS_PER_HOUR,
    1, // 1 unit/hour -> uncapped would be 168 units
    queueRandom(Array(48).fill(0)),
  ) as BackgroundResolved;

  assert.equal(result.resolved, true);
  assert.equal(result.unitsCompleted, 48); // ELAPSED_TIME_CAP_HOURS, not 168
});

test("resolveBackgroundCrafting() caps unitsCompleted at maxUnits, not just the elapsed-time-derived count", () => {
  const result = resolveBackgroundCrafting(
    idleCrewMember({ lastCheckedAt: 0 }),
    action,
    10 * MS_PER_HOUR,
    1, // 1 unit/hour -> uncapped would be 10 units
    queueRandom([0, 0, 0]),
    3, // materials on hand only support 3
  ) as BackgroundResolved;

  assert.equal(result.resolved, true);
  assert.equal(result.unitsCompleted, 3);
  assert.equal(result.results.length, 3);
});

test("resolveBackgroundCrafting() maxUnits defaults to unbounded when omitted", () => {
  const result = resolveBackgroundCrafting(
    idleCrewMember({ lastCheckedAt: 0 }),
    action,
    3 * MS_PER_HOUR,
    1,
    queueRandom([0, 0, 0]),
  ) as BackgroundResolved;
  assert.equal(result.unitsCompleted, 3);
});

test("resolveBackgroundCrafting() does not mutate the input crew member", () => {
  const crewMember = idleCrewMember({ lastCheckedAt: 0 });
  const snapshot = { ...crewMember };
  resolveBackgroundCrafting(crewMember, action, 3 * MS_PER_HOUR, 1, queueRandom([0, 0, 0]));
  assert.deepEqual(crewMember, snapshot);
});
