import { test } from "node:test";
import assert from "node:assert/strict";
import { refreshScannerPool } from "../../src/ships/refreshScannerPool.ts";
import { SCANNER_POOL_SIZE_PER_PLANET } from "../../src/data/constants/shipsAndTravelConfig.ts";
import { TIER_COLOR_BREAKPOINTS } from "../../src/data/constants/tierColor.ts";

test("refreshScannerPool() produces exactly SCANNER_POOL_SIZE_PER_PLANET candidates", () => {
  const pool = refreshScannerPool("delta-rigelus", "seed-1", 0);
  assert.equal(pool.availableScanners.length, SCANNER_POOL_SIZE_PER_PLANET);
});

test("refreshScannerPool() is deterministic given the same seed", () => {
  const a = refreshScannerPool("delta-rigelus", "seed-1", 0);
  const b = refreshScannerPool("delta-rigelus", "seed-1", 0);
  assert.deepEqual(a, b);
});

test("refreshScannerPool() with no seed produces a different pool on a separate call", () => {
  const a = refreshScannerPool("delta-rigelus");
  const b = refreshScannerPool("delta-rigelus");
  assert.notDeepEqual(a.availableScanners, b.availableScanners);
});

test("refreshScannerPool() sets lastRefreshedAt to the given time", () => {
  const pool = refreshScannerPool("delta-rigelus", "seed-1", 12345);
  assert.equal(pool.lastRefreshedAt, 12345);
});

test("refreshScannerPool() gives every candidate a unique id", () => {
  const pool = refreshScannerPool("delta-rigelus", "seed-1", 0);
  const ids = pool.availableScanners.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("refreshScannerPool() only ever rolls one of the 7 documented tiers, across many pools", () => {
  const validTiers = new Set(TIER_COLOR_BREAKPOINTS.map((b) => b.tier));
  for (let i = 0; i < 20; i++) {
    const pool = refreshScannerPool("delta-rigelus", `seed-${i}`, 0);
    for (const candidate of pool.availableScanners) {
      assert.ok(validTiers.has(candidate.tier));
    }
  }
});
