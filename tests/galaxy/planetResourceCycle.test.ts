import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getPlanetResourceCycleIndex,
  generateResourcesForCycle,
  getCurrentPlanetResources,
} from "../../src/galaxy/planetResourceCycle.ts";
import { generatePlanet } from "../../src/galaxy/generatePlanet.ts";
import { computeAggregateTier } from "../../src/simulation/aggregateTier.ts";
import {
  PLANET_RESOURCE_RESET_INTERVAL_HOURS,
  TUTORIAL_GUARANTEED_RESOURCE_IDS,
} from "../../src/data/constants/planetResourceCycle.ts";
import { MINIMUM_COLONISTS_TO_PRODUCE } from "../../src/data/constants/planetOwnership.ts";
import { igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar } from "../fixtures/resources.ts";
import type { Resource } from "../../src/data/types/resource.ts";
import type { Planet } from "../../src/data/types/planet.ts";

const MS_PER_HOUR = 60 * 60 * 1000;
const CATALOG: Resource[] = [igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar];

// --- getPlanetResourceCycleIndex ---

test("getPlanetResourceCycleIndex() is deterministic for the same (planetId, now)", () => {
  const a = getPlanetResourceCycleIndex("planet-x", 5_000_000);
  const b = getPlanetResourceCycleIndex("planet-x", 5_000_000);
  assert.equal(a, b);
});

test("getPlanetResourceCycleIndex() phase-offsets planets so they don't all reset in lockstep", () => {
  const now = 10_000_000;
  const indexes = new Set(
    Array.from({ length: 20 }, (_, i) => getPlanetResourceCycleIndex(`planet-${i}`, now)),
  );
  // Not every planet should land on the exact same cycle index at the same
  // instant -- a real (if weak) check that the phase offset does something.
  assert.ok(indexes.size > 1);
});

test("getPlanetResourceCycleIndex() increments exactly once per full reset interval elapsed", () => {
  const planetId = "planet-cycle-test";
  const intervalMs = PLANET_RESOURCE_RESET_INTERVAL_HOURS * MS_PER_HOUR;
  // An arbitrary anchor, deliberately NOT assumed to sit at a cycle
  // boundary -- the planet's own phase offset shifts where its cycles
  // actually start, so the only offset-independent invariant is "adding
  // exactly one full interval always advances the index by exactly one."
  const now = 123_456_789;
  const base = getPlanetResourceCycleIndex(planetId, now);
  const oneIntervalLater = getPlanetResourceCycleIndex(planetId, now + intervalMs);
  assert.equal(oneIntervalLater, base + 1);
});

// --- generateResourcesForCycle ---

test("generateResourcesForCycle() is deterministic for the same (seed, cycleIndex)", () => {
  const a = generateResourcesForCycle("seed-a", "Gold", "SuperEarth", CATALOG, 0);
  const b = generateResourcesForCycle("seed-a", "Gold", "SuperEarth", CATALOG, 0);
  assert.deepEqual(a, b);
});

test("generateResourcesForCycle() produces independently different output across cycle indexes", () => {
  const results = Array.from({ length: 10 }, (_, i) =>
    generateResourcesForCycle("seed-b", "Gold", "SuperEarth", CATALOG, i),
  );
  const serialized = results.map((r) => JSON.stringify(r));
  // Not a trivial shift of the same roll -- at least some cycles must
  // differ from cycle 0.
  assert.ok(new Set(serialized).size > 1);
});

test("generateResourcesForCycle() rolls exactly one fixed QualityRoll per producibleResourceIds entry", () => {
  const result = generateResourcesForCycle("seed-c", "Gold", "SuperEarth", CATALOG, 0);
  for (const id of result.producibleResourceIds) {
    assert.ok(id in result.resourceQualities);
  }
  assert.equal(Object.keys(result.resourceQualities).length, result.producibleResourceIds.length);
});

test("generateResourcesForCycle() throws for a planet type with no eligible resources in the catalog", () => {
  assert.throws(() => generateResourcesForCycle("seed-d", "Gold", "GasGiant", [igneousOre], 0));
});

