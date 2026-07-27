import { test } from "node:test";
import assert from "node:assert/strict";
import { createListing } from "../../src/trading/createListing.ts";
import { makeInstance } from "../fixtures/instances.ts";
import type { Resource } from "../../src/data/types/resource.ts";

function resourceWithTier(itemTier: number | undefined): Resource {
  return {
    id: "test-item",
    name: "Test Item",
    category: "test",
    applicableQualities: { purity: true, density: true, potency: true, durability: true, rarity: true },
    itemTier,
  };
}

test("createListing() rejects a tier 6 item listed globally", () => {
  const instance = makeInstance(resourceWithTier(6), 1, { purity: 50, density: 50, potency: 50, durability: 50, rarity: 50 });
  assert.throws(() => createListing(instance, 1, 10, "global", "player-1", "listing-1", 0));
});

test("createListing() rejects a tier 7 item listed globally", () => {
  const instance = makeInstance(resourceWithTier(7), 1, { purity: 50, density: 50, potency: 50, durability: 50, rarity: 50 });
  assert.throws(() => createListing(instance, 1, 10, "global", "player-1", "listing-1", 0));
});

test("createListing() allows a tier 5 item listed globally", () => {
  const instance = makeInstance(resourceWithTier(5), 1, { purity: 50, density: 50, potency: 50, durability: 50, rarity: 50 });
  assert.doesNotThrow(() => createListing(instance, 1, 10, "global", "player-1", "listing-1", 0));
});

test("createListing() allows a tier 6 item listed on a planet market (not global)", () => {
  const instance = makeInstance(resourceWithTier(6), 1, { purity: 50, density: 50, potency: 50, durability: 50, rarity: 50 });
  assert.doesNotThrow(() =>
    createListing(instance, 1, 10, { planetId: "delta-rigelus" }, "player-1", "listing-1", 0),
  );
});

test("createListing() allows a tier 1-5 item on both global and planet markets", () => {
  for (const itemTier of [1, 2, 3, 4, 5]) {
    const instance = makeInstance(resourceWithTier(itemTier), 1, {
      purity: 50, density: 50, potency: 50, durability: 50, rarity: 50,
    });
    assert.doesNotThrow(() => createListing(instance, 1, 10, "global", "player-1", "listing-1", 0));
    assert.doesNotThrow(() =>
      createListing(instance, 1, 10, { planetId: "delta-rigelus" }, "player-1", "listing-1", 0),
    );
  }
});

test("createListing() treats a missing itemTier as unrestricted (pre-Phase-3 content)", () => {
  const instance = makeInstance(resourceWithTier(undefined), 1, {
    purity: 50, density: 50, potency: 50, durability: 50, rarity: 50,
  });
  assert.doesNotThrow(() => createListing(instance, 1, 10, "global", "player-1", "listing-1", 0));
});

test("createListing() computes marketTier via the straight-average-to-tier formula", () => {
  // purity 72, density 45, potency 97, durability null, rarity 1 ->
  // average of the 4 non-null values = 53.75 -> White (41-60), same
  // hand-calculated case used for computeAggregateTier's own tests.
  const instance = makeInstance(resourceWithTier(1), 1, {
    purity: 72, density: 45, potency: 97, durability: null, rarity: 1,
  });
  const listing = createListing(instance, 1, 10, "global", "player-1", "listing-1", 0);
  assert.equal(listing.marketTier, "White");
});

test("createListing() sets expiresAt using LISTING_EXPIRY_HOURS", () => {
  const instance = makeInstance(resourceWithTier(1), 1, { purity: 50, density: 50, potency: 50, durability: 50, rarity: 50 });
  const now = 1_000_000;
  const listing = createListing(instance, 1, 10, "global", "player-1", "listing-1", now);
  assert.equal(listing.expiresAt, now + 72 * 60 * 60 * 1000);
});

test("createListing() records createdByPlayerId (trade attribution)", () => {
  const instance = makeInstance(resourceWithTier(1), 1, { purity: 50, density: 50, potency: 50, durability: 50, rarity: 50 });
  const listing = createListing(instance, 3, 10, "global", "player-42", "listing-1", 0);
  assert.equal(listing.createdByPlayerId, "player-42");
  assert.equal(listing.quantity, 3);
  assert.equal(listing.itemId, "test-item");
});
