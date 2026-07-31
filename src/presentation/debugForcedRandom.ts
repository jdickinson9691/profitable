import type { RandomFn } from "../data/types/random.ts";
import type { EncounterType } from "../data/types/encounter.ts";
import { ENCOUNTER_TYPE_WEIGHTS } from "../data/constants/shipsAndTravelConfig.ts";

// Mirrors resolveEncounters.ts's own TYPE_ORDER exactly -- the cumulative
// band math below only lands in the right bucket if this matches that
// file's iteration order.
const TYPE_ORDER: readonly EncounterType[] = ["tradeOpportunity", "discovery", "hazard", "combat"];

// Debug-only testing shortcut (Alpha Section 4's "force encounter"
// requirement) -- NOT a difficulty change, and not a simulation-logic
// change: resolveArrival()/resolveEncounters() are untouched. Builds a
// RandomFn that guarantees the very first encounter-check window triggers
// (its 1st random() call) and rolls into `type` (its 2nd call, landing at
// the midpoint of that type's slice of ENCOUNTER_TYPE_WEIGHTS' cumulative
// range) -- the same two random() calls a natural roll would make to
// produce that outcome. Every call after the 2nd falls through to real
// Math.random(), so the forced encounter's own inner details (credits
// granted, which resource, hazard pass roll, opponent threat tier) still
// roll through the genuine formula, exactly as a naturally-triggered
// encounter would -- only "does an encounter happen, and which type" is
// forced, never its content. Passed into resolveArrival()'s existing,
// already-optional `random` parameter (built for exactly this kind of
// deterministic injection -- the entire test suite already relies on it).
export function buildForcedEncounterRandom(type: EncounterType): RandomFn {
  let callIndex = 0;
  return () => {
    callIndex++;
    if (callIndex === 1) return 0; // trigger-chance check: always passes
    if (callIndex === 2) {
      let cumulative = 0;
      for (const candidate of TYPE_ORDER) {
        const weight = ENCOUNTER_TYPE_WEIGHTS[candidate];
        if (candidate === type) return cumulative + weight / 2;
        cumulative += weight;
      }
      return cumulative; // unreachable for a valid EncounterType
    }
    return Math.random();
  };
}
