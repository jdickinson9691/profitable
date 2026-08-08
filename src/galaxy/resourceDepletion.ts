// Per-Resource Quantity Caps. Pure, framework-agnostic tracking of how much
// of a resource's per-cycle cap (planetResourceCycle.ts's
// resourceQuantityCaps) has been gathered so far -- deliberately separate
// from that file's own ResourcesForCycle, which stays a pure function of
// (seed, tier, cycleIndex) with zero persisted state per planet.md's own
// Must-Not-Do. Consumption (how much has actually been taken) is a
// different kind of fact -- set by discrete player actions, not derivable
// from the seed -- so it lives in its own small pure module here, with the
// real persisted side-table one layer up in the presentation caller
// (src/presentation/resourceDepletionState.ts), mirroring the exact
// "pure core / persisted side-table caller" boundary planet-ownership.md's
// colonistCount already established.
export interface ResourceDepletionEntry {
  cycleIndex: number;
  quantityGathered: number;
}

// A stored entry from a stale cycle (cycleIndex !== currentCycleIndex)
// counts as "nothing gathered yet" this cycle -- no separate reset event
// needed, mirroring how getCurrentPlanetResources() itself treats a cycle
// transition as an implicit reset rather than an explicit one. cap === null
// (the tutorial-guarantee exemption) always returns null -- unconditionally
// available, no ceiling to compare against.
export function getRemainingQuantity(
  cap: number | null,
  entry: ResourceDepletionEntry | undefined,
  currentCycleIndex: number,
): number | null {
  if (cap === null) return null;
  const gathered = entry && entry.cycleIndex === currentCycleIndex ? entry.quantityGathered : 0;
  return Math.max(cap - gathered, 0);
}

// Returns the entry to persist after gathering `quantity` more units --
// never clamped against the cap here (the caller checks
// getRemainingQuantity() before allowing the gather action at all; this
// function only records what happened, the same "core function doesn't
// enforce a precondition the caller already checked" shape purchaseListing()
// /craft() use elsewhere). Same stale-cycle-resets-implicitly rule as
// getRemainingQuantity() above.
export function recordGather(
  entry: ResourceDepletionEntry | undefined,
  currentCycleIndex: number,
  quantity = 1,
): ResourceDepletionEntry {
  const gathered = entry && entry.cycleIndex === currentCycleIndex ? entry.quantityGathered : 0;
  return { cycleIndex: currentCycleIndex, quantityGathered: gathered + quantity };
}
