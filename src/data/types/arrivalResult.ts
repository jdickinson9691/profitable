import type { Ship } from "./ship.ts";
import type { VoyageCargoItem } from "./voyage.ts";
import type { EncounterResult } from "./encounter.ts";
import type { CombatEncounter } from "./combatEncounter.ts";

// Necessary completion: Agent 20's contract names `resolveArrival(...):
// ArrivalResult` but never defines it. Reports the delivered ship
// (currentPlanetId updated to the destination) and the delivered cargo --
// it does NOT itself activate any Phase 3 Listing for in-transit sale
// cargo, since Agent 20 must never touch Agent 11's trading logic. The
// caller (Presentation/Integration) is responsible for turning delivered
// cargo into a real Listing via Agent 11's own createListing().
export interface ArrivalResolved {
  resolved: true;
  updatedShip: Ship;
  destinationPlanetId: string;
  cargo: VoyageCargoItem[];
  // Travel Encounters (Non-Combat) amendment addition -- necessary
  // completion beyond that amendment's own "attach the result to
  // voyage.encounters" wording: nothing in this codebase persists a
  // Voyage object after arrival (the caller removes it once resolved, per
  // shipsState.ts/TradeMapScene.onResolveArrival()'s existing pattern),
  // so a mutation on a discarded Voyage instance would never actually
  // reach any caller. Surfaced here instead, the same way `cargo` already
  // is -- always present, empty when resolveArrival() was called without
  // the encounter-resolution parameters (destinationPlanet/resources),
  // e.g. every pre-Travel-Encounters call site.
  encounters: EncounterResult[];
  // Combat GDD §1/§2.2/§3: same "always present, empty by default"
  // convention as `encounters` above -- populated only when a caller
  // opts into encounter resolution at all (destinationPlanet/resources
  // both supplied), covering combat detected at either trigger point
  // (a travel-window roll, via resolveEncounters(); or the separate
  // arrival check, rolled directly here). Never contains a `resolved`
  // CombatEncounter -- that only happens via an explicit, later
  // resolveCombatChoice() call, never as a side effect of arrival.
  pendingCombats: CombatEncounter[];
}

export interface ArrivalNotYetDue {
  resolved: false;
  reason: string;
}

export type ArrivalResult = ArrivalResolved | ArrivalNotYetDue;
