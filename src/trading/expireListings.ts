import type { Listing } from "../data/types/listing.ts";
import type { ListingExpiryResult, ReturnAction } from "../data/types/listingExpiry.ts";

// Phase 3 GDD §2.5. Necessary completion: takes the active `listings`
// array explicitly (same pure-function reasoning as purchaseListing/
// getGlobalPrice) rather than reading some implicit store.
export function expireListings(listings: Listing[], currentTime: number): ListingExpiryResult {
  const expired: Listing[] = [];
  const returned: ReturnAction[] = [];

  for (const listing of listings) {
    if (listing.expiresAt > currentTime) continue;
    expired.push(listing);

    // A listing that already sold out (quantity 0) has nothing to return.
    if (listing.quantity === 0) continue;

    if (listing.location === "global") {
      returned.push({
        itemId: listing.itemId,
        quantity: listing.quantity,
        playerId: listing.createdByPlayerId,
        destination: "inventory",
      });
    } else {
      returned.push({
        itemId: listing.itemId,
        quantity: listing.quantity,
        playerId: listing.createdByPlayerId,
        destination: "planet-pickup",
        planetId: listing.location.planetId,
      });
    }
  }

  return { expired, returned };
}
