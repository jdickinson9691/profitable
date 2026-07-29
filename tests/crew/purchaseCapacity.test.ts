import { test } from "node:test";
import assert from "node:assert/strict";
import { purchaseCapacity } from "../../src/crew/purchaseCapacity.ts";
import type { CrewCapacity } from "../../src/data/types/crewCapacity.ts";
import type { PurchaseCapacitySucceeded } from "../../src/data/types/purchaseCapacityResult.ts";

test("purchaseCapacity() increments purchasedSlots and deducts the exact base cost for the first slot", () => {
  const capacity: CrewCapacity = { playerId: "player-1", baseCapacity: 2, purchasedSlots: 0 };
  const result = purchaseCapacity(capacity, { playerId: "player-1", credits: 1000 }) as PurchaseCapacitySucceeded;

  assert.equal(result.purchased, true);
  assert.equal(result.updatedCapacity.purchasedSlots, 1);
  assert.equal(result.updatedWallet.credits, 1000 - 500); // CREW_CAPACITY_EXPANSION_BASE_COST
});

test("purchaseCapacity() costs more for each successive slot (the multiplier curve)", () => {
  const capacity: CrewCapacity = { playerId: "player-1", baseCapacity: 2, purchasedSlots: 2 };
  const result = purchaseCapacity(capacity, { playerId: "player-1", credits: 5000 }) as PurchaseCapacitySucceeded;

  assert.equal(result.purchased, true);
  // 500 * 2^2 = 2000
  assert.equal(result.updatedWallet.credits, 5000 - 2000);
});

test("purchaseCapacity() rejects when the wallet can't cover the cost", () => {
  const capacity: CrewCapacity = { playerId: "player-1", baseCapacity: 2, purchasedSlots: 0 };
  const result = purchaseCapacity(capacity, { playerId: "player-1", credits: 10 });
  assert.equal(result.purchased, false);
});

test("purchaseCapacity() does not mutate the input capacity or wallet", () => {
  const capacity: CrewCapacity = { playerId: "player-1", baseCapacity: 2, purchasedSlots: 0 };
  const wallet = { playerId: "player-1", credits: 1000 };
  const capacitySnapshot = { ...capacity };
  const walletSnapshot = { ...wallet };
  purchaseCapacity(capacity, wallet);
  assert.deepEqual(capacity, capacitySnapshot);
  assert.deepEqual(wallet, walletSnapshot);
});
