import type { ResourceInstance } from "../data/types/resourceInstance.ts";
import type { Listing, MarketLocation } from "../data/types/listing.ts";
import { computeAggregateTier } from "../simulation/aggregateTier.ts";
import { LISTING_EXPIRY_HOURS, GLOBAL_LISTABLE_MAX_ITEM_TIER } from "../data/constants/tradingConfig.ts";

const HOUR_MS = 60 * 60 * 1000;

// Phase 3 GDD §2.1/§2.3/§2.4/§2.5/§2.11. `id` is caller-supplied (this
// module has no identity-generation scheme of its own, matching Agent 11's
// pure-function mandate -- no hidden state, no implicit ID counter).
// `now` defaults to Date.now() but is injectable for deterministic tests,
// same pattern as refine()/craft()'s injectable RandomFn.
export function createListing(
  itemInstance: ResourceInstance,
  quantity: number,
  pricePerUnit: number,
  location: MarketLocation,
  playerId: string,
  id: string,
  now: number = Date.now(),
): Listing {
  const itemTier = itemInstance.resource.itemTier;
  // itemTier is optional (pre-Phase-3 resources never set it) -- undefined
  // is treated as "not tier-restricted" since there's no declared tier to
  // enforce a restriction against.
  if (location === "global" && itemTier !== undefined && itemTier > GLOBAL_LISTABLE_MAX_ITEM_TIER) {
    throw new Error(
      `createListing: item tier ${itemTier} exceeds the global-listable ceiling of ` +
        `${GLOBAL_LISTABLE_MAX_ITEM_TIER} -- tiers 6-7 are sell-restricted to planet markets`,
    );
  }

  const marketTier = computeAggregateTier(itemInstance.qualities);
  if (marketTier === null) {
    throw new Error(
      "createListing: cannot derive a marketTier -- every quality dimension is null for this item",
    );
  }

  return {
    id,
    itemId: itemInstance.resource.id,
    quantity,
    pricePerUnit,
    marketTier,
    location,
    createdByPlayerId: playerId,
    createdAt: now,
    expiresAt: now + LISTING_EXPIRY_HOURS * HOUR_MS,
  };
}
