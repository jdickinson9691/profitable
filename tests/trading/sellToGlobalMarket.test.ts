import { test } from "node:test";
import assert from "node:assert/strict";
import { sellToGlobalMarket } from "../../src/trading/sellToGlobalMarket.ts";
import type { ResourceInstance } from "../../src/data/types/resourceInstance.ts";
import type { PlanetMarketState } from "../../src/data/types/planetMarketState.ts";
import type { Wallet } from "../../src/data/types/wallet.ts";
import type { Resource } from "../../src/data/types/resource.ts";

function resourceInstance(overrides: Partial<ResourceInstance> = {}, resourceOverrides: Partial<Resource> = {}): ResourceInstance {
  const resource: Resource = {
    id: "igneous-ore",
    name: "Igneous Ore",
    category: "Solid",
    applicableQualities: { purity: true, density: true, potency: true, durability: true, rarity: true },
    ...resourceOverrides,
  };
  return {
    resource,
    quantity: 10,
    qualities: { purity: 50, density: 50, potency: 50, durability: 50, rarity: 50 },
    ...overrides,
  };
}

function marketStates(): PlanetMarketState[] {
  return [
    { planetId: "planet-a", itemId: "igneous-ore", currentPrice: 20, basePrice: 20 },
    { planetId: "planet-b", itemId: "igneous-ore", currentPrice: 30, basePrice: 30 },
  ];
}

function wallet(overrides: Partial<Wallet> = {}): Wallet {
  return { playerId: "player-1", credits: 100, ...overrides };
}

test("sellToGlobalMarket() prices at getGlobalPrice()'s derived sell rate", () => {
  // sell = max(all planet prices) * (1 - GLOBAL_MARKET_DISCOUNT_PERCENT [0.1])
  // = 30 * 0.9 = 27
  const result = sellToGlobalMarket(resourceInstance(), 2, marketStates(), wallet(), "player-1");
  assert.equal(result.totalValue, 54); // 2 * 27
});

test("sellToGlobalMarket() matches purchaseListing()'s exact fee math", () => {
  const result = sellToGlobalMarket(resourceInstance(), 1, marketStates(), wallet(), "player-1");
  assert.equal(result.feeDeducted + result.proceedsToSeller, result.totalValue);
  assert.equal(result.feeDeducted, result.totalValue * 0.05);
});

test("sellToGlobalMarket() credits the wallet by exactly the proceeds", () => {
  const result = sellToGlobalMarket(resourceInstance(), 1, marketStates(), wallet({ credits: 100 }), "player-1");
  assert.equal(result.updatedWallet.credits, 100 + result.proceedsToSeller);
});

test("sellToGlobalMarket() throws for a tier 6-7 item", () => {
  assert.throws(() =>
    sellToGlobalMarket(resourceInstance({}, { itemTier: 6 }), 1, marketStates(), wallet(), "player-1"),
  );
});

test("sellToGlobalMarket() allows a tier 1-5 item and an item with no itemTier set", () => {
  assert.doesNotThrow(() =>
    sellToGlobalMarket(resourceInstance({}, { itemTier: 5 }), 1, marketStates(), wallet(), "player-1"),
  );
  assert.doesNotThrow(() => sellToGlobalMarket(resourceInstance(), 1, marketStates(), wallet(), "player-1"));
});

test("sellToGlobalMarket() throws when no planet trades the item, propagated from getGlobalPrice()", () => {
  assert.throws(() =>
    sellToGlobalMarket(resourceInstance({ resource: { ...resourceInstance().resource, id: "unobtainium" } }), 1, marketStates(), wallet(), "player-1"),
  );
});

test("sellToGlobalMarket() throws on a non-positive quantity", () => {
  assert.throws(() => sellToGlobalMarket(resourceInstance(), 0, marketStates(), wallet(), "player-1"));
});

test("sellToGlobalMarket() never returns an updatedMarketState field", () => {
  const result = sellToGlobalMarket(resourceInstance(), 1, marketStates(), wallet(), "player-1");
  assert.equal("updatedMarketState" in result, false);
});
