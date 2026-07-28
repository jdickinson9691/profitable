import type { EncounterResult } from "./encounter.ts";
import type { CombatEncounter } from "./combatEncounter.ts";

// Combat GDD §1/§2.2/§4.1 -- necessary completion: resolveEncounters()'s
// pre-Combat return type (EncounterResult[]) can't also carry a newly
// detected pending CombatEncounter, since CombatEncounter deliberately
// isn't an EncounterResult variant (see encounter.ts's own note on why --
// combat can't resolve synchronously in the same pass). But Combat's
// detection is required to share the *same* per-window type-split roll as
// the other three types (GDD §1: "detected during the normal window-
// roll... process"), so it has to happen inside resolveEncounters()'s own
// loop, not a separate function re-rolling a second random() sequence.
// This wraps both outputs from that one pass together, rather than
// resolveEncounters() gaining a second, out-of-band return channel.
export interface EncounterResolution {
  encounters: EncounterResult[];
  pendingCombats: CombatEncounter[];
}
