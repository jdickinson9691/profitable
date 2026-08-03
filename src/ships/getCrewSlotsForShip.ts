import type { Ship } from "../data/types/ship.ts";
import type { CrewSlotsByTierEntry } from "../data/constants/shipsAndTravelConfig.ts";
import { CREW_SLOTS_BY_TIER } from "../data/constants/shipsAndTravelConfig.ts";
import { deriveShipTier } from "./deriveShipTier.ts";

// Ship Crew Roles amendment (profitable-design-questions.md). Slot
// composition scales with the ship's own derived tier, the same
// tier-driven-effects pattern as SHIP_TIER_SPEED_MODIFIER/
// FUEL_CAPACITY_BY_TIER -- never a component-driven stat.
export function getCrewSlotsForShip(ship: Ship): CrewSlotsByTierEntry {
  const tier = deriveShipTier(ship);
  const entry = CREW_SLOTS_BY_TIER.find((e) => e.tier === tier);
  if (!entry) throw new RangeError(`no crew slot allocation defined for tier ${tier}`);
  return entry;
}
