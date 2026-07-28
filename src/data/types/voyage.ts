import type { EncounterResult } from "./encounter.ts";

// Phase 5 GDD §2.8/§2.9, §3 -- a ship in transit between two planets.
// arrivesAt is computed once, at initiation (calculateTravelTime() at
// departure time) -- never recomputed mid-voyage even if the ship's tier
// changes afterward (a voyage's arrival time is locked in). cargo supports
// the Phase 3 remote tier 6-7 sale mechanic: an item traveling to a
// discovered planet as part of a market sale, not becoming an active
// listing at the destination until resolveArrival() actually delivers it.
export interface VoyageCargoItem {
  itemId: string;
  quantity: number;
}

export interface Voyage {
  id: string;
  shipId: string;
  originPlanetId: string;
  destinationPlanetId: string;
  departedAt: number;
  arrivesAt: number;
  cargo: VoyageCargoItem[];
  // Travel Encounters (Non-Combat) amendment addition, populated by
  // resolveArrival(). Deliberately OPTIONAL, not required -- per this
  // amendment's own testing requirement ("confirm the extended Voyage type
  // still validates all existing Phase 5 voyage data without requiring
  // changes to that data"), a Voyage already sitting in a player's saved
  // shipsState.ts voyages list from before this amendment shipped has no
  // `encounters` field at all; making it required would break that
  // existing persisted data. Differs from Ship.currentPlanetId's own
  // precedent (added as required, with fixtures updated) specifically
  // because that amendment never asked for backward compatibility and
  // this one explicitly does.
  encounters?: EncounterResult[];
  // Combat GDD §3: necessary correction to the amendment's own literal
  // pseudocode (`isRetreat: boolean // new field only`, no `?`) --
  // written as required, but this amendment's own testing requirement
  // ("confirm Voyage... still validates all existing prior-phase data
  // without requiring changes") demands the exact same backward
  // compatibility `encounters` above was made optional for. A Voyage
  // persisted before this amendment shipped has no `isRetreat` field at
  // all; a required boolean would break it. True only for a retreat
  // voyage initiated after a combat loss/flee (Combat GDD §2.6) --
  // callers should treat a missing value the same as `false`, never as a
  // distinct third state.
  isRetreat?: boolean;
}
