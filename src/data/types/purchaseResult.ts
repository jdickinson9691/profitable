import type { Listing } from "./listing.ts";
import type { PlanetMarketState } from "./planetMarketState.ts";

// Necessary completion: Agent 11's contract names `purchaseListing(...):
// PurchaseResult` but Agent 1's Phase 3 amendment never defined this type
// (only Listing/PlanetMarketState/Wallet). Modeled on the existing
// CraftResult pattern (a discriminated union over `success`, mirroring
// CraftResult's `accepted`) rather than throwing, since a rejected purchase
// (self-trade, insufficient quantity) is a normal business outcome the
// caller must always handle -- same reasoning the GDD already applied to
// craft() rejections.
export interface PurchaseSucceeded {
  success: true;
  // The listing after this purchase -- quantity decremented. Still present
  // (not deleted) even when quantityRemaining reaches 0; see `closed`.
  updatedListing: Listing;
  closed: boolean;
  quantityPurchased: number;
  totalPaid: number;
  feeDeducted: number;
  proceedsToSeller: number;
  // Present only for a planet-market listing (applyDrift was triggered);
  // null for a global listing, which has no per-planet drift state.
  updatedMarketState: PlanetMarketState | null;
}

export interface PurchaseRejected {
  success: false;
  reason: string;
}

export type PurchaseResult = PurchaseSucceeded | PurchaseRejected;
