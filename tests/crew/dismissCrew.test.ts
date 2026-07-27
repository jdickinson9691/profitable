import { test } from "node:test";
import assert from "node:assert/strict";
import { dismissCrew } from "../../src/crew/dismissCrew.ts";
import type { CrewMember } from "../../src/data/types/crewMember.ts";

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

test("dismissCrew() always succeeds for the crew member's actual owner", () => {
  const result = dismissCrew(crewMember({ hiredByPlayerId: "player-1" }), "player-1");
  assert.equal(result.dismissed, true);
});

test("dismissCrew() rejects a non-owner", () => {
  const result = dismissCrew(crewMember({ hiredByPlayerId: "player-1" }), "player-2");
  assert.equal(result.dismissed, false);
});
