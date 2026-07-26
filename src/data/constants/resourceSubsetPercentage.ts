import type { ResourceSubsetPercentage } from "../types/resourceSubsetPercentage.ts";

// Phase 2 GDD §2.4 -- percentage of eligible resources included in a
// planet's producible subset, by tier. count = max(1, ceil(percentage *
// eligible_count)) -- the max(1, ...) floor and the count formula itself
// are generation logic (Agent 8's job), not data.
export const RESOURCE_SUBSET_PERCENTAGE: readonly ResourceSubsetPercentage[] = [
  { tier: "Grey", percentage: 0.2 },
  { tier: "White", percentage: 0.35 },
  { tier: "Green", percentage: 0.5 },
  { tier: "Blue", percentage: 0.65 },
  { tier: "Purple", percentage: 0.8 },
  { tier: "Orange", percentage: 0.9 },
  { tier: "Gold", percentage: 1.0 },
];
