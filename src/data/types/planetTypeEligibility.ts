import type { PlanetType } from "./planetType.ts";

export interface PlanetTypeEligibility {
  planetType: PlanetType;
  // Broad resource categories -- GDD §2.3's own vocabulary ("Solid" /
  // "Gas" / "Crystal"), a different string space from Resource.category
  // (which stays free-form per the MVP's Resource type). Reconciling the
  // two is generation logic (Agent 8's job), not a schema/type concern.
  eligibleCategories: string[];
}
