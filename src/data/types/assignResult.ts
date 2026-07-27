import type { CrewMember } from "./crewMember.ts";
import type { CraftResult } from "./craftResult.ts";

// Necessary completion: Agent 16's contract names `assignToCraft(...):
// AssignResult` but never defines it.
export interface AssignSucceeded {
  assigned: true;
  updatedCrewMember: CrewMember;
  craftResult: CraftResult;
}

export interface AssignRejected {
  assigned: false;
  reason: string;
}

export type AssignResult = AssignSucceeded | AssignRejected;
