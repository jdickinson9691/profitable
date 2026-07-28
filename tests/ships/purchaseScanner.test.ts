import { test } from "node:test";
import assert from "node:assert/strict";
import { purchaseScanner } from "../../src/ships/purchaseScanner.ts";
import type { ScannerCandidate } from "../../src/data/types/scannerCandidate.ts";
import type { ScannerPool } from "../../src/data/types/scannerPool.ts";
import type { Wallet } from "../../src/data/types/wallet.ts";
import type { PurchaseScannerSucceeded } from "../../src/data/types/purchaseScannerResult.ts";
import { SCANNER_PURCHASE_COST_BY_TIER } from "../../src/data/constants/shipsAndTravelConfig.ts";

const candidate: ScannerCandidate = { id: "candidate-1", tier: "Blue" };
const blueCost = SCANNER_PURCHASE_COST_BY_TIER.find((e) => e.tier === "Blue")!.cost;

function basePool(overrides: Partial<ScannerPool> = {}): ScannerPool {
  return { planetId: "delta-rigelus", availableScanners: [candidate], lastRefreshedAt: 0, ...overrides };
}

function baseWallet(overrides: Partial<Wallet> = {}): Wallet {
  return { playerId: "player-1", credits: 5000, ...overrides };
}

test("purchaseScanner() succeeds: deducts the exact tier-scaled cost, removes the candidate from the pool", () => {
  const result = purchaseScanner(candidate, basePool(), baseWallet(), "player-1") as PurchaseScannerSucceeded;

  assert.equal(result.purchased, true);
  assert.equal(result.updatedWallet.credits, 5000 - blueCost);
  assert.equal(result.updatedPool.availableScanners.length, 0);
});

test("purchaseScanner() creates a Scanner owned by the buyer", () => {
  const result = purchaseScanner(candidate, basePool(), baseWallet(), "player-1") as PurchaseScannerSucceeded;

  assert.deepEqual(result.scanner, { id: "candidate-1", tier: "Blue", ownerId: "player-1" });
});

test("purchaseScanner() rejects a candidate not present in the pool", () => {
  const stranger: ScannerCandidate = { ...candidate, id: "not-in-pool" };
  const result = purchaseScanner(stranger, basePool(), baseWallet(), "player-1");
  assert.equal(result.purchased, false);
});

test("purchaseScanner() rejects when the wallet can't cover the purchase cost", () => {
  const result = purchaseScanner(candidate, basePool(), baseWallet({ credits: 1 }), "player-1");
  assert.equal(result.purchased, false);
});
