import type { Listing } from "../data/types/listing.ts";
import type { PlanetMarketState } from "../data/types/planetMarketState.ts";
import type { PurchaseResult } from "../data/types/purchaseResult.ts";
import { TRANSACTION_FEE_PERCENT } from "../data/constants/tradingConfig.ts";
import { applyDrift } from "./drift.ts";

// Phase 3 GDD §2.3/§2.6/§2.11. Necessary completion: the contract's
// `purchaseListing(listingId, quantityToBuy, buyerPlayerId)` signature
// implies looking a listing up by ID out of some implicit store, which
// contradicts the same contract's own testing requirement that every
// function be "pure and deterministic given fixed inputs." Takes the
// actual Listing (and, for a planet listing, its PlanetMarketState) as
// explicit parameters instead -- same resolution as getGlobalPrice, and
// consistent with every other pure function in this codebase. Whatever
// maintains the real listing/market-state store (Agent 13/15) is
// responsible for the ID lookup and for persisting the returned
// updatedListing/updatedMarketState.
//
// marketState is required for a planet listing (location: {planetId})
// and must be null for a global listing -- global listings have no
// per-planet drift state to update (GDD §2.6 is per-planet only).
export function purchaseListing(
  listing: Listing,
  quantityToBuy: number,
  buyerPlayerId: string,
  marketState: PlanetMarketState | null,
): PurchaseResult {
  if (buyerPlayerId === listing.createdByPlayerId) {
    return { success: false, reason: "a listing's creator cannot purchase their own listing" };
  }

  if (quantityToBuy <= 0) {
    return { success: false, reason: "quantityToBuy must be positive" };
  }

  if (quantityToBuy > listing.quantity) {
    return {
      success: false,
      reason: `requested ${quantityToBuy} but the listing only has ${listing.quantity} available`,
    };
  }

  const isPlanetListing = listing.location !== "global";
  if (isPlanetListing && marketState === null) {
    throw new Error("purchaseListing: a planet-market listing requires its PlanetMarketState");
  }
  if (!isPlanetListing && marketState !== null) {
    throw new Error("purchaseListing: a global listing has no per-planet drift state");
  }

  const totalPaid = quantityToBuy * listing.pricePerUnit;
  const feeDeducted = totalPaid * TRANSACTION_FEE_PERCENT;
  const proceedsToSeller = totalPaid - feeDeducted;

  const remainingQuantity = listing.quantity - quantityToBuy;
  const closed = remainingQuantity === 0;
  const updatedListing: Listing = { ...listing, quantity: remainingQuantity };

  // A purchase removes supply from the market, so it drifts the price up
  // (direction: 'buy') -- see drift.ts's own comment on direction meaning.
  const updatedMarketState = marketState === null ? null : applyDrift(marketState, quantityToBuy, "buy");

  return {
    success: true,
    updatedListing,
    closed,
    quantityPurchased: quantityToBuy,
    totalPaid,
    feeDeducted,
    proceedsToSeller,
    updatedMarketState,
  };
}
