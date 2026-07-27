import { test } from "node:test";
import assert from "node:assert/strict";
import { purchaseListing } from "../../src/trading/purchaseListing.ts";
import type { Listing } from "../../src/data/types/listing.ts";
import type { PlanetMarketState } from "../../src/data/types/planetMarketState.ts";
import type { PurchaseSucceeded } from "../../src/data/types/purchaseResult.ts";

function baseListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    itemId: "igneous-ore",
    quantity: 10,
    pricePerUnit: 20,
    marketTier: "Blue",
    location: "global",
    createdByPlayerId: "seller-1",
    createdAt: 0,
    expiresAt: 1000,
    ...overrides,
  };
}

function marketState(overrides: Partial<PlanetMarketState> = {}): PlanetMarketState {
  return { planetId: "delta-rigelus", itemId: "igneous-ore", currentPrice: 20, basePrice: 20, ...overrides };
}

test("purchaseListing() rejects a self-trade outright", () => {
  const listing = baseListing({ createdByPlayerId: "player-1" });
  const result = purchaseListing(listing, 1, "player-1", null);
  assert.equal(result.success, false);
});

test("purchaseListing() rejects buying more than the listing has", () => {
  const listing = baseListing({ quantity: 5 });
  const result = purchaseListing(listing, 6, "buyer-1", null);
  assert.equal(result.success, false);
});

test("purchaseListing() rejects a non-positive quantity", () => {
  const listing = baseListing();
  const result = purchaseListing(listing, 0, "buyer-1", null);
  assert.equal(result.success, false);
});

test("purchaseListing() partial purchase decrements quantity without closing the listing", () => {
  const listing = baseListing({ quantity: 10 });
  const result = purchaseListing(listing, 4, "buyer-1", null) as PurchaseSucceeded;
  assert.equal(result.success, true);
  assert.equal(result.updatedListing.quantity, 6);
  assert.equal(result.closed, false);
});

test("purchaseListing() closes the listing when quantity reaches zero", () => {
  const listing = baseListing({ quantity: 4 });
  const result = purchaseListing(listing, 4, "buyer-1", null) as PurchaseSucceeded;
  assert.equal(result.success, true);
  assert.equal(result.updatedListing.quantity, 0);
  assert.equal(result.closed, true);
});

test("purchaseListing() deducts the exact flat transaction fee, removed from the economy", () => {
  const listing = baseListing({ pricePerUnit: 20 });
  const result = purchaseListing(listing, 5, "buyer-1", null) as PurchaseSucceeded;
  assert.equal(result.success, true);
  assert.equal(result.totalPaid, 100); // 5 * 20
  assert.equal(result.feeDeducted, 5); // 5% of 100
  assert.equal(result.proceedsToSeller, 95); // not paid to buyer or seller
  // The fee is neither part of what the seller receives nor of what the
  // buyer is refunded -- it simply doesn't appear on either side.
  assert.equal(result.feeDeducted + result.proceedsToSeller, result.totalPaid);
});

test("purchaseListing() throws if a planet listing is purchased without its market state", () => {
  const listing = baseListing({ location: { planetId: "delta-rigelus" } });
  assert.throws(() => purchaseListing(listing, 1, "buyer-1", null));
});

test("purchaseListing() throws if a global listing is purchased with a market state", () => {
  const listing = baseListing({ location: "global" });
  assert.throws(() => purchaseListing(listing, 1, "buyer-1", marketState()));
});

test("purchaseListing() triggers a baseline drift update for a planet listing (direction: buy)", () => {
  const listing = baseListing({ location: { planetId: "delta-rigelus" }, quantity: 10 });
  const state = marketState({ currentPrice: 20, basePrice: 20 });
  const result = purchaseListing(listing, 1, "buyer-1", state) as PurchaseSucceeded;
  assert.equal(result.success, true);
  // A purchase removes supply -> price rises (matches drift.test.ts's
  // direction convention).
  assert.ok(result.updatedMarketState !== null);
  assert.ok(result.updatedMarketState!.currentPrice > 20);
});

test("purchaseListing() leaves updatedMarketState null for a global listing", () => {
  const listing = baseListing({ location: "global" });
  const result = purchaseListing(listing, 1, "buyer-1", null) as PurchaseSucceeded;
  assert.equal(result.success, true);
  assert.equal(result.updatedMarketState, null);
});
