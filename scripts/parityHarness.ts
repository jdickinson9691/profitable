// Agent 33 (Unity Parity Validation) harness -- docs/agents/agent-33-unity-parity-validation.md.
//
// Generates a corpus of getTierColor/rollQuality/refine/craft cases,
// runs every one through the REAL TypeScript functions (the same ones
// the live game calls), and writes inputs + outputs to
// unity/parity/ts-parity-results.json. ProfitableCore.Tests/Parity/
// ParityTests.cs re-runs the identical cases through the C# port and
// asserts equality -- this file is the source-of-truth side of that
// comparison, not the comparison itself.
//
// Randomness is generated once (Math.random()) and recorded into each
// case's `randomSequence` rather than hand-picked -- see the contract's
// own note on why sequences are generated generously long (30 values)
// instead of call-count-exact.
//
// Run: npm run parity (or: node scripts/parityHarness.ts)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { getTierColor } from "../src/simulation/tierColor.ts";
import { rollQuality } from "../src/simulation/rollQuality.ts";
import { refine } from "../src/simulation/refine.ts";
import { craft } from "../src/simulation/craft.ts";
import { igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar } from "../tests/fixtures/resources.ts";
import { makeInstance } from "../tests/fixtures/instances.ts";
import { ionForgedHullPlateRecipe } from "../tests/fixtures/recipes.ts";
import { QUALITIES } from "../src/data/types/quality.ts";

import type { Resource } from "../src/data/types/resource.ts";
import type { ResourceInstance } from "../src/data/types/resourceInstance.ts";
import type { Recipe } from "../src/data/types/recipe.ts";
import type { TierColor } from "../src/data/types/tierColor.ts";
import type { QualityRoll } from "../src/data/types/quality.ts";
import type { RandomFn } from "../src/data/types/random.ts";

const TIERS: TierColor[] = ["Grey", "White", "Green", "Blue", "Purple", "Orange", "Gold"];

// Same shape as craft.test.ts's local fixture -- kept here (and mirrored
// in ProfitableCore.Tests/Simulation/TestFixtures.cs) rather than added
// to tests/fixtures/recipes.ts, since it's parity-harness-specific, not
// used by any other TypeScript test.
const noThresholdRecipe: Recipe = {
  id: "test-no-threshold",
  name: "Test (no threshold)",
  inputs: [{ category: "any", quantity: 1 }],
  outputResourceId: "test-output",
  outputQuantity: 1,
};

const RESOURCES: Record<string, Resource> = {
  "igneous-ore": igneousOre,
  "hydrogen-gas": hydrogenGas,
  "autunite-crystal": autuniteCrystal,
  "radiant-alloy-bar": radiantAlloyBar,
};

const RECIPES: Record<string, Recipe> = {
  "ion-forged-hull-plate": ionForgedHullPlateRecipe,
  "test-no-threshold": noThresholdRecipe,
};

function randomSequence(length = 30): number[] {
  return Array.from({ length }, () => Math.random());
}

function queueRandom(values: number[]): RandomFn {
  let index = 0;
  return () => {
    if (index >= values.length) {
      throw new Error(`randomSequence exhausted after ${values.length} calls -- generate a longer sequence`);
    }
    return values[index++];
  };
}

// Serializes a QualityRoll as a plain {purity, density, ...} object with
// each value already `number | null` -- JSON's native shape for this,
// consumed identically by JSON.parse on the C# side via System.Text.Json.
function serializeQualityRoll(roll: QualityRoll): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const quality of QUALITIES) {
    out[quality] = roll[quality];
  }
  return out;
}

interface SerializedInstance {
  resourceId: string;
  quantity: number;
  qualities: Record<string, number | null>;
}

function serializeInstance(instance: ResourceInstance): SerializedInstance {
  return {
    resourceId: instance.resource.id,
    quantity: instance.quantity,
    qualities: serializeQualityRoll(instance.qualities),
  };
}

// ---- getTierColor cases: every integer 1-100, plus the documented
// fractional-gap values already locked in both languages' own unit
// tests. ----
const tierColorCases = [
  ...Array.from({ length: 100 }, (_, i) => i + 1),
  40.5, 60.5, 75.5, 85.2, 91.9, 96.1, 99.99,
].map((value) => ({ value, expectedTier: getTierColor(value) }));

// ---- rollQuality cases: several recorded-random draws per named
// fixture resource, covering different applicable-quality subsets. ----
const rollQualityCases = Object.keys(RESOURCES).flatMap((resourceId) =>
  Array.from({ length: 10 }, () => {
    const sequence = randomSequence();
    const resource = RESOURCES[resourceId]!;
    const expectedRoll = rollQuality(resource, queueRandom([...sequence]));
    return {
      resourceId,
      randomSequence: sequence,
      expectedRoll: serializeQualityRoll(expectedRoll),
    };
  }),
);

// ---- refine cases: several input configurations x all 7 tiers x 2
// recorded-random draws each. ----
const refineInputConfigs: ResourceInstance[][] = [
  [makeInstance(igneousOre, 1, { purity: 50, density: 50, potency: 50, durability: 50, rarity: 50 })],
  [makeInstance(igneousOre, 3, { purity: 20, density: 30, potency: 40, durability: 10, rarity: 15 })],
  [makeInstance(igneousOre, 1, { purity: 90, density: 90, potency: 90, durability: 90, rarity: 90 })],
  [
    makeInstance(igneousOre, 2, { purity: 80, density: 60, potency: 70, durability: 50, rarity: 40 }),
    makeInstance(autuniteCrystal, 1, { purity: null, density: 90, potency: 30, durability: 70, rarity: 60 }),
  ],
  [makeInstance(hydrogenGas, 2, { purity: 65, density: 65, potency: 65, rarity: 65 })],
  [
    makeInstance(igneousOre, 1, { purity: 1, density: 1, potency: 1, durability: 1, rarity: 1 }),
    makeInstance(igneousOre, 4, { purity: 100, density: 100, potency: 100, durability: 100, rarity: 100 }),
  ],
];

