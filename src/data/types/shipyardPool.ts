import type { ShipCandidate } from "./shipCandidate.ts";

// Phase 5 GDD §2.2 -- a small, refreshing pool of unpurchased ships at one
// planet's market, the same "planet markets have their own state that
// changes over time" pattern already built for goods pricing (Phase 3)
// and NPC crew hiring (Phase 4), applied to whole ships instead.
//
// availableShips holds ShipCandidate, not Ship -- see shipCandidate.ts for
// why (a necessary correction to the amendment's own pseudocode).
export interface ShipyardPool {
  planetId: string;
  availableShips: ShipCandidate[];
  lastRefreshedAt: number;
}
