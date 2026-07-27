import type { TierColor } from "./tierColor.ts";
import type { Profession } from "./profession.ts";

// Necessary correction to the Phase 4 amendment, discovered while
// implementing Agent 16: PlanetCrewPool.availableHires was typed as
// CrewMember[], but an unhired pool candidate has no real
// hiredByPlayerId/hiredAt/wageAmount/lastPaidAt yet -- those fields are
// only meaningful once hireCrew() actually hires someone. CrewCandidate
// is the "browsable, not-yet-hired" shape; hireCrew() is what turns one
// into a real CrewMember (assigning the hire-specific fields at that
// moment). This is a field-type correction, not a pure addition, unlike
// this project's usual necessary-completion pattern -- documented
// prominently rather than silently forcing fake values into CrewMember's
// required fields to preserve the letter of the original pseudocode.
export interface CrewCandidate {
  id: string;
  tier: TierColor;
  profession: Profession | null;
}
