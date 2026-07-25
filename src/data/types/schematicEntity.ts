import type { TierColor } from "./tierColor.ts";

// A craftable schematic item -- distinct from the schematic TIER
// contribution table (schematicTier.ts), which is the formula input this
// entity's `tier` field feeds into.
export interface Schematic {
  id: string;
  name: string;
  recipeId: string;
  tier: TierColor;
}
