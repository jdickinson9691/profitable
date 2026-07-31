import type { EncounterType } from "../data/types/encounter.ts";

// Alpha Section 4 debug panel: a one-shot "force the next voyage arrival
// to include this encounter type" request, set by DebugPanelScene and
// consumed+cleared by TradeMapScene.onResolveArrival() on the very next
// resolveArrival() call. Session-only (deliberately not routed through
// SaveSystem) -- this is a live testing shortcut for the current session,
// not save data a player's game should carry.
let forcedEncounterType: EncounterType | null = null;

export function setForcedEncounterType(type: EncounterType | null): void {
  forcedEncounterType = type;
}

export function getForcedEncounterType(): EncounterType | null {
  return forcedEncounterType;
}

// Consumes (reads + clears) in one step, so a single request only ever
// affects the very next resolveArrival() call, never a second one by
// accident.
export function consumeForcedEncounterType(): EncounterType | null {
  const type = forcedEncounterType;
  forcedEncounterType = null;
  return type;
}
