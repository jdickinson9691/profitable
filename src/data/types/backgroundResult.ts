import type { CrewMember } from "./crewMember.ts";
import type { CraftResult } from "./craftResult.ts";

// Necessary completion: Agent 16's contract names
// `resolveBackgroundCrafting(...): BackgroundResult` but never defines it.
// `lastCheckedAt` advances to currentTime in both cases -- "checking on"
// a crew member resets the clock regardless of whether the background
// rate is available yet (§2.1a).
export interface BackgroundResolved {
  resolved: true;
  unitsCompleted: number;
  results: CraftResult[];
  updatedCrewMember: CrewMember;
}

export interface BackgroundRateUnavailable {
  resolved: false;
  reason: string;
  updatedCrewMember: CrewMember;
}

export type BackgroundResult = BackgroundResolved | BackgroundRateUnavailable;