const refineCases = refineInputConfigs.flatMap((inputs) =>
  TIERS.flatMap((refinerTier) =>
    Array.from({ length: 2 }, () => {
      const sequence = randomSequence();
      const result = refine(inputs, refinerTier, queueRandom([...sequence]));
      return {
        inputs: inputs.map(serializeInstance),
        refinerTier,
        randomSequence: sequence,
        expectedResult: {
          qualities: serializeQualityRoll(result.qualities),
          outputTier: result.outputTier,
          refundUnits: result.refundUnits,
        },
      };
    }),
  ),
);

// ---- craft cases: several input/threshold scenarios x a representative
// spread of schematic/crafter tier pairs x 2 recorded-random draws. ----
interface CraftScenario {
  label: string;
  recipeId: string;
  inputs: ResourceInstance[];
}

const craftScenarios: CraftScenario[] = [
  {
    label: "no-threshold-recipe",
    recipeId: "test-no-threshold",
    inputs: [makeInstance(igneousOre, 1, { purity: 70, density: 70, potency: 70, durability: 70, rarity: 70 })],
  },
  {
    label: "at-threshold-no-violation",
    recipeId: "ion-forged-hull-plate",
    inputs: [
      makeInstance(radiantAlloyBar, 1, { purity: 70, density: 70, potency: 70, durability: 70, rarity: 70 }),
      makeInstance(hydrogenGas, 1, { purity: 70, density: 70, potency: 70, rarity: 70 }),
    ],
  },
  {
    label: "mild-violation-1-10-band",
    recipeId: "ion-forged-hull-plate",
    inputs: [
      makeInstance(radiantAlloyBar, 1, { purity: 70, density: 70, potency: 70, durability: 55, rarity: 70 }), // 5 below
      makeInstance(hydrogenGas, 1, { purity: 70, density: 70, potency: 70, rarity: 70 }),
    ],
  },
  {
    label: "regression-blue-schematic-12-below",
    recipeId: "ion-forged-hull-plate",
    inputs: [
      makeInstance(radiantAlloyBar, 1, { purity: 70, density: 70, potency: 70, durability: 48, rarity: 70 }), // 12 below
      makeInstance(hydrogenGas, 1, { purity: 70, density: 70, potency: 70, rarity: 70 }),
    ],
  },
  {
    label: "severe-violation-31-40-band",
    recipeId: "ion-forged-hull-plate",
    inputs: [
      makeInstance(radiantAlloyBar, 1, { purity: 70, density: 70, potency: 70, durability: 25, rarity: 70 }), // 35 below
      makeInstance(hydrogenGas, 1, { purity: 70, density: 70, potency: 70, rarity: 70 }),
    ],
  },
  {
    label: "catastrophic-41-plus-rejected",
    recipeId: "ion-forged-hull-plate",
    inputs: [
      makeInstance(radiantAlloyBar, 1, { purity: 70, density: 70, potency: 70, durability: 19, rarity: 70 }), // 41 below
      makeInstance(hydrogenGas, 1, { purity: 70, density: 70, potency: 70, rarity: 70 }),
    ],
  },
  {
    label: "null-threshold-quality-excluded",
    recipeId: "test-no-threshold",
    inputs: [makeInstance(hydrogenGas, 1, { purity: 70, density: 70, potency: 70, rarity: 70 })],
  },
];

const tierPairs: Array<[TierColor, TierColor]> = [
  ["Grey", "Grey"],
  ["Gold", "Gold"],
  ["Blue", "Green"],
  ["Grey", "Gold"],
  ["Gold", "Grey"],
  ["White", "Purple"],
  ["Orange", "White"],
  ["Green", "Orange"],
];

const craftCases = craftScenarios.flatMap((scenario) =>
  tierPairs.flatMap(([schematicTier, crafterTier]) =>
    Array.from({ length: 2 }, () => {
      const sequence = randomSequence();
      const recipe = RECIPES[scenario.recipeId]!;
      const result = craft(scenario.inputs, recipe, schematicTier, crafterTier, queueRandom([...sequence]));
      return {
        label: scenario.label,
        recipeId: scenario.recipeId,
        inputs: scenario.inputs.map(serializeInstance),
        schematicTier,
        crafterTier,
        randomSequence: sequence,
        expectedResult: result.accepted
          ? { accepted: true, qualities: serializeQualityRoll(result.qualities) }
          : { accepted: false, reason: result.reason },
      };
    }),
  ),
);

const output = {
  generatedAt: new Date().toISOString(),
  tierColorCases,
  rollQualityCases,
  refineCases,
  craftCases,
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outPath = join(scriptDir, "..", "unity", "parity", "ts-parity-results.json");
writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`Wrote ${outPath}`);
console.log(
  `  tierColor: ${tierColorCases.length}, rollQuality: ${rollQualityCases.length}, ` +
    `refine: ${refineCases.length}, craft: ${craftCases.length}`,
);
