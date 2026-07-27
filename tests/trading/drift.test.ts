import { test } from "node:test";
import assert from "node:assert/strict";
import { applyDrift, applyRecovery } from "../../src/trading/drift.ts";
import type { PlanetMarketState } from "../../src/data/types/planetMarketState.ts";

function state(overrides: Partial<PlanetMarketState> = {}): PlanetMarketState {
  return { planetId: "delta-rigelus", itemId: "igneous-ore", currentPrice: 100, basePrice: 100, ...overrides };
}

test("applyDrift() drops the price by exactly BASELINE_DRIFT_PERCENT for a single sell", () => {
  const result = applyDrift(state(), 1, "sell");
  assert.equal(result.currentPrice, 98); // 100 * 0.98
});

test("applyDrift() raises the price by exactly BASELINE_DRIFT_PERCENT for a single buy", () => {
  const result = applyDrift(state(), 1, "buy");
  assert.equal(result.currentPrice, 102); // 100 * 1.02
});

test("applyDrift() diminishes on successive units rather than moving linearly", () => {
  const result = applyDrift(state(), 2, "sell");
  // 100 * 0.98 * 0.98 = 96.04, not the flat-linear 96.
  assert.ok(Math.abs(result.currentPrice - 96.04) < 1e-9);
  assert.notEqual(result.currentPrice, 96);
});

test("applyDrift() never exits the floor/ceiling bounds under many consecutive units", () => {
  const sold = applyDrift(state(), 1000, "sell");
  assert.equal(sold.currentPrice, 50); // basePrice * PRICE_FLOOR_PERCENT
  const bought = applyDrift(state(), 1000, "buy");
  assert.equal(bought.currentPrice, 150); // basePrice * PRICE_CEILING_PERCENT
});

test("applyDrift() does not mutate the input marketState", () => {
  const input = state();
  const snapshot = { ...input };
  applyDrift(input, 3, "sell");
  assert.deepEqual(input, snapshot);
});

test("applyRecovery() moves currentPrice toward basePrice at the documented rate", () => {
  const result = applyRecovery(state({ currentPrice: 50, basePrice: 100 }), 1);
  // gap = 50; remainingGap = 50 * 0.99 = 49.5; price = 100 - 49.5 = 50.5
  assert.ok(Math.abs(result.currentPrice - 50.5) < 1e-9);
});

test("applyRecovery() with zero elapsed time leaves currentPrice unchanged", () => {
  const result = applyRecovery(state({ currentPrice: 50, basePrice: 100 }), 0);
  assert.equal(result.currentPrice, 50);
});

test("applyRecovery() pulls an above-base price back down too", () => {
  const result = applyRecovery(state({ currentPrice: 120, basePrice: 100 }), 1);
  // gap = -20; remainingGap = -20 * 0.99 = -19.8; price = 100 - (-19.8) = 119.8
  assert.ok(Math.abs(result.currentPrice - 119.8) < 1e-9);
  assert.ok(result.currentPrice < 120);
});

test("applyRecovery() approaches but never overshoots basePrice as elapsed time grows", () => {
  const result = applyRecovery(state({ currentPrice: 50, basePrice: 100 }), 1000);
  assert.ok(result.currentPrice < 100);
  assert.ok(result.currentPrice > 99);
});
