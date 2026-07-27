import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTradingContent } from "../../src/trading/loadTradingContent.ts";
import type { RawTradingContentConfig } from "../../src/trading/loadTradingContent.ts";

const validConfig: RawTradingContentConfig = {
  tradingBasePrices: [
    { itemId: "igneous-ore", basePrice: 5 },
    { itemId: "radiant-alloy-bar", basePrice: 35 },
  ],
  planetMarketPreferences: [
    { planetType: "Terrestrial", sellsCheap: ["igneous-ore"], buysAtPremium: ["hydrogen-gas"] },
  ],
};

test("loadTradingContent() parses a fully valid config into typed objects", () => {
  const loaded = loadTradingContent(validConfig);
  assert.equal(loaded.tradingBasePrices.length, 2);
  assert.equal(loaded.tradingBasePrices[0]?.itemId, "igneous-ore");
  assert.equal(loaded.planetMarketPreferences[0]?.planetType, "Terrestrial");
});

test("loadTradingContent() accepts a config with every section empty", () => {
  const loaded = loadTradingContent({ tradingBasePrices: [], planetMarketPreferences: [] });
  assert.deepEqual(loaded, { tradingBasePrices: [], planetMarketPreferences: [] });
});

test("loadTradingContent() throws a clear error naming the section and index of an invalid item", () => {
  const invalid: RawTradingContentConfig = {
    ...validConfig,
    tradingBasePrices: [{ itemId: "x", basePrice: -5 }], // negative basePrice
  };
  assert.throws(() => loadTradingContent(invalid), /tradingBasePrices\[0\]/);
});

test("loadTradingContent() reports every invalid item across sections, not just the first", () => {
  const invalid: RawTradingContentConfig = {
    tradingBasePrices: [{ itemId: "x" }], // missing basePrice
    planetMarketPreferences: [{ planetType: "Moon", sellsCheap: [], buysAtPremium: [] }], // invalid enum
  };

  try {
    loadTradingContent(invalid);
    assert.fail("expected loadTradingContent to throw");
  } catch (error) {
    const message = (error as Error).message;
    assert.match(message, /tradingBasePrices\[0\]/);
    assert.match(message, /planetMarketPreferences\[0\]/);
  }
});

test("loadTradingContent() rejects a rawConfig missing one of the required arrays", () => {
  const { planetMarketPreferences: _pmp, ...missing } = validConfig;
  assert.throws(() => loadTradingContent(missing));
});

test("loadTradingContent() rejects a non-object rawConfig", () => {
  assert.throws(() => loadTradingContent("not an object"));
  assert.throws(() => loadTradingContent(null));
});
