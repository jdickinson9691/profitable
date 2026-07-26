import { test } from "node:test";
import assert from "node:assert/strict";
import { rollQualityOnPlanet } from "../../src/galaxy/rollQualityOnPlanet.ts";
import { rollQuality } from "../../src/simulation/rollQuality.ts";
import { igneousOre, hydrogenGas } from "../fixtures/resources.ts";
import { queueRandom } from "../fixtures/random.ts";
import type { Planet } from "../../src/data/types/planet.ts";

function basePlanet(overrides: Partial<Planet> = {}): Planet {
  return {
    id: "test-planet",
    name: "Test Planet",
    producibleResourceIds: [igneousOre.id],
    ...overrides,
  };
}

// random() = 0.49 -> floor(0.49*100)+1 = 50, for every applicable quality
// (queued once per applicable dimension).
const BASE_50 = () => queueRandom([0.49, 0.49, 0.49, 0.49, 0.49]);

test("rollQualityOnPlanet() adds the planet's tier modifier to every applicable dimension", () => {
  const planet = basePlanet({ tier: "Gold" }); // +30
  const roll = rollQualityOnPlanet(igneousOre, planet, BASE_50());
  assert.deepEqual(roll, { purity: 80, density: 80, potency: 80, durability: 80, rarity: 80 });
});

test("rollQualityOnPlanet() treats Green as the neutral point (+0)", () => {
  const planet = basePlanet({ tier: "Green" });
  const roll = rollQualityOnPlanet(igneousOre, planet, BASE_50());
  assert.deepEqual(roll, { purity: 50, density: 50, potency: 50, durability: 50, rarity: 50 });
});

test("rollQualityOnPlanet() stacks the specialty bonus additively on top of the tier modifier", () => {
  const planet = basePlanet({ tier: "Gold", specialtyResourceId: igneousOre.id }); // +30 + 15 = +45
  const roll = rollQualityOnPlanet(igneousOre, planet, BASE_50());
  assert.deepEqual(roll, { purity: 95, density: 95, potency: 95, durability: 95, rarity: 95 });
});

test("rollQualityOnPlanet() does not apply the specialty bonus to a non-specialty resource", () => {
  const planet = basePlanet({ tier: "Gold", specialtyResourceId: "some-other-resource" });
  const roll = rollQualityOnPlanet(igneousOre, planet, BASE_50());
  assert.deepEqual(roll, { purity: 80, density: 80, potency: 80, durability: 80, rarity: 80 });
});

test("rollQualityOnPlanet() clamps at 100 rather than overflowing", () => {
  // random() = 0.89 -> base roll 90, +45 (Gold + specialty) would be 135.
  const highBase = () => queueRandom([0.89, 0.89, 0.89, 0.89, 0.89]);
  const planet = basePlanet({ tier: "Gold", specialtyResourceId: igneousOre.id });
  const roll = rollQualityOnPlanet(igneousOre, planet, highBase());
  assert.deepEqual(roll, {
    purity: 100,
    density: 100,
    potency: 100,
    durability: 100,
    rarity: 100,
  });
});

test("rollQualityOnPlanet() never turns a null/N/A quality into a number", () => {
  const planet = basePlanet({ tier: "Gold", specialtyResourceId: hydrogenGas.id });
  const roll = rollQualityOnPlanet(hydrogenGas, planet, queueRandom([0.49, 0.49, 0.49, 0.49]));
  assert.equal(roll.durability, null); // Hydrogen Gas has no durability
});

test("rollQualityOnPlanet() applies no modifier at all on a pre-Phase-2 planet (no tier field)", () => {
  const legacyPlanet = basePlanet(); // no tier, no specialtyResourceId -- e.g. Delta Rigelus
  const random = BASE_50();
  const viaPlanet = rollQualityOnPlanet(igneousOre, legacyPlanet, random);
  const viaPlain = rollQuality(igneousOre, BASE_50());
  assert.deepEqual(viaPlanet, viaPlain);
});
