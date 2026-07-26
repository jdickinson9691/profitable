import type { PlanetTypeEligibility } from "../types/planetTypeEligibility.ts";

// Phase 2 GDD §2.3 -- a hard filter on eligible resource categories per
// Planet Type, not a bias. Super-Earth's "(occasionally Gas)" in the
// design doc describes natural variance in the random subset draw once
// Gas is eligible, not a second soft-filter on top of this hard one --
// Gas is included in its eligible list here, full stop.
export const PLANET_TYPE_ELIGIBILITY: readonly PlanetTypeEligibility[] = [
  { planetType: "Terrestrial", eligibleCategories: ["Solid", "Crystal"] },
  { planetType: "SuperEarth", eligibleCategories: ["Solid", "Crystal", "Gas"] },
  { planetType: "Neptunian", eligibleCategories: ["Gas", "Crystal"] },
  { planetType: "GasGiant", eligibleCategories: ["Gas"] },
];
