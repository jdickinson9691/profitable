import type { CrewMember } from "./crewMember.ts";

// Ship Crew Roles amendment. Same Result-union shape as AssignResult/
// HireResult -- slot-full and Crafter-without-profession are normal
// business rejections a UI must handle gracefully, not caller errors.
export interface AssignShipRoleSucceeded {
  assigned: true;
  updatedCrewMember: CrewMember;
}

export interface AssignShipRoleRejected {
  assigned: false;
  reason: string;
}

export type AssignShipRoleResult = AssignShipRoleSucceeded | AssignShipRoleRejected;
