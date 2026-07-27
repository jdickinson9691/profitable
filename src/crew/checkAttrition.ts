import type { CrewMember } from "../data/types/crewMember.ts";
import type { AttritionResult } from "../data/types/attritionResult.ts";
import { UPKEEP_GRACE_PERIOD_HOURS } from "../data/constants/crewConfig.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

// Phase 4 GDD §2.7. Deterministic and upkeep-driven only -- never a
// random/chance-based check. Measures the grace period from lastPaidAt,
// not hiredAt, so a crew member who has been reliably paid for months
// doesn't depart just because it's been a long time since they were hired.
export function checkAttrition(crewMember: CrewMember, currentTime: number): AttritionResult {
  const unpaidHours = (currentTime - crewMember.lastPaidAt) / MS_PER_HOUR;
  if (unpaidHours > UPKEEP_GRACE_PERIOD_HOURS) {
    return { departed: true, reason: "upkeep unpaid past the grace period" };
  }
  return { departed: false };
}