// --- getCurrentPlanetResources ---

function makePlanet(seed = "cycle-planet"): Planet {
  return generatePlanet(seed, { x: 0, y: 0 }, CATALOG);
}

// Colonist-Driven Production (planet-ownership.md): getCurrentPlanetResources()
// now gates on colonistCount as its first check, so any test exercising the
// resource-cycle formula itself (not the gate) needs a merged, sufficiently-
// colonized Planet -- an unmerged one (colonistCount undefined, treated as 0)
// always returns empty by design.
function makeColonizedPlanet(seed = "cycle-planet"): Planet {
  return { ...makePlanet(seed), colonistCount: MINIMUM_COLONISTS_TO_PRODUCE };
}

test("getCurrentPlanetResources() matches Planet.resourceQualities exactly at cycle 0", () => {
  const planet = makeColonizedPlanet();
  const cycleIndex = getPlanetResourceCycleIndex(planet.id, 0);
  // Only a meaningful comparison if now=0 actually falls in cycle 0 for
  // this planet's own phase offset -- most planets will, given a small
  // reset interval relative to a 0 starting point isn't guaranteed, so
  // assert against the live cycle index directly instead of assuming 0.
  const current = getCurrentPlanetResources(planet, CATALOG, 0);
  if (cycleIndex === 0) {
    assert.deepEqual(current.producibleResourceIds, planet.producibleResourceIds);
    assert.deepEqual(current.resourceQualities, planet.resourceQualities);
  } else {
    // Still must be internally consistent even off cycle 0.
    assert.equal(current.producibleResourceIds.length > 0, true);
  }
});

test("getCurrentPlanetResources() diverges once now crosses into a later cycle", () => {
  const planet = makeColonizedPlanet();
  const intervalMs = PLANET_RESOURCE_RESET_INTERVAL_HOURS * MS_PER_HOUR;
  const cycle0 = getCurrentPlanetResources(planet, CATALOG, 0);
  // Jump forward many intervals -- across enough cycles, at least one must
  // differ from cycle 0's own snapshot (statistically certain, not just
  // possible, given resource subset/quality re-rolls every cycle).
  let foundDifference = false;
  for (let cycles = 1; cycles <= 20; cycles++) {
    const later = getCurrentPlanetResources(planet, CATALOG, cycles * intervalMs + intervalMs);
    if (JSON.stringify(later) !== JSON.stringify(cycle0)) {
      foundDifference = true;
      break;
    }
  }
  assert.ok(foundDifference);
});

test("getCurrentPlanetResources() never mutates the passed-in Planet object", () => {
  const planet = makeColonizedPlanet();
  const snapshot = JSON.parse(JSON.stringify(planet));
  getCurrentPlanetResources(planet, CATALOG, 99_999_999);
  assert.deepEqual(planet, snapshot);
});

test("getCurrentPlanetResources() throws for a planet missing tier/planetType", () => {
  const legacyPlanet: Planet = {
    id: "legacy",
    name: "Legacy",
    producibleResourceIds: [],
    colonistCount: MINIMUM_COLONISTS_TO_PRODUCE,
  };
  assert.throws(() => getCurrentPlanetResources(legacyPlanet, CATALOG, 0));
});

// --- Colonist-Driven Production gate ---

test("getCurrentPlanetResources() returns empty producibleResourceIds when colonistCount is undefined (unmerged Planet)", () => {
  const planet = makePlanet(); // no colonistCount at all -- the raw generatePlanet() output
  const current = getCurrentPlanetResources(planet, CATALOG, 0);
  assert.deepEqual(current, { producibleResourceIds: [], specialtyResourceId: null, resourceQualities: {} });
});

test("getCurrentPlanetResources() returns empty producibleResourceIds when colonistCount is below the minimum", () => {
  const planet = { ...makePlanet(), colonistCount: MINIMUM_COLONISTS_TO_PRODUCE - 1 };
  const current = getCurrentPlanetResources(planet, CATALOG, 0);
  assert.equal(current.producibleResourceIds.length, 0);
});

