import { test } from "node:test";
import assert from "node:assert/strict";
import { createSeededRandom, generateRandomSeed } from "../../src/galaxy/seededRandom.ts";

test("createSeededRandom() produces an identical sequence for the same seed", () => {
  const a = createSeededRandom("galaxy-1");
  const b = createSeededRandom("galaxy-1");

  const sequenceA = Array.from({ length: 10 }, () => a());
  const sequenceB = Array.from({ length: 10 }, () => b());

  assert.deepEqual(sequenceA, sequenceB);
});

test("createSeededRandom() produces different sequences for different seeds", () => {
  const a = createSeededRandom("galaxy-1");
  const b = createSeededRandom("galaxy-2");

  assert.notEqual(a(), b());
});

test("createSeededRandom() always returns values in [0, 1)", () => {
  const random = createSeededRandom("range-check");
  for (let i = 0; i < 200; i++) {
    const value = random();
    assert.ok(value >= 0 && value < 1, `value ${value} out of [0,1)`);
  }
});

test("generateRandomSeed() returns a non-empty string, different each call", () => {
  const a = generateRandomSeed();
  const b = generateRandomSeed();
  assert.ok(a.length > 0);
  assert.ok(b.length > 0);
  assert.notEqual(a, b);
});
