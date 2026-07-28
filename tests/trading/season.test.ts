import { test } from "node:test";
import assert from "node:assert/strict";
import { getCurrentSeason, getSeasonalEffect, getSeasonalPriceMultiplier, SEASONS } from "../../src/trading/season.ts";
import { SEASON_CYCLE_HOURS, SEASON_PRICE_SWING_PERCENT } from "../../src/data/constants/tradingConfig.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

// Bug fix (Galactic Map Agent 25/26 verification): seasons were never
// implemented before this -- only baseline drift existed as a live
// trade-map data layer. These tests cover the same "deterministic given
// fixed inputs" discipline as every other pure function in this codebase.

test("getCurrentSeason() cycles through all 4 seasons in order as time advances by SEASON_CYCLE_HOURS", () => {
  const cycleMs = SEASON_CYCLE_HOURS * MS_PER_HOUR;
  const first = getCurrentSeason("planet-cycle-test", 0);
  const firstIndex = SEASONS.indexOf(first);

  for (let step = 1; step <= 8; step++) {
    const season = getCurrentSeason("planet-cycle-test", step * cycleMs);
    assert.equal(season, SEASONS[(firstIndex + step) % SEASONS.length]);
  }
});

test("getCurrentSeason() is deterministic -- same planetId and now always produce the same season", () => {
  const a = getCurrentSeason("planet-deterministic", 123456789);
  const b = getCurrentSeason("planet-deterministic", 123456789);
  assert.equal(a, b);
});

test("getCurrentSeason() phase-offsets planets so they aren't all synced -- at least 2 distinct seasons across many planets at the same instant", () => {
  const seasons = new Set(
    Array.from({ length: 20 }, (_, i) => getCurrentSeason(`planet-offset-${i}`, 0)),
  );
  assert.ok(seasons.size > 1, `expected more than one distinct season, got ${[...seasons]}`);
});

test("getSeasonalEffect() returns null when the planet has no live-traded categories", () => {
  assert.equal(getSeasonalEffect("planet-1", 0, []), null);
});

test("getSeasonalEffect() picks a cheap and premium category from the given categories, both members of that list", () => {
  const categories = ["solid", "gas", "refined-metal", "radioactive crystal"];
  const effect = getSeasonalEffect("planet-1", 0, categories);
  assert.ok(effect);
  assert.ok(categories.includes(effect.cheapCategory));
  assert.ok(categories.includes(effect.premiumCategory));
  assert.ok(SEASONS.includes(effect.season));
});

test("getSeasonalEffect() picks distinct cheap/premium categories when at least 2 are available", () => {
  const categories = ["solid", "gas"];
  const effect = getSeasonalEffect("planet-1", 0, categories);
  assert.ok(effect);
  assert.notEqual(effect.cheapCategory, effect.premiumCategory);
});

test("getSeasonalEffect() with exactly one category falls back to that same category for both roles", () => {
  const effect = getSeasonalEffect("planet-1", 0, ["solid"]);
  assert.ok(effect);
  assert.equal(effect.cheapCategory, "solid");
  assert.equal(effect.premiumCategory, "solid");
});

test("getSeasonalPriceMultiplier() applies the exact documented swing to the cheap/premium categories, and 1 elsewhere", () => {
  const effect = { season: "Summer" as const, cheapCategory: "solid", premiumCategory: "gas" };
  assert.equal(getSeasonalPriceMultiplier("solid", effect), 1 - SEASON_PRICE_SWING_PERCENT);
  assert.equal(getSeasonalPriceMultiplier("gas", effect), 1 + SEASON_PRICE_SWING_PERCENT);
  assert.equal(getSeasonalPriceMultiplier("refined-metal", effect), 1);
});

test("getSeasonalPriceMultiplier() returns 1 (no effect) when there is no seasonal effect at all", () => {
  assert.equal(getSeasonalPriceMultiplier("solid", null), 1);
});
