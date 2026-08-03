import type { CrewMember } from "../data/types/crewMember.ts";
import type { Ship } from "../data/types/ship.ts";
import type { ShipCrewRole } from "../data/types/shipCrewRole.ts";
import type { AssignShipRoleResult } from "../data/types/assignShipRoleResult.ts";
import { getCrewSlotsForShip } from "./getCrewSlotsForShip.ts";

// Ship Crew Roles amendment (profitable-design-questions.md). Mirrors
// assignToCraft()'s shape -- operates on an already-hired CrewMember,
// never touches hiring/pool/wage machinery. currentRoster is the
// player's full owned-crew list (any subset already assigned to *this*
// ship is what actually matters for the capacity count below).
export function assignToShipRole(
  crewMember: CrewMember,
  ship: Ship,
  role: ShipCrewRole,
  currentRoster: readonly CrewMember[],
): AssignShipRoleResult {
  // "The Crafter role slot reuses the existing profession taxonomy
  // directly" -- only tier-6/7 crew (profession !== null) are eligible.
  // The other 4 roles are explicitly NOT gated by tier or profession.
  if (role === "Crafter" && crewMember.profession === null) {
    return { assigned: false, reason: "only a crew member with a profession can be assigned the Crafter role" };
  }

  const slots = getCrewSlotsForShip(ship);
  // combatEngineerOrScienceOfficer is a single combined pool shared by
  // both roles, not two independent caps -- an occupant of either role
  // counts against the same total.
  const isCombinedPoolRole = role === "Combat Engineer" || role === "Science Officer";
  const capacity = isCombinedPoolRole
    ? slots.combatEngineerOrScienceOfficer
    : role === "Pilot"
      ? slots.pilot
      : role === "Systems Engineer"
        ? slots.systemsEngineer
        : slots.crafter;

  if (capacity <= 0) {
    return { assigned: false, reason: `no ${role} slot exists on a ${ship.tier}-tier ship` };
  }

  const occupied = currentRoster.filter(
    (member) =>
      member.id !== crewMember.id &&
      member.assignedShipId === ship.id &&
      (isCombinedPoolRole
        ? member.shipRole === "Combat Engineer" || member.shipRole === "Science Officer"
        : member.shipRole === role),
  ).length;

  if (occupied >= capacity) {
    return { assigned: false, reason: `${role} slot is full (${occupied}/${capacity})` };
  }

  return {
    assigned: true,
    // Reassigning clears the previous assignment automatically -- both
    // fields live on this same CrewMember record, so overwriting them
    // is the entire "clear the previous one" rule (Must-Not-Do: a crew
    // member can't hold two ship-role slots at once).
    updatedCrewMember: { ...crewMember, shipRole: role, assignedShipId: ship.id },
  };
}
