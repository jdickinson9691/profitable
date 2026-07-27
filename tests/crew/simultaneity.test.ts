import { test } from "node:test";
import assert from "node:assert/strict";
import { assignToCraft } from "../../src/crew/assignToCraft.ts";
import { craft } from "../../src/simulation/craft.ts";
import { radiantAlloyBar, hydrogenGas } from "../fixtures/resources.ts";
import { makeInstance } from "../fixtures/instances.ts";
import { ionForgedHullPlateRecipe } from "../fixtures/recipes.ts";
import { queueRandom } from "../fixtures/random.ts";
import type { CrewMember } from "../../src/data/types/crewMember.ts";
import type { CraftAction } from "../../src/data/types/craftAction.ts";
import type { AssignSucceeded } from "../../src/data/types/assignResult.ts";

// Phase 4 GDD §2.5 / Agent 17's explicit requirement: the player's own
// active craft and multiple crew members' active crafts must all be able
// to be in progress "at once" -- confirm this is not silently serialized
// into a single-craft-at-a-time restriction. Since craft() is already a
// pure, stateless function, "simultaneous" here means: calling
// assignToCraft() for several crew members (each an independent call,
// with its own crafter tier and its own craftAction) produces
// independent results with no shared/locked state between them -- there
// is no artificial "only one crafter may act" gate anywhere.

function crewMember(id: string, tier: CrewMember["tier"]): CrewMember {
  return {
    id,
    hiredByPlayerId: "player-1",
    tier,
    profession: null,
    status: "idle",
    assignedCraftId: null,
    hiredAt: 0,
    lastCheckedAt: 0,
    wageAmount: 10,
    lastPaidAt: 0,
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

test("multiple crew members and the player's own craft can all be active at once, each independently computed", () => {
  // The player's own craft, computed directly via the real craft() (same
  // call CraftScene makes) -- not routed through crew machinery at all.
  const playerResult = craft(
    craftAction("player-craft").inputs,
    ionForgedHullPlateRecipe,
    "Blue",
    "Grey",
    queueRandom([0]),
  );

  // Three crew members, each assigned to their own craft action, in the
  // same "turn" -- none of these calls reads or writes any state the
  // others touch.
  const goldCrew = assignToCraft(crewMember("crew-gold", "Gold"), craftAction("craft-gold"), queueRandom([1])) as AssignSucceeded;
  const greenCrew = assignToCraft(crewMember("crew-green", "Green"), craftAction("craft-green"), queueRandom([0.5])) as AssignSucceeded;
  const greyCrew = assignToCraft(crewMember("crew-grey", "Grey"), craftAction("craft-grey"), queueRandom([0])) as AssignSucceeded;

  // All four are simultaneously "active" -- none blocked or skipped
  // because another crafter (player or crew) already acted this turn.
  assert.equal(playerResult.accepted, true);
  assert.equal(goldCrew.updatedCrewMember.status, "active");
  assert.equal(greenCrew.updatedCrewMember.status, "active");
  assert.equal(greyCrew.updatedCrewMember.status, "active");

  // Each produced its own independent, differently-tiered result --
  // proving no shared/locked formula state leaked between calls (a
  // serialized single-craft-at-a-time implementation would have to
  // reuse or block on some shared resource; here every result differs
  // purely by its own crafter tier, exactly as craft() alone would give).
  const qualities = [goldCrew, greenCrew, greyCrew].map((r) =>
    r.craftResult.accepted ? r.craftResult.qualities.purity : null,
  );
  assert.equal(new Set(qualities).size, 3, "expected three distinct results, not a serialized/shared outcome");
});
