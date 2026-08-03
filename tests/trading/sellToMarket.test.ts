import { test } from "node:test";
import assert from "node:assert/strict";
import { sellToMarket } from "../../src/trading/sellToMarket.ts";
import type { ResourceInstance } from "../../src/data/types/resourceInstance.ts";
import type { PlanetMarketState } from "../../src/data/types/planetMarketState.ts";
import type { Wallet } from "../../src/data/types/wallet.ts";
import type { Resource } from "../../src/data/types/resource.ts";

function resourceInstance(overrides: Partial<ResourceInstance> = {}): ResourceInstance {
  const resource: Resource = {
    id: "igneous-ore",
    name: "Igneous Ore",
    category: "Solid",
    applicableQualities: { purity: true, density: true, potency: true, durability: true, rarity: true },
  };
  return {
    resource,
    quantity: 10,
    qualities: { purity: 50, density: 50, potency: 50, durability: 50, rarity: 50 },
    ...overrides,
  };
}

function marketState(overrides: Partial<PlanetMarketState> = {}): PlanetMarketState {
  return { planetId: "delta-rigelus", itemId: "igneous-ore", currentPrice: 20, basePrice: 20, ...overrides };
}

function wallet(overrides: Partial<Wallet> = {}): Wallet {
  return { playerId: "player-1", credits: 100, ...overrides };
}

test("sellToMarket() matches purchaseListing()'s exact fee math", () => {
  const result = sellToMarket(resourceInstance(), 5, marketState({ currentPrice: 20 }), wallet(), "player-1");
  assert.equal(result.totalValue, 100); // 5 * 20
  assert.equal(result.feeDeducted, 5); // 5% of 100
  assert.equal(result.proceedsToSeller, 95);
  assert.equal(result.feeDeducted + result.proceedsToSeller, result.totalValue);
});

test("sellToMarket() credits the wallet by exactly the proceeds", () => {
  const result = sellToMarket(resourceInstance(), 5, marketState({ currentPrice: 20 }), wallet({ credits: 100 }), "player-1");
  assert.equal(result.updatedWallet.credits, 100 + result.proceedsToSeller);
});

test("sellToMarket() drifts the market state down (sell direction)", () => {
  const result = sellToMarket(resourceInstance(), 1, marketState({ currentPrice: 20, basePrice: 20 }), wallet(), "player-1");
  assert.ok(result.updatedMarketState.currentPrice < 20);
});

test("sellToMarket() throws on a non-positive quantity", () => {
  assert.throws(() => sellToMarket(resourceInstance(), 0, marketState(), wallet(), "player-1"));
  assert.throws(() => sellToMarket(resourceInstance(), -1, marketState(), wallet(), "player-1"));
});

test("sellToMarket() works for a solo player selling to themselves, unlike purchaseListing()", () => {
  // The actual regression case this function exists to fix -- a single
  // playerId throughout, with no counterparty needed at all.
  const result = sellToMarket(resourceInstance(), 3, marketState(), wallet(), "player-1");
  assert.equal(result.quantitySold, 3);
});
