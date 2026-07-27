import type { CrewMember } from "./crewMember.ts";

// Phase 4 GDD §2.3 -- a small, refreshing pool of unhired candidates at
// one planet's market, the same "planet markets have their own state that
// changes over time" pattern already built for goods pricing (Phase 3),
// applied to crafters instead of items.
export interface PlanetCrewPool {
  planetId: string;
  availableHires: CrewMember[];
  lastRefreshedAt: number;
}
