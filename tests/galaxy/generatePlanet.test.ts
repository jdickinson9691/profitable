import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rollPlanetTier,
  choosePlanetType,
  getEligibleResources,
  computeSubsetCount,
  selectResourceSubset,
  generatePlanet,
} from "../../src/galaxy/generatePlanet.ts";
import { igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar } from "../fixtures/resources.ts";
import { queueRandom } from "../fixtures/random.ts";

// --- rollPlanetTier: same boundary values as getTierColor's own tests,
// confirming Agent 8 calls the existing lookup rather than reimplementing it.
test("rollPlanetTier() maps roll boundaries through the shared tier table", () => {
  assert.equal(rollPlanetTier(queueRandom([0])), "Grey"); // roll 1
  assert.equal(rollPlanetTier(queueRandom([0.39])), "Grey"); // roll 40
  assert.equal(rollPlanetTier(queueRandom([0.4])), "White"); // roll 41
  assert.equal(rollPlanetTier(queueRandom([0.59])), "White"); // roll 60
  assert.equal(rollPlanetTier(queueRandom([0.6])), "Green"); // roll 61
  assert.equal(rollPlanetTier(queueRandom([0.74])), "Green"); // roll 75
  assert.equal(rollPlanetTier(queueRandom([0.75])), "Blue"); // roll 76
  assert.equal(rollPlanetTier(queueRandom([0.96])), "Gold"); // roll 97
  assert.equal(rollPlanetTier(queueRandom([0.999999])), "Gold"); // roll 100
});

// --- choosePlanetType: uniform among the 4 types, in declared order.
test("choosePlanetType() picks uniformly among the 4 documented types", () => {
  assert.equal(choosePlanetType(queueRandom([0])), "Terrestrial");
  assert.equal(choosePlanetType(queueRandom([0.25])), "SuperEarth");
  assert.equal(choosePlanetType(queueRandom([0.5])), "Neptunian");
  assert.equal(choosePlanetType(queueRandom([0.75])), "GasGiant");
  assert.equal(choosePlanetType(queueRandom([0.999999])), "GasGiant");
});

// --- getEligibleResources: hard filter, not a bias.
test("getEligibleResources() hard-filters by Planet Type", () => {
  const resources = [igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar];

  const terrestrial = getEligibleResources("Terrestrial", resources).map((r) => r.id);
  assert.deepEqual(new Set(terrestrial), new Set(["igneous-ore", "autunite-crystal"]));

  const superEarth = getEligibleResources("SuperEarth", resources).map((r) => r.id);
  assert.deepEqual(new Set(superEarth), new Set(["igneous-ore", "autunite-crystal", "hydrogen-gas"]));

  const neptunian = getEligibleResources("Neptunian", resources).map((r) => r.id);
  assert.deepEqual(new Set(neptunian), new Set(["hydrogen-gas", "autunite-crystal"]));

  const gasGiant = getEligibleResources("GasGiant", resources).map((r) => r.id);
  assert.deepEqual(gasGiant, ["hydrogen-gas"]);
});

test("getEligibleResources() never includes a refined/crafted resource for any Planet Type", () => {
  const resources = [igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar];
  for (const planetType of ["Terrestrial", "SuperEarth", "Neptunian", "GasGiant"] as const) {
    const eligible = getEligibleResources(planetType, resources).map((r) => r.id);
    assert.ok(!eligible.includes("radiant-alloy-bar"));
  }
});

// --- computeSubsetCount: exact per-tier percentage, plus the max(1, ...) floor.
test("computeSubsetCount() applies the exact percentage per tier", () => {
  assert.equal(computeSubsetCount("Grey", 10), 2); // ceil(0.2*10)
  assert.equal(computeSubsetCount("White", 10), 4); // ceil(0.35*10) = ceil(3.5)
  assert.equal(computeSubsetCount("Green", 10), 5);
  assert.equal(computeSubsetCount("Blue", 10), 7); // ceil(0.65*10) = ceil(6.5)
  assert.equal(computeSubsetCount("Purple", 10), 8);
  assert.equal(computeSubsetCount("Orange", 10), 9);
  assert.equal(computeSubsetCount("Gold", 10), 10);
});

test("computeSubsetCount()'s max(1, ...) floor holds with a small eligible pool", () => {
  assert.equal(computeSubsetCount("Grey", 1), 1);
  assert.equal(computeSubsetCount("Grey", 2), 1); // ceil(0.2*2) = ceil(0.4) = 1, already >= floor
});

// --- selectResourceSubset: the reserved-slot rule.
test("selectResourceSubset() gives White-tier-and-above planets exactly one specialty", () => {
  const pool = [igneousOre, hydrogenGas, autuniteCrystal];
  const result = selectResourceSubset(pool, "White", 2, queueRandom([0, 0]));
  assert.ok(result.specialtyResourceId !== null);
  assert.equal(result.producibleResourceIds.length, 2);
  assert.ok(result.producibleResourceIds.includes(result.specialtyResourceId!));
});

test("selectResourceSubset() never gives Grey-tier planets a specialty", () => {
  const pool = [igneousOre, hydrogenGas, autuniteCrystal];
  const result = selectResourceSubset(pool, "Grey", 2, queueRandom([0, 0]));
  assert.equal(result.specialtyResourceId, null);
  assert.equal(result.producibleResourceIds.length, 2);
});

test("selectResourceSubset()'s specialty is never crowded out, even at count 1", () => {
  const pool = [igneousOre, hydrogenGas, autuniteCrystal];
  const result = selectResourceSubset(pool, "Gold", 1, queueRandom([0]));
  assert.equal(result.producibleResourceIds.length, 1);
  assert.equal(result.producibleResourceIds[0], result.specialtyResourceId);
});

test("selectResourceSubset() never duplicates the specialty into the remaining slots", () => {
  const pool = [igneousOre, hydrogenGas, autuniteCrystal];
  // Specialty picked first (index 0 -> igneousOre), then two more slots
  // filled from the remaining 2-item pool.
  const result = selectResourceSubset(pool, "Gold", 3, queueRandom([0, 0, 0]));
  assert.equal(result.producibleResourceIds.length, 3);
  assert.equal(new Set(result.producibleResourceIds).size, 3); // no duplicates
});

// --- generatePlanet: full orchestration.
test("generatePlanet() is deterministic for a fixed seed", () => {
  const resources = [igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar];
  const position = { x: 1, y: 2 };
  const a = generatePlanet("test-seed", position, resources);
  const b = generatePlanet("test-seed", position, resources);
  assert.deepEqual(a, b);
});

test("generatePlanet() sets id/name from the seed and always starts undiscovered", () => {
  const resources = [igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar];
  const planet = generatePlanet("alpha", { x: 0, y: 0 }, resources);
  assert.equal(planet.id, "planet-alpha");
  assert.equal(planet.name, "Planet-alpha");
  assert.equal(planet.discovered, false);
});

test("generatePlanet() throws if the catalog has no eligible resources for the rolled Planet Type", () => {
  assert.throws(() => generatePlanet("no-resources", { x: 0, y: 0 }, []));
});
