import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadContent } from "../../src/simulation/loadContent.ts";
import { refine } from "../../src/simulation/refine.ts";
import { craft } from "../../src/simulation/craft.ts";
import { rollQuality } from "../../src/simulation/rollQuality.ts";
import { getTierColor } from "../../src/simulation/tierColor.ts";
import { computeAggregateTier } from "../../src/simulation/aggregateTier.ts";
import { createSeededRandom } from "../../src/galaxy/seededRandom.ts";
import { queueRandom } from "../fixtures/random.ts";
import { QUALITIES } from "../../src/data/types/quality.ts";
import type { ResourceInstance } from "../../src/data/types/resourceInstance.ts";
import type { CraftAccepted, CraftRejected } from "../../src/data/types/craftResult.ts";
import type { Resource } from "../../src/data/types/resource.ts";
import type { TierColor } from "../../src/data/types/tierColor.ts";

// End-to-end craftability spot-check: real content/*.json, real refine()/
// craft() functions, real rollQuality() draws -- not schema validation
// (that's already covered by mvpContent.test.ts et al.) and not synthetic
// fixture resources (tests/fixtures/*.ts) -- the actual alpha roster.

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

function resource(id: string): Resource {
  const found = content.resources.find((r) => r.id === id);
  assert.ok(found, `fixture setup: no resource "${id}" in real content`);
  return found;
}

function schematicTierFor(recipeId: string): TierColor {
  const schematic = content.schematics.find((s) => s.recipeId === recipeId);
  assert.ok(schematic, `fixture setup: no schematic for recipe "${recipeId}"`);
  return schematic.tier;
}

// ---------------------------------------------------------------------
// 1. Refining recipe: Hardened Alloy Bar (2 Cobalt Vein + 1 Titanium Shard)
// ---------------------------------------------------------------------
test("[spot-check] refine() produces a valid, sensible-tier Hardened Alloy Bar from real, randomly-rolled inputs", () => {
  const recipe = content.refiningRecipes.find((r) => r.id === "hardened-alloy-bar");
  assert.ok(recipe, "hardened-alloy-bar refining recipe must exist in real content");

  const cobaltVein = resource("cobalt-vein");
  const titaniumShard = resource("titanium-shard");
  const output = resource("hardened-alloy-bar");

  // Real, non-mocked 1-100 rolls via the real rollQuality(), seeded only
  // for reproducibility across CI runs -- not hand-picked numbers.
  const rollRandom = createSeededRandom("spot-check:hardened-alloy-bar:rolls");
  const inputs: ResourceInstance[] = [
    { resource: cobaltVein, quantity: recipe.inputs[0]!.quantity, qualities: rollQuality(cobaltVein, rollRandom) },
    { resource: titaniumShard, quantity: recipe.inputs[1]!.quantity, qualities: rollQuality(titaniumShard, rollRandom) },
  ];

  // Both real inputs (solids) have every quality applicable -- confirm the
  // roll actually produced real, in-range values, not accidental nulls.
  for (const input of inputs) {
    for (const quality of QUALITIES) {
      const value = input.qualities[quality];
      assert.ok(value !== null && value >= 1 && value <= 100, `${input.resource.id}.${quality} must be a real 1-100 roll`);
    }
  }

  const refineRandom = createSeededRandom("spot-check:hardened-alloy-bar:refine");
  const result = refine(inputs, "Blue", refineRandom);

  // Resolves without error, output resource id is real (dangling-reference
  // check already covered elsewhere; this confirms the *simulation* output
  // is usable against it).
  assert.equal(output.id, "hardened-alloy-bar");
  for (const quality of QUALITIES) {
    const value = result.qualities[quality];
    assert.ok(value !== null && value >= 1 && value <= 100, `output ${quality} must be a real 1-100 value, got ${value}`);
  }

  // Sensible tier: independently recompute the straight-average-to-tier
  // mapping refine() itself uses, and confirm its returned outputTier
  // agrees -- not just "some TierColor came back."
  const values = QUALITIES.map((q) => result.qualities[q]!);
  const expectedAverage = values.reduce((sum, v) => sum + v, 0) / values.length;
  assert.equal(result.outputTier, getTierColor(expectedAverage));
  assert.ok(result.refundUnits >= 0);
});

