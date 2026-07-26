import { test } from "node:test";
import assert from "node:assert/strict";
import { generateGalaxy } from "../../src/galaxy/generateGalaxy.ts";
import { igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar } from "../fixtures/resources.ts";

const RESOURCES = [igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar];

test("generateGalaxy() produces exactly planetCount planets", () => {
  const galaxy = generateGalaxy(5, RESOURCES, "count-check");
  assert.equal(galaxy.planets.length, 5);
});

test("generateGalaxy() is a fixed, finite generation -- the same seed reproduces the identical galaxy", () => {
  const a = generateGalaxy(6, RESOURCES, "reproduce-me");
  const b = generateGalaxy(6, RESOURCES, "reproduce-me");
  assert.deepEqual(a, b);
});

test("generateGalaxy() gives every planet a distinct id", () => {
  const galaxy = generateGalaxy(8, RESOURCES, "unique-ids");
  const ids = galaxy.planets.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("generateGalaxy() generates and returns a seed when none is supplied, and that seed reproduces the galaxy", () => {
  const first = generateGalaxy(4, RESOURCES);
  assert.ok(first.seed.length > 0);

  const reproduced = generateGalaxy(4, RESOURCES, first.seed);
  assert.deepEqual(reproduced, first);
});

test("generateGalaxy() with no seed produces a different galaxy on a separate call", () => {
  const a = generateGalaxy(4, RESOURCES);
  const b = generateGalaxy(4, RESOURCES);
  assert.notEqual(a.seed, b.seed);
});
