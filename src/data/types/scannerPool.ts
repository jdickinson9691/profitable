import type { ScannerCandidate } from "./scannerCandidate.ts";

// Scanner/Probe GDD §2.2/§3 -- the same "refreshing, tier-rolled market
// pool" pattern already built for schematics, NPC crew (PlanetCrewPool),
// and ships (ShipyardPool), applied to scanners -- but its own separate
// pool type, not merged into ShipyardPool (GDD §2.2's explicit call-out).
//
// availableScanners holds ScannerCandidate, not Scanner -- see
// scannerCandidate.ts for why (a necessary correction to the GDD's own
// pseudocode).
export interface ScannerPool {
  planetId: string;
  availableScanners: ScannerCandidate[];
  lastRefreshedAt: number;
}