// ---------------------------------------------------------------------
// 2. Tier 3-5 crafting recipe: Reinforced Panel
//    (2 Glass Panel + 1 Carbon Composite, threshold durability 50+ on
//    the Carbon Composite slot)
// ---------------------------------------------------------------------
test("[spot-check] craft() Reinforced Panel: accepts a happy-path roll, and the threshold penalty measurably engages when the thresholded input is rolled below it", () => {
  const recipe = content.recipes.find((r) => r.id === "reinforced-panel");
  assert.ok(recipe, "reinforced-panel recipe must exist in real content");
  assert.equal(recipe.inputs[1]!.thresholdQuality, "durability");
  assert.equal(recipe.inputs[1]!.thresholdValue, 50);

  const schematicTier = schematicTierFor("reinforced-panel");
  assert.equal(schematicTier, "White", "sanity: this recipe's real assigned schematic tier");
  const crafterTier: TierColor = "Green";

  const glassPanel = resource("glass-panel");
  const carbonComposite = resource("carbon-composite");

  // Every quality except durability is held identical across both runs
  // (70 on every input, uniform -> base_avg is exactly 70 for those
  // dimensions regardless of what durability does) so that a difference
  // in, say, potency's output is attributable *purely* to the threshold
  // penalty multiplier -- not to a shifted base average.
  function buildInputs(carbonDurability: number): ResourceInstance[] {
    return [
      { resource: glassPanel, quantity: 2, qualities: { purity: 70, density: 70, potency: 70, durability: 70, rarity: 70 } },
      { resource: carbonComposite, quantity: 1, qualities: { purity: 70, density: 70, potency: 70, durability: carbonDurability, rarity: 70 } },
    ];
  }

  // Hand-derived from the real Green crafter (-6%/+10%) + White schematic
  // (+1% ceiling, -0.5% narrowing, 5% forgiveness) tables, with a single
  // fixed random() draw of 0.5 for both runs:
  //   combinedCeilingRaise = min(0.10+0.01, 0.18) = 0.11
  //   combinedNegative     = min(-0.06+0.005, 0) = -0.055
  //   rollFraction         = -0.055 + 0.5*(0-(-0.055)) = -0.0275
  //   preThreshold(potency) = 70 * 1.11 * (1-0.0275) = 75.56325
  const above = craft(buildInputs(70), recipe, schematicTier, crafterTier, queueRandom([0.5])) as CraftAccepted;
  assert.equal(above.accepted, true, "70 durability (20 above the 50 threshold) must be accepted with no penalty");
  assert.equal(above.qualities.potency, 76); // round(75.56325 * 1.0)

  // 25 points below threshold -> effectivePointsBelow = 25*(1-0.05) = 23.75
  // -> penalty curve's 21-30 band -> multiplier 0.70.
  const below = craft(buildInputs(25), recipe, schematicTier, crafterTier, queueRandom([0.5])) as CraftAccepted;
  assert.equal(below.accepted, true, "25 points below threshold is still craftable (only 41+ is rejected)");
  assert.equal(below.qualities.potency, 53); // round(75.56325 * 0.70)

  assert.ok(below.qualities.potency! < above.qualities.potency!, "the penalty must measurably reduce output quality");

  // Sensible tier: worse inputs must never produce a strictly better
  // aggregate tier than the happy-path run.
  const aboveTier = computeAggregateTier(above.qualities)!;
  const belowTier = computeAggregateTier(below.qualities)!;
  const TIER_RANK: Record<TierColor, number> = { Grey: 0, White: 1, Green: 2, Blue: 3, Purple: 4, Orange: 5, Gold: 6 };
  assert.ok(TIER_RANK[belowTier] <= TIER_RANK[aboveTier], `below-threshold tier (${belowTier}) must not rank above the happy-path tier (${aboveTier})`);

  // 45 points below (41+) must be outright rejected, not silently degraded.
  const rejected = craft(buildInputs(5), recipe, schematicTier, crafterTier, queueRandom([0.5])) as CraftRejected;
  assert.equal(rejected.accepted, false);
  assert.match(rejected.reason, /41\+ is rejected|points below/);
});

