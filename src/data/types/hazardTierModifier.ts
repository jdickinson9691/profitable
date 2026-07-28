import type { TierColor } from "./tierColor.ts";

// Travel Encounters (Non-Combat) GDD §2.6 -- "a single roll against a fixed
// threshold, modified by ship tier." A flat additive bonus to the roll,
// same shape as PLANET_TIER_MODIFIER, but Grey = +0 (no bonus, not a
// penalty) rather than PLANET_TIER_MODIFIER's negative Grey/White rows --
// ship tier here is a skill/equipment investment axis (like refiner/
// crafter/schematic tier), not a "how good is this place" axis like planet
// tier, so it follows the same "Grey is the floor, not a penalty"
// convention SHIP_TIER_SPEED_MODIFIER already established for ships.
export interface HazardTierModifier {
  tier: TierColor;
  rollBonus: number;
}
