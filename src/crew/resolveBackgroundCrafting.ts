import type { CrewMember } from "../data/types/crewMember.ts";
import type { CraftAction } from "../data/types/craftAction.ts";
import type { BackgroundResult } from "../data/types/backgroundResult.ts";
import type { RandomFn } from "../data/types/random.ts";
import { craft } from "../simulation/craft.ts";
import { ELAPSED_TIME_CAP_HOURS, BACKGROUND_IDLE_OUTPUT_RATE } from "../data/constants/crewConfig.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

// Phase 4 GDD §2.1a. Elapsed time is always derived from
// currentTime - lastCheckedAt -- never trusts a caller-supplied duration,
// which is the entire point of storing lastCheckedAt rather than letting
// a client assert "N hours passed" (see crewMember.ts's own comment).
// `backgroundRate` is injectable (defaults to Agent 1's constant, which is
// null) rather than hardcoded, mirroring this codebase's existing
// injectable-with-a-default pattern (RandomFn, `now`) -- lets the real
// computation be tested against an explicit rate today, while a real
// caller with no override correctly hits the "not yet available" path
// until the design doc's still-open rate question is resolved.
export function resolveBackgroundCrafting(
  crewMember: CrewMember,
  craftAction: CraftAction,
  currentTime: number,
  backgroundRate: number | null = BACKGROUND_IDLE_OUTPUT_RATE,
  random?: RandomFn,
): BackgroundResult {
  const updatedCrewMember: CrewMember = { ...crewMember, lastCheckedAt: currentTime };

  if (backgroundRate === null) {
    return {
      resolved: false,
      reason: "background/idle output rate is not yet decided (Phase 4 GDD §2.1a, still open)",
      updatedCrewMember,
    };
  }

  const rawElapsedHours = (currentTime - crewMember.lastCheckedAt) / MS_PER_HOUR;
  const cappedElapsedHours = Math.min(Math.max(rawElapsedHours, 0), ELAPSED_TIME_CAP_HOURS);
  const unitsCompleted = Math.floor(cappedElapsedHours * backgroundRate);

  const results = [];
  for (let i = 0; i < unitsCompleted; i++) {
    results.push(craft(craftAction.inputs, craftAction.recipe, craftAction.schematicTier, crewMember.tier, random));
  }

  return { resolved: true, unitsCompleted, results, updatedCrewMember };
}
