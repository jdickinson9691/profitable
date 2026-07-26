import { test } from "node:test";
import assert from "node:assert/strict";
import { rollQualityOnPlanet } from "../../src/galaxy/rollQualityOnPlanet.ts";
import { generateGalaxy } from "../../src/galaxy/generateGalaxy.ts";
import { igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar } from "../fixtures/resources.ts";
import { queueRandom } from "../fixtures/random.ts";
import type { Planet } from "../../src/data/types/planet.ts";
import type { TierColor } from "../../src/data/types/tierColor.ts";

// Agent 9 (Phase 2 Validation/Test): the two checks explicitly called out
// in its contract that weren't already covered by Agent 8's own bundled
// tests (tests/galaxy/generatePlanet.test.ts and rollQualityOnPlanet.test.ts
// covered every other requirement -- reserved-slot rule, subset counts,
// determinism, the regression check, etc.).

function basePlanet(overrides: Partial<Planet> = {}): Planet {
  return {
    id: "test-planet",
    name: "Test Planet",
    producibleResourceIds: [igneousOre.id],
    ...overrides,
  };
}

const BASE_50 = () => queueRandom([0.49, 0.49, 0.49, 0.49, 0.49]);

const EXPECTED_MODIFIERS: Array<{ tier: TierColor; modifier: number; expectedValue: number }> = [
  { tier: "Grey", modifier: -15, expectedValue: 35 },
  { tier: "White", modifier: -8, expectedValue: 42 },
  { tier: "Green", modifier: 0, expectedValue: 50 },
  { tier: "Blue", modifier: 8, expectedValue: 58 },
  { tier: "Purple", modifier: 15, expectedValue: 65 },
  { tier: "Orange", modifier: 22, expectedValue: 72 },
  { tier: "Gold", modifier: 30, expectedValue: 80 },
];

for (const { tier, expectedValue } of EXPECTED_MODIFIERS) {
  test(`rollQualityOnPlanet() applies ${tier}'s exact tier modifier`, () => {
    const planet = basePlanet({ tier });
    const roll = rollQualityOnPlanet(igneousOre, planet, BASE_50());
    assert.deepEqual(roll, {
      purity: expectedValue,
      density: expectedValue,
      potency: expectedValue,
      durability: expectedValue,
      rarity: expectedValue,
    });
  });
}

test("Planet Type is a hard filter across many generated planets, not just one hand-picked example", () => {
  const resources = [igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar];
  const galaxy = generateGalaxy(200, resources, "many-planets-hard-filter");

  let gasGiantCount = 0;
  let terrestrialCount = 0;

  for (const planet of galaxy.planets) {
    if (planet.planetType === "GasGiant") {
      gasGiantCount++;
      assert.ok(
        !planet.producibleResourceIds.includes(igneousOre.id),
        `Gas Giant ${planet.id} must never produce the solid-only resource`,
      );
    }
    if (planet.planetType === "Terrestrial") {
      terrestrialCount++;
      assert.ok(
        !planet.producibleResourceIds.includes(hydrogenGas.id),
        `Terrestrial ${planet.id} must never produce the gas-only resource`,
      );
    }
  }

  // Confirms the check above actually exercised both cases across 200
  // planets, rather than passing vacuously because neither type appeared.
  assert.ok(gasGiantCount > 0, "expected at least one generated Gas Giant");
  assert.ok(terrestrialCount > 0, "expected at least one generated Terrestrial planet");
});
