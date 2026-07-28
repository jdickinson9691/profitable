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

test("2.3 -- 'scanner/probe' is no longer a forbidden concept: Scanner/Probe is now its own locked, actively-building milestone (finding superseded, not violated)", () => {
  // Originally this test asserted the OPPOSITE -- zero matches anywhere --
  // documenting the Galactic Map milestone's own finding that a
  // scanner/probe mechanic was a recorded-but-deferred idea, not yet
  // decided. That has since changed, same kind of flip as the season/
  // emergency check below: profitable-scanner-gdd.md now locks the full
  // design, and the amendment build (Agent 1/20/21/22/28) is underway,
  // starting with the Agent 1 schema amendment's scanner.ts/
  // scannerCandidate.ts/scannerPool.ts/scannerPurchaseCost.ts/
  // scannerTierRadiusBonus.ts. The guardrails this milestone actually
  // cares about now (no fifth ship component, deriveShipTier() unaffected,
  // no passive/automatic discovery, no interaction with staleness or
  // Travel Encounters) are Agent 28's job to confirm once the full
  // amendment lands -- see docs/agents/agent-28-scanner-confirmation.md.
  assert.ok(findMatches(/\bscanner\b/i, true).includes("data/types/scanner.ts"));
});

test("2.3 -- 'discovered: true' is written in exactly the documented sites, nowhere else (discovery-by-travel via a persisted id-list, and now performScan() via the Scanner/Probe amendment)", () => {
  // Comments stripped, same reason as the scanner/probe and season/
  // emergency checks above -- src/ships/resolveEncounters.ts's own
  // comments legitimately *quote* the Travel Encounters GDD's "never sets
  // discovered: true" constraint while explaining why the function
  // upholds it; that's documentation, not a violation to flag here.
  const writers = findMatches(/discovered:\s*true/, true);
  // ships/performScan.ts is a THIRD, newly-sanctioned writer (Scanner/Probe
  // GDD §2.3's own Definition of Done: "sets discovered: true on any
  // undiscovered planets within the scanner's tier-scaled radius") --
  // unlike Travel Encounters' discovery type, which is explicitly forbidden
  // from ever touching this field (see the resolveEncounters.ts assertion
  // below), a manual, docked-only scan action was the one deliberately
  // sanctioned door back into this flag, per profitable-scanner-gdd.md §1's
  // own Definition of Done.
  assert.deepEqual(writers.sort(), ["presentation/galaxyState.ts", "ships/performScan.ts"]);
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
  // Travel Encounters' discovery type must still never write this field,
  // even now that performScan() legitimately does -- the two mechanisms
  // are confirmed independent (Scanner/Probe GDD §2.6).
  const resolveEncountersSource = stripLineComments(readFileSync(join(SRC_DIR, "ships/resolveEncounters.ts"), "utf8"));
  assert.doesNotMatch(resolveEncountersSource, /discovered:\s*true/);
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
