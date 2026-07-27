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
}