// ---------------------------------------------------------------------
// 3. Tier 6-7 crafting recipe: Superconductor Coil
//    (2 Polished Crystal Lattice + 1 Fusion Gas Mix, threshold potency
//    90+ on the Fusion Gas Mix slot)
// ---------------------------------------------------------------------
test("[spot-check] craft() Superconductor Coil: accepts a happy-path roll, and the threshold penalty measurably engages below threshold", () => {
  const recipe = content.recipes.find((r) => r.id === "superconductor-coil");
  assert.ok(recipe, "superconductor-coil recipe must exist in real content");
  assert.equal(recipe.inputs[1]!.thresholdQuality, "potency");
  assert.equal(recipe.inputs[1]!.thresholdValue, 90);

  const schematicTier = schematicTierFor("superconductor-coil");
  assert.equal(schematicTier, "Orange", "sanity: this recipe's real assigned schematic tier");
  const crafterTier: TierColor = "Purple";

  const polishedCrystalLattice = resource("polished-crystal-lattice");
  const fusionGasMix = resource("fusion-gas-mix");

  function buildInputs(fusionPotency: number): ResourceInstance[] {
    return [
      { resource: polishedCrystalLattice, quantity: 2, qualities: { purity: 70, density: 70, potency: 70, durability: 70, rarity: 70 } },
      { resource: fusionGasMix, quantity: 1, qualities: { purity: 70, density: 70, potency: fusionPotency, durability: 70, rarity: 70 } },
    ];
  }

  // Purple crafter (-3%/+12%) + Orange schematic (+5% ceiling, -2.5%
  // narrowing, 25% forgiveness), fixed random() = 0.5:
  //   combinedCeilingRaise = min(0.12+0.05, 0.18) = 0.17
  //   combinedNegative     = min(-0.03+0.025, 0) = -0.005
  //   rollFraction         = -0.005 + 0.5*0.005 = -0.0025
  //   preThreshold(density) = 70 * 1.17 * (1-0.0025) = 81.69525
  const above = craft(buildInputs(95), recipe, schematicTier, crafterTier, queueRandom([0.5])) as CraftAccepted;
  assert.equal(above.accepted, true);
  assert.equal(above.qualities.density, 82); // round(81.69525 * 1.0)

  // 30 points below 90 -> effectivePointsBelow = 30*(1-0.25) = 22.5 -> 0.70.
  const below = craft(buildInputs(60), recipe, schematicTier, crafterTier, queueRandom([0.5])) as CraftAccepted;
  assert.equal(below.accepted, true);
  assert.equal(below.qualities.density, 57); // round(81.69525 * 0.70)

  assert.ok(below.qualities.density! < above.qualities.density!);
  const belowTier = computeAggregateTier(below.qualities)!;
  const aboveTier = computeAggregateTier(above.qualities)!;
  const TIER_RANK: Record<TierColor, number> = { Grey: 0, White: 1, Green: 2, Blue: 3, Purple: 4, Orange: 5, Gold: 6 };
  assert.ok(TIER_RANK[belowTier] <= TIER_RANK[aboveTier]);
});

// ---------------------------------------------------------------------
// 4. Ship component recipe: Ion Beam Array
//    (1 Precision Alloy Frame + 1 Master Crystal Array, threshold
//    potency 85+ on the Master Crystal Array slot; itemTier 4, the
//    deepest chain in the roster -- both inputs are themselves crafted
//    items, not raw/refined)
// ---------------------------------------------------------------------
test("[spot-check] craft() Ion Beam Array (component recipe, itemTier 4): accepts a happy-path roll, and the threshold penalty measurably engages below threshold", () => {
  const recipe = content.recipes.find((r) => r.id === "ion-beam-array");
  assert.ok(recipe, "ion-beam-array recipe must exist in real content");
  assert.equal(recipe.inputs[1]!.thresholdQuality, "potency");
  assert.equal(recipe.inputs[1]!.thresholdValue, 85);

  const links = readJson("componentRecipes.json") as Array<{ recipeId: string; category: string }>;
  assert.ok(links.some((l) => l.recipeId === "ion-beam-array" && l.category === "weapon"));

  const schematicTier = schematicTierFor("ion-beam-array");
  assert.equal(schematicTier, "Gold", "sanity: this recipe's real assigned schematic tier");
  const crafterTier: TierColor = "Orange";

  const precisionAlloyFrame = resource("precision-alloy-frame");
  const masterCrystalArray = resource("master-crystal-array");

  function buildInputs(masterCrystalPotency: number): ResourceInstance[] {
    return [
      { resource: precisionAlloyFrame, quantity: 1, qualities: { purity: 70, density: 70, potency: 70, durability: 70, rarity: 70 } },
      { resource: masterCrystalArray, quantity: 1, qualities: { purity: 70, density: 70, potency: masterCrystalPotency, durability: 70, rarity: 70 } },
    ];
  }

  // Orange crafter (-1.5%/+13%) + Gold schematic (+6% ceiling, -3%
  // narrowing, 35% forgiveness):
  //   combinedCeilingRaise = min(0.13+0.06, 0.18) = 0.18 (capped, not 0.19)
  //   combinedNegative     = min(-0.015+0.03, 0) = 0 (widened past zero, clamped)
  //   rollFraction         = 0 regardless of random() (range is [0,0])
  //   preThreshold(durability) = 70 * 1.18 * 1 = 82.6
  const above = craft(buildInputs(90), recipe, schematicTier, crafterTier, queueRandom([0.5])) as CraftAccepted;
  assert.equal(above.accepted, true);
  assert.equal(above.qualities.durability, 83); // round(82.6 * 1.0)

  // 35 points below 85 -> effectivePointsBelow = 35*(1-0.35) = 22.75 -> 0.70.
  const below = craft(buildInputs(50), recipe, schematicTier, crafterTier, queueRandom([0.5])) as CraftAccepted;
  assert.equal(below.accepted, true);
  assert.equal(below.qualities.durability, 58); // round(82.6 * 0.70)

  assert.ok(below.qualities.durability! < above.qualities.durability!);
  const belowTier = computeAggregateTier(below.qualities)!;
  const aboveTier = computeAggregateTier(above.qualities)!;
  const TIER_RANK: Record<TierColor, number> = { Grey: 0, White: 1, Green: 2, Blue: 3, Purple: 4, Orange: 5, Gold: 6 };
  assert.ok(TIER_RANK[belowTier] <= TIER_RANK[aboveTier]);
});

