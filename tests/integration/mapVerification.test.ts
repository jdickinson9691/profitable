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
  // not an incomplete check.
  assert.deepEqual(findMatches(/\bscanner\b|\bprobe\b/i), []);
});

test("2.3 -- 'discovered: true' is written in exactly the two documented bootstrap overrides, nowhere else (discovery-by-arrival is NOT wired up -- see Section 6 finding)", () => {
  const writers = findMatches(/discovered:\s*true/);
  assert.deepEqual(writers.sort(), ["presentation/galaxyState.ts"]);
  // Confirms there is no third site (e.g. inside src/ships/resolveArrival.ts
  // or a presentation arrival handler) that transitions a planet to
  // discovered upon a real Voyage's arrival -- the map GDD's premise that
  // "physical visitation" is a live, ongoing mechanism does not hold; only
  // the two planets hardcoded at session bootstrap are ever discovered.
  const resolveArrivalSource = readFileSync(join(SRC_DIR, "ships/resolveArrival.ts"), "utf8");
  assert.doesNotMatch(resolveArrivalSource, /discovered/);
});

test("2.1 -- no 'season' or 'emergency' mechanic is implemented in real code anywhere in src/ (only baseline drift exists as a live map-data layer)", () => {
  // The Phase 3 GDD's own data-shape section (Section 3) specifies
  // `PlanetMarketState.season`, and Section 2.9 names "emergencies" as one
  // of three layers driving the trade map -- neither was ever actually
  // built. There is therefore no advance-warning delay to find (nothing
  // exists to have one), but this is a genuine gap against Phase 3's own
  // Definition of Done, not a clean confirmation that "emergencies work
  // correctly with no warning." See Section 6 finding for the full report.
  // Comments are stripped first -- TradeMapScene.ts's own header comment
  // legitimately narrates the eventual "baseline drift/seasons/emergencies"
  // intent; that's documentation, not an implementation to flag here.
  assert.deepEqual(findMatches(/\bseason\b/i, true), []);
  assert.deepEqual(findMatches(/\bemergenc(y|ies)\b/i, true), []);
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
