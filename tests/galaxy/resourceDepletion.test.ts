import { test } from "node:test";
import assert from "node:assert/strict";
import { getRemainingQuantity, recordGather } from "../../src/galaxy/resourceDepletion.ts";
import { generateResourcesForCycle } from "../../src/galaxy/planetResourceCycle.ts";
import { igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar } from "../fixtures/resources.ts";
import type { Resource } from "../../src/data/types/resource.ts";

const CATALOG: Resource[] = [igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar];

// --- getRemainingQuantity ---

test("getRemainingQuantity() returns null (unconditionally available) when cap is null", () => {
  assert.equal(getRemainingQuantity(null, undefined, 0), null);
  assert.equal(getRemainingQuantity(null, { cycleIndex: 0, quantityGathered: 999 }, 0), null);
});

test("getRemainingQuantity() returns the full cap when no entry exists yet", () => {
  assert.equal(getRemainingQuantity(20, undefined, 0), 20);
});

test("getRemainingQuantity() subtracts quantityGathered when the entry matches the current cycle", () => {
  assert.equal(getRemainingQuantity(20, { cycleIndex: 3, quantityGathered: 12 }, 3), 8);
});

test("getRemainingQuantity() treats a stale-cycle entry as nothing gathered yet -- the implicit reset", () => {
  assert.equal(getRemainingQuantity(20, { cycleIndex: 3, quantityGathered: 20 }, 4), 20);
});

test("getRemainingQuantity() floors at zero, never negative", () => {
  assert.equal(getRemainingQuantity(20, { cycleIndex: 1, quantityGathered: 25 }, 1), 0);
});

// --- recordGather ---

test("recordGather() starts a fresh entry at the given quantity when none exists", () => {
  const entry = recordGather(undefined, 5, 3);
  assert.deepEqual(entry, { cycleIndex: 5, quantityGathered: 3 });
});

test("recordGather() accumulates onto an existing same-cycle entry", () => {
  const entry = recordGather({ cycleIndex: 5, quantityGathered: 7 }, 5, 2);
  assert.deepEqual(entry, { cycleIndex: 5, quantityGathered: 9 });
});

test("recordGather() resets onto a stale-cycle entry rather than accumulating across cycles", () => {
  const entry = recordGather({ cycleIndex: 5, quantityGathered: 18 }, 6, 1);
  assert.deepEqual(entry, { cycleIndex: 6, quantityGathered: 1 });
});

test("recordGather() defaults quantity to 1", () => {
  const entry = recordGather(undefined, 0);
  assert.equal(entry.quantityGathered, 1);
});

// --- End-to-end: becomes ungatherable at zero, regenerates at the next reset ---

test("a capped resource becomes ungatherable once its cap is fully gathered within one cycle", () => {
  // Grey's real cap (20) via the real per-tier assignment, not a hand-picked
  // number, so this exercises the same table generateResourcesForCycle()
  // itself reads.
  const cycleIndex = 7;
  const cycle = generateResourcesForCycle("depletion-seed", "Grey", "SuperEarth", CATALOG, cycleIndex);
  const [resourceId] = cycle.producibleResourceIds;
  const cap = cycle.resourceQuantityCaps[resourceId!]!;
  assert.equal(cap, 20);

  let entry = undefined as ReturnType<typeof recordGather> | undefined;
  let remaining = getRemainingQuantity(cap, entry, cycleIndex);
  assert.equal(remaining, 20);

  // Gather exactly the cap, one unit at a time -- the real GatherScene call
  // shape (addBatch is always quantity 1 per click).
  for (let gathered = 1; gathered <= cap; gathered++) {
    entry = recordGather(entry, cycleIndex, 1);
    remaining = getRemainingQuantity(cap, entry, cycleIndex);
    assert.equal(remaining, cap - gathered);
  }

  assert.equal(remaining, 0);
});

test("a depleted resource regenerates to the full cap at the next reset cycle", () => {
  const cap = 20;
  const depletedThisCycle = { cycleIndex: 7, quantityGathered: cap };
  assert.equal(getRemainingQuantity(cap, depletedThisCycle, 7), 0);

  // The next cycle index -- same shape as getPlanetResourceCycleIndex()
  // advancing by exactly one after a full PLANET_RESOURCE_RESET_INTERVAL_HOURS
  // elapses -- reads as fully available again, with no explicit reset call
  // anywhere, the same "cycle transition is an implicit reset" property
  // getCurrentPlanetResources() itself relies on.
  assert.equal(getRemainingQuantity(cap, depletedThisCycle, 8), cap);
});