// ---------------------------------------------------------------------
// 5. Bonus: full raw -> refined -> crafted chain in one continuous pipeline,
//    using refine()'s real output as one of craft()'s real inputs.
// ---------------------------------------------------------------------
test("[spot-check] full pipeline: real refine() output feeds directly into a real craft() call (Selenite/Corundum -> Polished Crystal Lattice -> Superconductor Coil)", () => {
  const selenite = resource("selenite-crystal");
  const corundum = resource("corundum-crystal");
  const polishedCrystalLattice = resource("polished-crystal-lattice");
  const fusionGasMix = resource("fusion-gas-mix");
  const recipe = content.recipes.find((r) => r.id === "superconductor-coil")!;

  const rollRandom = createSeededRandom("spot-check:full-pipeline:rolls");
  const refiningInputs: ResourceInstance[] = [
    { resource: selenite, quantity: 2, qualities: rollQuality(selenite, rollRandom) },
    { resource: corundum, quantity: 1, qualities: rollQuality(corundum, rollRandom) },
  ];
  // Both inputs are Crystal (purity null per the roster's Gas/Crystal
  // null-quality pattern) -- confirm that's really exercised here, not
  // assumed.
  assert.equal(refiningInputs[0]!.qualities.purity, null);
  assert.equal(refiningInputs[1]!.qualities.purity, null);

  const refineResult = refine(refiningInputs, "Blue", createSeededRandom("spot-check:full-pipeline:refine"));
  // Purity stays null all the way through -- excluded from the average
  // entirely, per the refining formula's own rule, never coerced to 0.
  assert.equal(refineResult.qualities.purity, null);
  for (const q of ["density", "potency", "durability", "rarity"] as const) {
    assert.ok(refineResult.qualities[q]! >= 1 && refineResult.qualities[q]! <= 100);
  }

  // Real roll for every dimension except potency -- Superconductor Coil's
  // threshold (potency 90+) sits on this exact slot, and a genuinely
  // random 1-100 roll would only clear it ~11% of the time, making this
  // "happy path chain" demo flaky through no fault of craft() itself.
  // Overriding just the thresholded dimension keeps the demonstration
  // deterministic while still exercising a real roll on the other 4.
  const fusionQualities = { ...rollQuality(fusionGasMix, createSeededRandom("spot-check:full-pipeline:fusion")), potency: 95 };
  const craftInputs: ResourceInstance[] = [
    { resource: polishedCrystalLattice, quantity: 2, qualities: refineResult.qualities },
    { resource: fusionGasMix, quantity: 1, qualities: fusionQualities },
  ];
  const craftResult = craft(craftInputs, recipe, "Orange", "Blue", createSeededRandom("spot-check:full-pipeline:craft")) as CraftAccepted;

  assert.equal(craftResult.accepted, true, "the real refine() output must be usable as a real craft() input with no adaptation");
  // Purity is null on the Polished Crystal Lattice input (inherited from
  // refining two Crystal resources) but real on Fusion Gas Mix (a refined
  // resource with all 5 qualities applicable in this content roster) --
  // craft()'s base average only excludes a quality when it's null on
  // *every* input (same rule refine() itself follows), so with one real
  // source the combined output is real too, not null. Confirms the
  // per-input (not per-recipe) null-exclusion rule end-to-end with a
  // genuinely mixed case, rather than assuming null just because one of
  // the two inputs happened to lack it.
  assert.ok(craftResult.qualities.purity !== null && craftResult.qualities.purity >= 1 && craftResult.qualities.purity <= 100);

  const tier = computeAggregateTier(craftResult.qualities);
  assert.ok(tier !== null, "a fully-real chained craft must still resolve to a real aggregate tier");
});
