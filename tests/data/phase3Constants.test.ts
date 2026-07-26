import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LISTING_EXPIRY_HOURS,
  BASELINE_DRIFT_PERCENT,
  PRICE_FLOOR_PERCENT,
  PRICE_CEILING_PERCENT,
  GLOBAL_MARKET_MARKUP_PERCENT,
  GLOBAL_MARKET_DISCOUNT_PERCENT,
  TRANSACTION_FEE_PERCENT,
  GLOBAL_LISTABLE_MAX_ITEM_TIER,
  MAX_ITEM_TIER,
} from "../../src/data/constants/tradingConfig.ts";

// Hardcoded directly from Phase 3 GDD §2, independent of the actual
// constants -- a typo in the real values gets caught, not silently
// rubber-stamped (same pattern as phase2Constants.test.ts).

test("LISTING_EXPIRY_HOURS matches Phase 3 GDD §2.5 exactly", () => {
  assert.equal(LISTING_EXPIRY_HOURS, 72);
});

test("BASELINE_DRIFT_PERCENT matches Phase 3 GDD §2.6 exactly", () => {
  assert.equal(BASELINE_DRIFT_PERCENT, 0.02);
});

test("PRICE_FLOOR_PERCENT and PRICE_CEILING_PERCENT match Phase 3 GDD §2.6 exactly", () => {
  assert.equal(PRICE_FLOOR_PERCENT, 0.5);
  assert.equal(PRICE_CEILING_PERCENT, 1.5);
});

test("GLOBAL_MARKET_MARKUP_PERCENT and GLOBAL_MARKET_DISCOUNT_PERCENT match Phase 3 GDD §2.7 exactly", () => {
  assert.equal(GLOBAL_MARKET_MARKUP_PERCENT, 0.1);
  assert.equal(GLOBAL_MARKET_DISCOUNT_PERCENT, 0.1);
});

test("TRANSACTION_FEE_PERCENT matches Phase 3 GDD §2.11 exactly", () => {
  assert.equal(TRANSACTION_FEE_PERCENT, 0.05);
});

test("GLOBAL_LISTABLE_MAX_ITEM_TIER and MAX_ITEM_TIER match Phase 3 GDD §2.1 exactly", () => {
  // Tiers 1-5 listable globally, tiers 1-7 buyable globally.
  assert.equal(GLOBAL_LISTABLE_MAX_ITEM_TIER, 5);
  assert.equal(MAX_ITEM_TIER, 7);
});

test("a tier 6 or 7 item is above the global-listable ceiling (sell-restricted to planet markets)", () => {
  assert.ok(6 > GLOBAL_LISTABLE_MAX_ITEM_TIER);
  assert.ok(7 > GLOBAL_LISTABLE_MAX_ITEM_TIER);
  assert.ok(5 <= GLOBAL_LISTABLE_MAX_ITEM_TIER);
});
