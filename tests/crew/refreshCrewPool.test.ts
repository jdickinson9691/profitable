import { test } from "node:test";
import assert from "node:assert/strict";
import { refreshCrewPool } from "../../src/crew/refreshCrewPool.ts";
import { CREW_POOL_SIZE_PER_PLANET } from "../../src/data/constants/crewConfig.ts";

test("refreshCrewPool() produces exactly CREW_POOL_SIZE_PER_PLANET candidates", () => {
  const pool = refreshCrewPool("delta-rigelus", "seed-1", 0);
  assert.equal(pool.availableHires.length, CREW_POOL_SIZE_PER_PLANET);
});

test("refreshCrewPool() is deterministic given the same seed", () => {
  const a = refreshCrewPool("delta-rigelus", "seed-1", 0);
  const b = refreshCrewPool("delta-rigelus", "seed-1", 0);
  assert.deepEqual(a, b);
});

test("refreshCrewPool() with no seed produces a different pool on a separate call", () => {
  const a = refreshCrewPool("delta-rigelus");
  const b = refreshCrewPool("delta-rigelus");
  assert.notDeepEqual(a.availableHires, b.availableHires);
});

test("refreshCrewPool() sets lastRefreshedAt to the given time", () => {
  const pool = refreshCrewPool("delta-rigelus", "seed-1", 12345);
  assert.equal(pool.lastRefreshedAt, 12345);
});

test("refreshCrewPool() gives every candidate a unique id", () => {
  const pool = refreshCrewPool("delta-rigelus", "seed-1", 0);
  const ids = pool.availableHires.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("refreshCrewPool() tier 6-7 candidates always have a non-null profession, tiers 3-5 always null, across many pools", () => {
  let sawSpecialized = false;
  let sawGeneral = false;

  for (let i = 0; i < 50; i++) {
    const pool = refreshCrewPool("delta-rigelus", `seed-${i}`, 0);
    for (const candidate of pool.availableHires) {
      if (candidate.tier === "Orange" || candidate.tier === "Gold") {
        assert.ok(candidate.profession !== null, `${candidate.tier} candidate must have a profession`);
        sawSpecialized = true;
      } else if (candidate.tier === "Green" || candidate.tier === "Blue" || candidate.tier === "Purple") {
        assert.equal(candidate.profession, null, `${candidate.tier} candidate must not have a profession`);
        sawGeneral = true;
      }
    }
  }

  assert.ok(sawSpecialized, "expected at least one tier 6-7 candidate across 50 pools");
  assert.ok(sawGeneral, "expected at least one tier 3-5 candidate across 50 pools");
});
