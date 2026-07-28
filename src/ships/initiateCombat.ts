import type { RandomFn } from "../data/types/random.ts";
import type { CombatEncounter } from "../data/types/combatEncounter.ts";
import { getTierColor } from "../simulation/tierColor.ts";

// Combat GDD §2.2/§2.4/§3, named directly by Agent 20's own contract:
// "initiateCombat() (creates the pending CombatEncounter, rolls opponent
// threat, does not resolve win/lose yet)." Shared by both trigger points
// (the travel-window roll, inside resolveEncounters(), and the arrival
// check, inside resolveArrival()) -- the only randomness that happens at
// detection time is this one 1-100 roll mapped through the shared tier
// breakpoint table (reusing getTierColor(), never reimplementing it); the
// variance-adjusted combat value that actually decides win/lose isn't
// rolled until resolveCombatChoice(), fresh, at resolution time.
//
// `id` is caller-supplied -- no hidden ID-generation scheme, same
// discipline as every other creator function in this codebase
// (initiateVoyage(), createListing()). Both call sites derive a
// deterministic id from the voyage/window the encounter belongs to,
// rather than this function inventing its own scheme.
export function initiateCombat(
  id: string,
  voyageId: string,
  triggerContext: "travel" | "arrival",
  windowIndex: number | null,
  random: RandomFn,
): CombatEncounter {
  const threatRoll = Math.floor(random() * 100) + 1;
  return {
    id,
    voyageId,
    triggerContext,
    opponentThreatTier: getTierColor(threatRoll),
    status: "pending",
    outcome: null,
    windowIndex,
  };
}
