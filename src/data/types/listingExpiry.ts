import type { Listing } from "./listing.ts";

// Necessary completion: Agent 11's contract names `expireListings(...): {
// expired: Listing[], returned: ReturnAction[] }` but Agent 1's Phase 3
// amendment never defined ReturnAction. Per GDD §2.5: a planet-market
// listing is held at that planet for pickup; a global-market listing
// returns straight to the creating player's inventory.
export interface ReturnAction {
  itemId: string;
  quantity: number;
  playerId: string;
  destination: "planet-pickup" | "inventory";
  // Present only when destination is "planet-pickup".
  planetId?: string;
}

export interface ListingExpiryResult {
  expired: Listing[];
  returned: ReturnAction[];
}
