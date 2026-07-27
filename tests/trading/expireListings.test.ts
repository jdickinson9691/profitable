import { test } from "node:test";
import assert from "node:assert/strict";
import { expireListings } from "../../src/trading/expireListings.ts";
import type { Listing } from "../../src/data/types/listing.ts";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    itemId: "igneous-ore",
    quantity: 5,
    pricePerUnit: 10,
    marketTier: "Blue",
    location: "global",
    createdByPlayerId: "seller-1",
    createdAt: 0,
    expiresAt: 1000,
    ...overrides,
  };
}

test("expireListings() marks a planet listing held-for-pickup at that planet, not deleted or auto-returned to inventory", () => {
  const l = listing({ location: { planetId: "delta-rigelus" }, expiresAt: 1000 });
  const result = expireListings([l], 2000);
  assert.deepEqual(result.expired, [l]);
  assert.deepEqual(result.returned, [
    { itemId: "igneous-ore", quantity: 5, playerId: "seller-1", destination: "planet-pickup", planetId: "delta-rigelus" },
  ]);
});

test("expireListings() returns a global listing straight to the creating player's inventory", () => {
  const l = listing({ location: "global", expiresAt: 1000 });
  const result = expireListings([l], 2000);
  assert.deepEqual(result.expired, [l]);
  assert.deepEqual(result.returned, [
    { itemId: "igneous-ore", quantity: 5, playerId: "seller-1", destination: "inventory" },
  ]);
});

test("expireListings() ignores a listing that hasn't expired yet", () => {
  const l = listing({ expiresAt: 5000 });
  const result = expireListings([l], 2000);
  assert.deepEqual(result.expired, []);
  assert.deepEqual(result.returned, []);
});

test("expireListings() has nothing to return for an already-sold-out listing", () => {
  const l = listing({ quantity: 0, expiresAt: 1000 });
  const result = expireListings([l], 2000);
  assert.deepEqual(result.expired, [l]);
  assert.deepEqual(result.returned, []);
});

test("expireListings() processes multiple listings independently", () => {
  const l1 = listing({ id: "l1", location: "global", expiresAt: 1000 });
  const l2 = listing({ id: "l2", location: { planetId: "p2" }, expiresAt: 900 });
  const l3 = listing({ id: "l3", expiresAt: 9999 }); // not expired
  const result = expireListings([l1, l2, l3], 2000);
  assert.equal(result.expired.length, 2);
  assert.equal(result.returned.length, 2);
});
