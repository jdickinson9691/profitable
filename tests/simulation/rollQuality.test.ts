import { test } from "node:test";
import assert from "node:assert/strict";
import { rollQuality } from "../../src/simulation/rollQuality.ts";
import { QUALITIES } from "../../src/data/types/quality.ts";
import { igneousOre, hydrogenGas, autuniteCrystal } from "../fixtures/resources.ts";

test("rollQuality returns an integer in 1-100 for every applicable quality", () => {
  for (let i = 0; i < 50; i++) {
    const roll = rollQuality(igneousOre);
    for (const quality of QUALITIES) {
      const value = roll[quality];
      assert.equal(typeof value, "number");
      assert.ok(Number.isInteger(value));
      assert.ok((value as number) >= 1 && (value as number) <= 100);
    }
  }
});

test("rollQuality returns null (never 0) for Hydrogen Gas's durability", () => {
  const roll = rollQuality(hydrogenGas);
  assert.equal(roll.durability, null);
  assert.notEqual(roll.durability, 0);
});

test("rollQuality returns null (never 0) for Autunite Crystal's purity", () => {
  const roll = rollQuality(autuniteCrystal);
  assert.equal(roll.purity, null);
  assert.notEqual(roll.purity, 0);
});

test("rollQuality is exact given an injected random function", () => {
  const rollAtFloor = rollQuality(igneousOre, () => 0);
  for (const quality of QUALITIES) {
    assert.equal(rollAtFloor[quality], 1);
  }

  const rollAtCeiling = rollQuality(igneousOre, () => 0.9999999);
  for (const quality of QUALITIES) {
    assert.equal(rollAtCeiling[quality], 100);
  }
});

test("rollQuality produces exactly the 5 quality keys", () => {
  const roll = rollQuality(igneousOre);
  assert.deepEqual(Object.keys(roll).sort(), [...QUALITIES].sort());
});
