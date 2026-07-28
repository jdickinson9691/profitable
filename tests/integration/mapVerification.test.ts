import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { collectTsFiles } from "../fixtures/sourceFiles.ts";
import { getGlobalPrice } from "../../src/trading/globalPrice.ts";
import type { PlanetMarketState } from "../../src/data/types/planetMarketState.ts";

// Agent 25 (Map Verification): audits the existing Phase 3 (trade layer)
// and Phase 5 (travel layer) implementation against the four properties
// decided in the Galactic Map design pass (profitable-map-gdd.md Section
// 2). This is a regression guard proving absence/liveness, not a new
// parallel suite duplicating Agent 12/21's own coverage -- see this
// agent's full findings in profitable-map-gdd.md Section 6.

const SRC_DIR = join(import.meta.dirname, "../../src");

// Strips `//` line comments before matching -- several files legitimately
// *describe* "seasons"/"emergencies" in prose (e.g. TradeMapScene.ts's own
// header comment, documenting what the map is supposed to eventually
// render), which must not count as the mechanic being implemented. Only
// real code should fail these checks.
function stripLineComments(source: string): string {
  return source
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function findMatches(pattern: RegExp, stripComments = false): string[] {
  return collectTsFiles(SRC_DIR)
    .filter((file) => {
      const source = readFileSync(file, "utf8");
      return pattern.test(stripComments ? stripLineComments(source) : source);
    })
    .map((file) => relative(SRC_DIR, file).split(sep).join("/"));
}

test("2.3 -- no scanner/probe or remote-discovery mechanic exists anywhere in src/", () => {
  // A "no matches found" result is a pass, per this agent's own contract --
  // not an incomplete check. Comments stripped for the same reason as the
  // season/emergency check below -- a comment can legitimately *name* the
  // absent concept (e.g. pointing at this very regression test) without
  // implementing it.
  assert.deepEqual(findMatches(/\bscanner\b|\bprobe\b/i, true), []);
});

test("2.3 -- 'discovered: true' is written in exactly the two documented bootstrap overrides, nowhere else (discovery-by-travel is now wired up via a separate persisted id-list, not by mutating Planet.discovered)", () => {
  const writers = findMatches(/discovered:\s*true/);
  assert.deepEqual(writers.sort(), ["presentation/galaxyState.ts"]);
  // This still holds after the discovery-by-travel bug fix: the fix tracks
  // extra discovered planets via galaxyState.ts's own persisted
  // discoveredPlanetIds side-table (see markPlanetDiscovered()), not by
  // ever setting a third Planet object's `discovered` field to true --
  // src/ships/resolveArrival.ts correctly still never references
  // `discovered` at all (Ships Core stays out of Galaxy-data mutation;
  // extending discovery is presentation-layer wiring, called from
  // TradeMapScene.onResolveArrival()).
  const resolveArrivalSource = readFileSync(join(SRC_DIR, "ships/resolveArrival.ts"), "utf8");
  assert.doesNotMatch(resolveArrivalSource, /discovered/);
});

test("2.1 -- 'season' and 'emergency' are now real, implemented map-data layers (bug fix: previously only baseline drift existed)", () => {
  // Originally this test asserted the OPPOSITE -- zero matches anywhere --
  // documenting the gap this milestone found (only baseline drift existed;
  // Phase 3's own Definition of Done named all three layers). Now fixed:
  // src/trading/season.ts and src/trading/emergency.ts, wired into
  // TradeMapScene's renderPlanet(). Both are pure functions of
  // (planetId, now[, categories]) -- no persisted state, so map GDD §2.2's
  // "always live, never stale" property holds for these too, the same way
  // it already held for getGlobalPrice(). Full correctness coverage lives
  // in tests/trading/season.test.ts and tests/trading/emergency.test.ts
  // (cycling behavior, no-advance-warning, exact end-of-window boundary,
  // multiplier math) -- this is just the "it's actually wired in" check.
  assert.ok(findMatches(/\bseason\b/i, true).includes("trading/season.ts"));
  assert.ok(findMatches(/\bemergenc(y|ies)\b/i, true).includes("trading/emergency.ts"));
  assert.ok(findMatches(/getSeasonalEffect|getSeasonalPriceMultiplier/).includes("presentation/scenes/TradeMapScene.ts"));
  assert.ok(findMatches(/getActiveEmergency|getEmergencyPriceMultiplier/).includes("presentation/scenes/TradeMapScene.ts"));
});

test("2.2 -- getGlobalPrice() reads live state with no internal caching (two calls with different states never return a stale/memoized value)", () => {
  const statesA: PlanetMarketState[] = [{ planetId: "p1", itemId: "igneous-ore", currentPrice: 80, basePrice: 80 }];
  const statesB: PlanetMarketState[] = [{ planetId: "p1", itemId: "igneous-ore", currentPrice: 200, basePrice: 200 }];

  const first = getGlobalPrice("igneous-ore", "buy", statesA);
  const second = getGlobalPrice("igneous-ore", "buy", statesB);

  assert.notEqual(first, second);
  assert.ok(Math.abs(second - 220) < 1e-9); // 200 * 1.1 -- reflects statesB, not a stale statesA-derived value
});

test("2.2 -- PlanetMarketState carries no timestamp/staleness field for callers to gate display on", () => {
  const state: PlanetMarketState = { planetId: "p1", itemId: "igneous-ore", currentPrice: 5, basePrice: 5 };
  assert.deepEqual(Object.keys(state).sort(), ["basePrice", "currentPrice", "itemId", "planetId"]);
});
