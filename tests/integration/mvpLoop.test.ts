import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadContent } from "../../src/simulation/loadContent.ts";
import { rollQuality } from "../../src/simulation/rollQuality.ts";
import { refine } from "../../src/simulation/refine.ts";
import { craft } from "../../src/simulation/craft.ts";
import { queueRandom } from "../fixtures/random.ts";
import type { ResourceInstance } from "../../src/data/types/resourceInstance.ts";
import type { CraftAccepted } from "../../src/data/types/craftResult.ts";

// Agent 7 (Integration): verifies the full MVP loop end-to-end using real
// (non-mocked) data -- the actual content/*.json files, loaded through the
// actual loadContent(), fed into the actual refine()/craft(). This is
// distinct from Agent 3's unit tests, which hand-calculate against test
// fixtures (tests/fixtures/*) rather than the real configured content --
// this test proves Agent 6's specific values, loaded through Agent 1's
// schemas, produce correct results in Agent 2's formulas, with no
// upstream contract gap hiding in the wiring.

const CONTENT_DIR = join(import.meta.dirname, "../../content");

function readJson(filename: string): unknown {
  return JSON.parse(readFileSync(join(CONTENT_DIR, filename), "utf8"));
}

const content = loadContent({
  resources: readJson("resources.json"),
  recipes: readJson("recipes.json"),
  refiningRecipes: readJson("refiningRecipes.json"),
  schematics: readJson("schematics.json"),
  planets: readJson("planets.json"),
});

test("GDD Section 2 DoD, step 1: a resource can be gathered on Delta Rigelus with a random quality roll", () => {
  const planet = content.planets.find((p) => p.id === "delta-rigelus");
  assert.ok(planet, "Delta Rigelus must be in the real content");

  for (const resourceId of planet!.producibleResourceIds) {
    const resource = content.resources.find((r) => r.id === resourceId);
    assert.ok(resource, `producible resource "${resourceId}" must resolve to a real Resource`);
    const roll = rollQuality(resource!);
    for (const [quality, applicable] of Object.entries(resource!.applicableQualities)) {
      const value = roll[quality as keyof typeof roll];
      if (applicable) {
        assert.ok(typeof value === "number" && value >= 1 && value <= 100);
      } else {
        assert.equal(value, null);
      }
    }
  }
});

test("GDD Section 2 DoD, step 2: refine() on the real refining recipe matches a hand-calculated value", () => {
  const refiningRecipe = content.refiningRecipes.find((r) => r.id === "radiant-alloy-bar");
  assert.ok(refiningRecipe);

  const igneousOre = content.resources.find((r) => r.id === "igneous-ore");
  const autuniteCrystal = content.resources.find((r) => r.id === "autunite-crystal");
  assert.ok(igneousOre && autuniteCrystal);

  // Both inputs at a uniform 60 on every applicable dimension -- base_avg
  // is 60 on all 5 dims (purity comes solely from the ore, since the
  // crystal's purity is null in the real content; still 60).
  const inputs: ResourceInstance[] = [
    {
      resource: igneousOre!,
      quantity: 2,
      qualities: { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 },
    },
    {
      resource: autuniteCrystal!,
      quantity: 1,
      qualities: { purity: null, density: 60, potency: 60, durability: 60, rarity: 60 },
    },
  ];
  assert.equal(inputs[0]!.quantity, refiningRecipe!.inputs[0]!.quantity);
  assert.equal(inputs[1]!.quantity, refiningRecipe!.inputs[1]!.quantity);

  // Gold refiner tier: -0.5%/+15%. random()=0 -> varianceRoll = -0.005
  // exactly -> round(60 * 0.995) = round(59.7) = 60 on every dimension.
  // Output average = 60 -> White tier (41-60) -> 0% refund chance, so the
  // 3 remaining queued values (one per consumed unit: 2 ore + 1 crystal)
  // never matter.
  const result = refine(inputs, "Gold", queueRandom([0, 0.5, 0.5, 0.5]));

  assert.deepEqual(result, {
    qualities: { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 },
    outputTier: "White",
    refundUnits: 0,
  });
});

test("GDD Section 2 DoD, step 2: refined output feeds step 3's threshold check with room on both sides", () => {
  // Confirms the specific hand-calculated refine() output above (durability
  // 60) sits exactly AT the real crafting recipe's threshold -- not a
  // coincidence the next test relies on, spelled out explicitly.
  const recipe = content.recipes.find((r) => r.id === "ion-forged-hull-plate");
  const thresholdSlot = recipe!.inputs.find((i) => i.thresholdQuality === "durability");
  assert.equal(thresholdSlot?.thresholdValue, 60);
});

test("GDD Section 2 DoD, step 3: craft() on the real crafting recipe + real schematic matches a hand-calculated value", () => {
  const recipe = content.recipes.find((r) => r.id === "ion-forged-hull-plate");
  const schematic = content.schematics.find((s) => s.recipeId === recipe!.id);
  const radiantAlloyBar = content.resources.find((r) => r.id === "radiant-alloy-bar");
  const hydrogenGas = content.resources.find((r) => r.id === "hydrogen-gas");
  assert.ok(recipe && schematic && radiantAlloyBar && hydrogenGas);
  assert.equal(schematic!.tier, "Blue"); // the real content's actual choice, not assumed

  // The Radiant Alloy Bar carries the exact hand-calculated refine() output
  // from the previous test (durability 60, at the recipe's threshold).
  const inputs: ResourceInstance[] = [
    {
      resource: radiantAlloyBar!,
      quantity: 1,
      qualities: { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 },
    },
    {
      resource: hydrogenGas!,
      quantity: 1,
      qualities: { purity: 60, density: 60, potency: 60, durability: null, rarity: 60 },
    },
  ];

  // Gold crafter (+15%) + Blue schematic (+3%) = +18% ceiling (exactly at
  // the cap, not over it) -> raisedCeiling = 60 * 1.18 = 70.8 on every
  // dimension. Gold's -0.5% downside widened by Blue's 1.5% narrowing
  // floors to exactly 0 -> the roll is deterministic regardless of the
  // random() value. Durability 60 meets the recipe's 60 threshold exactly
  // (0 points below) -> multiplier 1.0 regardless of Blue's forgiveness.
  // round(70.8) = 71 on every dimension.
  const result = craft(inputs, recipe!, schematic!.tier, "Gold", queueRandom([0.5])) as CraftAccepted;

  assert.equal(result.accepted, true);
  assert.deepEqual(result.qualities, {
    purity: 71,
    density: 71,
    potency: 71,
    durability: 71,
    rarity: 71,
  });
});
