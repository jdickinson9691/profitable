import { test } from "node:test";
import assert from "node:assert/strict";
import { getGlobalPrice } from "../../src/trading/globalPrice.ts";
import type { PlanetMarketState } from "../../src/data/types/planetMarketState.ts";

function states(prices: number[]): PlanetMarketState[] {
  return prices.map((currentPrice, i) => ({
    planetId: `planet-${i}`,
    itemId: "igneous-ore",
    currentPrice,
    basePrice: currentPrice,
  }));
}

test("getGlobalPrice('buy') equals the lowest planet price plus the exact markup", () => {
  const price = getGlobalPrice("igneous-ore", "buy", states([80, 100, 120]));
  assert.ok(Math.abs(price - 88) < 1e-9); // 80 * 1.1
});

test("getGlobalPrice('sell') equals the highest planet price minus the exact discount", () => {
  const price = getGlobalPrice("igneous-ore", "sell", states([80, 100, 120]));
  assert.ok(Math.abs(price - 108) < 1e-9); // 120 * 0.9
});

test("getGlobalPrice() only considers PlanetMarketState entries for the requested itemId", () => {
  const mixed: PlanetMarketState[] = [
    { planetId: "p1", itemId: "igneous-ore", currentPrice: 10, basePrice: 10 },
    { planetId: "p2", itemId: "hydrogen-gas", currentPrice: 1000, basePrice: 1000 },
  ];
  const price = getGlobalPrice("igneous-ore", "buy", mixed);
  assert.ok(Math.abs(price - 11) < 1e-9); // 10 * 1.1, hydrogen-gas ignored
});

test("getGlobalPrice() throws when no planet currently trades the item", () => {
  assert.throws(() => getGlobalPrice("nonexistent-item", "buy", states([80, 100])));
});

test("getGlobalPrice() invariant: buy price never beats the best planet sell price, across many randomized states", () => {
  for (let trial = 0; trial < 200; trial++) {
    const count = 1 + Math.floor(Math.random() * 10);
    const prices = Array.from({ length: count }, () => 1 + Math.random() * 1000);
    const buyPrice = getGlobalPrice("igneous-ore", "buy", states(prices));
    assert.ok(buyPrice >= Math.min(...prices));
  }
});

test("getGlobalPrice() invariant: sell price never beats the best planet buy price, across many randomized states", () => {
  for (let trial = 0; trial < 200; trial++) {
    const count = 1 + Math.floor(Math.random() * 10);
    const prices = Array.from({ length: count }, () => 1 + Math.random() * 1000);
    const sellPrice = getGlobalPrice("igneous-ore", "sell", states(prices));
    assert.ok(sellPrice <= Math.max(...prices));
  }
});
