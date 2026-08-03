import type { CrewMember } from "../data/types/crewMember.ts";
import type { UnassignShipRoleResult } from "../data/types/unassignShipRoleResult.ts";

// Ship Crew Roles amendment, task follow-up (ship.md's own flagged gap:
// ShipStatusScene's assignment control had no way to clear a role back to
// fully unassigned without reassigning elsewhere). Mirrors dismissCrew()'s
// shape -- a single, always-succeeds-unless-nothing-to-do action, no
// capacity/eligibility check needed since clearing a slot can never
// violate one.
export function unassignFromShipRole(crewMember: CrewMember): UnassignShipRoleResult {
  if (crewMember.shipRole == null && crewMember.assignedShipId == null) {
    return { unassigned: false, reason: "crew member is not currently assigned to a ship role" };
  }

  return {
    unassigned: true,
    updatedCrewMember: { ...crewMember, shipRole: null, assignedShipId: null },
  };
}
