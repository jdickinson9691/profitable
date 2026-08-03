import { test } from "node:test";
import assert from "node:assert/strict";
import { unassignFromShipRole } from "../../src/ships/unassignFromShipRole.ts";
import type { CrewMember } from "../../src/data/types/crewMember.ts";

function crew(overrides: Partial<CrewMember> = {}): CrewMember {
  return {
    id: "c1",
    hiredByPlayerId: "player-1",
    tier: "Grey",
    profession: null,
    status: "idle",
    assignedCraftId: null,
    hiredAt: 0,
    lastCheckedAt: 0,
    wageAmount: 10,
    lastPaidAt: 0,
    ...overrides,
  };
}

test("unassignFromShipRole() clears shipRole and assignedShipId for an assigned crew member", () => {
  const member = crew({ shipRole: "Pilot", assignedShipId: "ship-1" });
  const result = unassignFromShipRole(member);
  assert.equal(result.unassigned, true);
  if (result.unassigned) {
    assert.equal(result.updatedCrewMember.shipRole, null);
    assert.equal(result.updatedCrewMember.assignedShipId, null);
  }
});

test("unassignFromShipRole() rejects a crew member with no current ship-role assignment", () => {
  const member = crew();
  const result = unassignFromShipRole(member);
  assert.equal(result.unassigned, false);
});

test("unassignFromShipRole() rejects a crew member whose fields are explicitly null rather than absent", () => {
  const member = crew({ shipRole: null, assignedShipId: null });
  const result = unassignFromShipRole(member);
  assert.equal(result.unassigned, false);
});

test("unassignFromShipRole() does not touch status/assignedCraftId -- independent axes, same as assignToShipRole()", () => {
  const member = crew({ shipRole: "Crafter", assignedShipId: "ship-1", status: "active", assignedCraftId: "craft-1" });
  const result = unassignFromShipRole(member);
  assert.equal(result.unassigned, true);
  if (result.unassigned) {
    assert.equal(result.updatedCrewMember.status, "active");
    assert.equal(result.updatedCrewMember.assignedCraftId, "craft-1");
  }
});

test("unassignFromShipRole() does not mutate the input CrewMember", () => {
  const member = crew({ shipRole: "Pilot", assignedShipId: "ship-1" });
  const snapshot = { ...member };
  unassignFromShipRole(member);
  assert.deepEqual(member, snapshot);
});
