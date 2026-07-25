import type { SchematicTierContribution } from "../types/schematicTier.ts";

// GDD §3.3 — schematic tier contribution, additive on top of crafter tier.
export const SCHEMATIC_TIER_CONTRIBUTION: readonly SchematicTierContribution[] = [
  { tier: "Grey", ceilingRaise: 0, varianceNarrowing: 0, penaltyForgiveness: 0 },
  { tier: "White", ceilingRaise: 0.01, varianceNarrowing: -0.005, penaltyForgiveness: 0.05 },
  { tier: "Green", ceilingRaise: 0.02, varianceNarrowing: -0.01, penaltyForgiveness: 0.1 },
  { tier: "Blue", ceilingRaise: 0.03, varianceNarrowing: -0.015, penaltyForgiveness: 0.15 },
  { tier: "Purple", ceilingRaise: 0.04, varianceNarrowing: -0.02, penaltyForgiveness: 0.2 },
  { tier: "Orange", ceilingRaise: 0.05, varianceNarrowing: -0.025, penaltyForgiveness: 0.25 },
  { tier: "Gold", ceilingRaise: 0.06, varianceNarrowing: -0.03, penaltyForgiveness: 0.35 },
];

// GDD §3.3 — crafter + schematic ceiling raise is capped at +18% combined,
// not the raw arithmetic sum (which would be +21% at max/max).
export const COMBINED_CEILING_CAP = 0.18;
