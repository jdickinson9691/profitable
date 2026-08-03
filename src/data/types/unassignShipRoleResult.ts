import type { CrewMember } from "./crewMember.ts";

// Ship Crew Roles amendment, task follow-up: the > Unassign action
// ship.md's own gap list flagged as missing. Same Result-union shape as
// AssignShipRoleResult/DismissResult -- "nothing to unassign" is a normal
// business rejection a UI must handle gracefully, not a caller error.
export interface UnassignShipRoleSucceeded {
  unassigned: true;
  updatedCrewMember: CrewMember;
}

export interface UnassignShipRoleRejected {
  unassigned: false;
  reason: string;
}

export type UnassignShipRoleResult = UnassignShipRoleSucceeded | UnassignShipRoleRejected;
