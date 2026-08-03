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
// `backgroundRate` is injectable (defaults to crewConfig.ts's
// BACKGROUND_IDLE_OUTPUT_RATE, now resolved to a real 0.5 units/hour --
// see that constant's own comment for the "flat 50%" design decision and
// why 0.5/hour is the concrete number it resolves to) rather than
// hardcoded, mirroring this codebase's existing injectable-with-a-default
// pattern (RandomFn, `now`). The explicit `null` override still exists
// and still produces the "not yet available" result below -- kept for a
// caller that deliberately wants to represent "no background production
// mechanism at all" (e.g. a future crew type this doesn't apply to),
// not because the rate itself is unresolved anymore.
export function resolveBackgroundCrafting(
  crewMember: CrewMember,
  craftAction: CraftAction,
  currentTime: number,
  backgroundRate: number | null = BACKGROUND_IDLE_OUTPUT_RATE,
  random?: RandomFn,
  // Real-inventory availability cap, pre-resolved by the caller -- same
  // "core function never touches Inventory directly, caller passes in
  // what's available" boundary buildCitadel()'s materialQuantityAvailable
  // already established. Defaults to unbounded so every pre-existing call
  // site (and every existing test) is unaffected. CrewScene computes this
  // from real inventory via totalQuantity() before calling, so a crew
  // member idle for long enough to time-compute more units than the
  // player's actual stockpile supports is correctly clamped down, never
  // producing output from materials that don't exist.
  maxUnits: number = Infinity,
): BackgroundResult {
  const updatedCrewMember: CrewMember = { ...crewMember, lastCheckedAt: currentTime };

  if (backgroundRate === null) {
    return {
      resolved: false,
      reason: "no background/idle output rate configured for this call",
      updatedCrewMember,
    };
  }

  const rawElapsedHours = (currentTime - crewMember.lastCheckedAt) / MS_PER_HOUR;
  const cappedElapsedHours = Math.min(Math.max(rawElapsedHours, 0), ELAPSED_TIME_CAP_HOURS);
  const unitsCompleted = Math.min(Math.floor(cappedElapsedHours * backgroundRate), maxUnits);

  const results = [];
  for (let i = 0; i < unitsCompleted; i++) {
    results.push(craft(craftAction.inputs, craftAction.recipe, craftAction.schematicTier, crewMember.tier, random));
  }

  return { resolved: true, unitsCompleted, results, updatedCrewMember };
}
