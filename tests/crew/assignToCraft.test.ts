import { test } from "node:test";
import assert from "node:assert/strict";
import { assignToCraft } from "../../src/crew/assignToCraft.ts";
import { radiantAlloyBar, hydrogenGas } from "../fixtures/resources.ts";
import { makeInstance } from "../fixtures/instances.ts";
import { ionForgedHullPlateRecipe } from "../fixtures/recipes.ts";
import { queueRandom } from "../fixtures/random.ts";
import type { CrewMember } from "../../src/data/types/crewMember.ts";
import type { CraftAction } from "../../src/data/types/craftAction.ts";
import type { AssignSucceeded } from "../../src/data/types/assignResult.ts";

function idleCrewMember(overrides: Partial<CrewMember> = {}): CrewMember {
  return {
    id: "crew-1",
    hiredByPlayerId: "player-1",
    tier: "Gold",
    profession: null,
    status: "idle",
    assignedCraftId: null,
    hiredAt: 0,
    lastCheckedAt: 0,
    wageAmount: 120,
    lastPaidAt: 0,
    ...overrides,
  };
}

function craftAction(id: string): CraftAction {
  return {
    id,
    inputs: [
      makeInstance(radiantAlloyBar, 1, { purity: 70, density: 70, potency: 70, durability: 70, rarity: 70 }),
      makeInstance(hydrogenGas, 1, { purity: 70, density: 70, potency: 70, rarity: 70 }),
    ],
    recipe: ionForgedHullPlateRecipe,
    schematicTier: "Blue",
  };
}

test("assignToCraft() sets status to active and records assignedCraftId", () => {
  const result = assignToCraft(idleCrewMember(), craftAction("craft-1"), queueRandom([1])) as AssignSucceeded;
  assert.equal(result.assigned, true);
  assert.equal(result.updatedCrewMember.status, "active");
  assert.equal(result.updatedCrewMember.assignedCraftId, "craft-1");
});

test("assignToCraft() calls the real craft() with the crew member's tier as crafterTier -- matches the hand-calculated regression value exactly", () => {
  // Green crafter tier + Blue schematic + random()=1, same case already
  // proven in tests/trading/regressionCheck.test.ts -> 79 on every dimension.
  const result = assignToCraft(idleCrewMember({ tier: "Green" }), craftAction("craft-1"), queueRandom([1])) as AssignSucceeded;
  assert.equal(result.craftResult.accepted, true);
  assert.deepEqual(result.craftResult.accepted ? result.craftResult.qualities : null, {
    purity: 79,
    density: 79,
    potency: 79,
    durability: 79,
    rarity: 79,
  });
});

test("assignToCraft() does not mutate the input crew member", () => {
  const crewMember = idleCrewMember();
  const snapshot = { ...crewMember };
  assignToCraft(crewMember, craftAction("craft-1"), queueRandom([1]));
  assert.deepEqual(crewMember, snapshot);
});
