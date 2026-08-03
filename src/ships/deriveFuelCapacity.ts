import type { TierColor } from "../data/types/tierColor.ts";
import { FUEL_CAPACITY_BY_TIER } from "../data/constants/shipsAndTravelConfig.ts";

// Ship Fuel (profitable-design-questions.md). Same shape as
// deriveShipTier.ts's tierMidpoint() -- a pure tier-keyed lookup, never
// reimplemented inline anywhere fuel capacity is needed.
export function deriveFuelCapacity(tier: TierColor): number {
  const entry = FUEL_CAPACITY_BY_TIER.find((e) => e.tier === tier);
  if (!entry) throw new RangeError(`no fuel capacity defined for tier ${tier}`);
  return entry.capacity;
}
