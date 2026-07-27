import type { CrewMember } from "../data/types/crewMember.ts";
import type { DismissResult } from "../data/types/dismissResult.ts";

// Phase 4 GDD §2.7 -- voluntary dismissal, always succeeds for the
// crew member's actual owner.
export function dismissCrew(crewMember: CrewMember, playerId: string): DismissResult {
  if (crewMember.hiredByPlayerId !== playerId) {
    return { dismissed: false, reason: "player does not own this crew member" };
  }
  return { dismissed: true };
}
