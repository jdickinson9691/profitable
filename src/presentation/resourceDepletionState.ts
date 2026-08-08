import { saveSystem } from "./gameState.ts";
import type { ResourceDepletionEntry } from "../galaxy/resourceDepletion.ts";
import { recordGather } from "../galaxy/resourceDepletion.ts";

// Per-Resource Quantity Caps. Persisted side-table -- mirrors
// planetOwnershipState.ts's own shape exactly (same SaveSystem-backed
// load-once/mutate/persist pattern), keyed one level deeper since this
// tracks a (planetId, resourceId) pair rather than just planetId.
const RESOURCE_DEPLETION_STATE_SAVE_KEY = "profitable:resourceDepletionState";

let resourceDepletionState: Record<string, Record<string, ResourceDepletionEntry>> =
  (saveSystem.load(RESOURCE_DEPLETION_STATE_SAVE_KEY) as Record<string, Record<string, ResourceDepletionEntry>> | null) ?? {};

function persist(): void {
  saveSystem.save(RESOURCE_DEPLETION_STATE_SAVE_KEY, resourceDepletionState);
}

export function getResourceDepletionEntry(planetId: string, resourceId: string): ResourceDepletionEntry | undefined {
  return resourceDepletionState[planetId]?.[resourceId];
}

// Reads the current entry, advances it through resourceDepletion.ts's own
// pure recordGather(), and persists -- the only place in this file that
// calls the core function, same "caller owns persistence, core owns the
// formula" boundary planetOwnershipState.ts's own setters follow.
export function recordResourceGather(
  planetId: string,
  resourceId: string,
  currentCycleIndex: number,
  quantity = 1,
): ResourceDepletionEntry {
  const existing = getResourceDepletionEntry(planetId, resourceId);
  const next = recordGather(existing, currentCycleIndex, quantity);
  resourceDepletionState = {
    ...resourceDepletionState,
    [planetId]: { ...resourceDepletionState[planetId], [resourceId]: next },
  };
  persist();
  return next;
}
