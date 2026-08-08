import { test } from "node:test";
import assert from "node:assert/strict";
import { mergePlanetOwnership } from "../../src/planets/mergePlanetOwnership.ts";
import type { Planet } from "../../src/data/types/planet.ts";

function planet(overrides: Partial<Planet> = {}): Planet {
  return { id: "planet-a", name: "Planet A", producibleResourceIds: [], ...overrides };
}

test("mergePlanetOwnership() applies the default entry when no entry exists", () => {
  const merged = mergePlanetOwnership(planet(), undefined);
  assert.equal(merged.colonistCount, 0);
});

test("mergePlanetOwnership() applies a real entry's values", () => {
  const merged = mergePlanetOwnership(planet(), { colonistCount: 12 });
  assert.equal(merged.colonistCount, 12);
});

test("mergePlanetOwnership() never mutates the passed-in Planet", () => {
  const base = planet();
  const snapshot = JSON.parse(JSON.stringify(base));
  mergePlanetOwnership(base, { colonistCount: 5 });
  assert.deepEqual(base, snapshot);
});

test("mergePlanetOwnership() preserves every other field on the Planet unchanged", () => {
  const base = planet({ tier: "Gold", specialtyResourceId: "igneous-ore", discovered: true });
  const merged = mergePlanetOwnership(base, undefined);
  assert.equal(merged.tier, "Gold");
  assert.equal(merged.specialtyResourceId, "igneous-ore");
  assert.equal(merged.discovered, true);
});
