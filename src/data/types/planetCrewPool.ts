import type { CrewCandidate } from "./crewCandidate.ts";

// Phase 4 GDD §2.3 -- a small, refreshing pool of unhired candidates at
// one planet's market, the same "planet markets have their own state that
// changes over time" pattern already built for goods pricing (Phase 3),
// applied to crafters instead of items.
//
// availableHires holds CrewCandidate, not CrewMember -- see
// crewCandidate.ts for why (a necessary correction discovered while
// implementing Agent 16, not part of the original amendment pseudocode).
export interface PlanetCrewPool {
  planetId: string;
  availableHires: CrewCandidate[];
  lastRefreshedAt: number;
}