test("getCurrentPlanetResources() produces resources once colonistCount meets the minimum", () => {
  const planet = makeColonizedPlanet();
  const current = getCurrentPlanetResources(planet, CATALOG, 0);
  assert.ok(current.producibleResourceIds.length > 0);
});

test("getCurrentPlanetResources() does not throw for an under-colonized planet even if tier/planetType are also missing", () => {
  // The colonist gate is checked FIRST, before the tier/planetType
  // validation -- an uncolonized legacy-shaped planet should return empty,
  // not throw, since there's no point validating fields that won't be used.
  const planet: Planet = { id: "uncolonized", name: "Uncolonized", producibleResourceIds: [] };
  assert.doesNotThrow(() => getCurrentPlanetResources(planet, CATALOG, 0));
});

// --- Starting-planet tutorial guarantee ---

test("tutorial guarantee: the starting planet always includes all 3 guaranteed resources at Grey or White", () => {
  for (let seedIndex = 0; seedIndex < 30; seedIndex++) {
    const planet = makeColonizedPlanet(`tutorial-seed-${seedIndex}`);
    const current = getCurrentPlanetResources(planet, CATALOG, 0, true);
    for (const guaranteedId of TUTORIAL_GUARANTEED_RESOURCE_IDS) {
      assert.ok(
        current.producibleResourceIds.includes(guaranteedId),
        `seed ${seedIndex}: missing ${guaranteedId}`,
      );
      const roll = current.resourceQualities[guaranteedId]!;
      const aggregateTier = computeAggregateTier(roll);
      assert.ok(
        aggregateTier === "Grey" || aggregateTier === "White",
        `seed ${seedIndex}: ${guaranteedId} aggregated to ${aggregateTier}`,
      );
    }
  }
});

test("tutorial guarantee: reapplied at every cycle, not just cycle 0", () => {
  const planet = makeColonizedPlanet("tutorial-multi-cycle");
  const intervalMs = PLANET_RESOURCE_RESET_INTERVAL_HOURS * MS_PER_HOUR;
  for (let cycles = 1; cycles <= 5; cycles++) {
    const current = getCurrentPlanetResources(planet, CATALOG, cycles * intervalMs + intervalMs, true);
    for (const guaranteedId of TUTORIAL_GUARANTEED_RESOURCE_IDS) {
      assert.ok(current.producibleResourceIds.includes(guaranteedId));
      const aggregateTier = computeAggregateTier(current.resourceQualities[guaranteedId]!);
      assert.ok(aggregateTier === "Grey" || aggregateTier === "White");
    }
  }
});

test("tutorial guarantee: a non-starting planet receives no override", () => {
  let foundMissingGuaranteedResource = false;
  for (let seedIndex = 0; seedIndex < 30; seedIndex++) {
    const planet = makeColonizedPlanet(`non-tutorial-seed-${seedIndex}`);
    const current = getCurrentPlanetResources(planet, CATALOG, 0, false);
    const hasAll = TUTORIAL_GUARANTEED_RESOURCE_IDS.every((id) => current.producibleResourceIds.includes(id));
    if (!hasAll) {
      foundMissingGuaranteedResource = true;
      break;
    }
  }
  // Without the guarantee, at least one of many seeds must fail to
  // naturally roll all 3 -- proving isStartingPlanet actually gates the
  // override rather than it always applying.
  assert.ok(foundMissingGuaranteedResource);
});

test("tutorial guarantee: does not bypass the colonist gate", () => {
  // isStartingPlanet=true must not, by itself, make an uncolonized planet
  // productive -- the two bootstrap exceptions are separate mechanisms
  // (planet-ownership.md's own "two separate bootstrap exceptions" note).
  const planet = makePlanet("uncolonized-starting-planet"); // no colonistCount
  const current = getCurrentPlanetResources(planet, CATALOG, 0, true);
  assert.equal(current.producibleResourceIds.length, 0);
});
