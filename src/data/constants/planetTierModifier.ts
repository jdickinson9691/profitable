import type { PlanetTierModifier } from "../types/planetTierModifier.ts";

// Phase 2 GDD §2.2 -- flat additive modifier applied to rollQuality()'s
// base roll before clamping. Green is the neutral point here (not Grey,
// unlike the refiner/crafter/schematic tables) -- a planet isn't a skill
// investment, it's a place.
export const PLANET_TIER_MODIFIER: readonly PlanetTierModifier[] = [
  { tier: "Grey", qualityRollModifier: -15 },
  { tier: "White", qualityRollModifier: -8 },
  { tier: "Green", qualityRollModifier: 0 },
  { tier: "Blue", qualityRollModifier: 8 },
  { tier: "Purple", qualityRollModifier: 15 },
  { tier: "Orange", qualityRollModifier: 22 },
  { tier: "Gold", qualityRollModifier: 30 },
];

// Phase 2 GDD §2.5 -- flat modifier for a planet's one specialty resource,
// additive on top of PLANET_TIER_MODIFIER (never a replacement for it).
export const SPECIALTY_QUALITY_MODIFIER = 15;
