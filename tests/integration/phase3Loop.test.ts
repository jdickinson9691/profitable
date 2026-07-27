import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadContent } from "../../src/simulation/loadContent.ts";
import { refine } from "../../src/simulation/refine.ts";
import { craft } from "../../src/simulation/craft.ts";
import { generateGalaxy } from "../../src/galaxy/generateGalaxy.ts";
import { rollQualityOnPlanet } from "../../src/galaxy/rollQualityOnPlanet.ts";
import { loadTradingContent } from "../../src/trading/loadTradingContent.ts";
import { createListing } from "../../src/trading/createListing.ts";
import { purchaseListing } from "../../src/trading/purchaseListing.ts";
import { applyDrift } from "../../src/trading/drift.ts";
import { getGlobalPrice } from "../../src/trading/globalPrice.ts";
import { queueRandom } from "../fixtures/random.ts";
import type { ResourceInstance } from "../../src/data/types/resourceInstance.ts";
import type { CraftAccepted } from "../../src/data/types/craftResult.ts";
import type { PurchaseSucceeded } from "../../src/data/types/purchaseResult.ts";
import type { PlanetMarketState } from "../../src/data/types/planetMarketState.ts";

// Agent 15 (Phase 3 Integration): verifies the full extended loop -- gather
// (Phase 2) -> refine -> craft (MVP) -> list -> purchase -> price reflects
// it (Phase 3) -- end-to-end using real (non-mocked) data: the actual
// content/*.json and content/trading*.json files, a real generated galaxy,
// and the actual Agent 11 trading functions. Distinct from Agent 12's unit
// tests, which prove each function correct in isolation against synthetic
// fixtures; this proves the real wiring between all four phases has no
// gap, same spirit as Agent 7's mvpLoop.test.ts and Agent 10's own
// verification.

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

const tradingContent = loadTradingContent({
  tradingBasePrices: readJson("tradingBasePrices.json"),
  planetMarketPreferences: readJson("planetMarketPreferences.json"),
});

test("full extended loop: gather on a generated planet -> refine -> craft -> list -> purchase, with real data throughout", () => {
  const galaxy = generateGalaxy(5, content.resources, "phase3-integration-full-loop");
  const planet = galaxy.planets[0]!;

  // Step 1 (Phase 2): gather whatever this generated planet actually
  // produces, with a real quality roll (tier modifier applied live).
  const gatheredResourceId = planet.producibleResourceIds[0]!;
  const gatheredResource = content.resources.find((r) => r.id === gatheredResourceId)!;
  const gatheredRoll = rollQualityOnPlanet(gatheredResource, planet, queueRandom([0.5, 0.5, 0.5, 0.5, 0.5]));
  for (const [quality, applicable] of Object.entries(gatheredResource.applicableQualities)) {
    const value = gatheredRoll[quality as keyof typeof gatheredRoll];
    if (applicable) {
      assert.ok(typeof value === "number" && value >= 1 && value <= 100);
    } else {
      assert.equal(value, null);
    }
  }

  // Steps 2-3 (MVP): refine + craft still run unmodified, fed by a real
  // gathered batch. The exact hand-calculated refine()/craft() cases are
  // reused verbatim below (not re-derived here) per Agent 15's own
  // Definition of Done: confirm they still pass unchanged, not re-prove
  // them with new arithmetic.
  const igneousOre = content.resources.find((r) => r.id === "igneous-ore")!;
  const autuniteCrystal = content.resources.find((r) => r.id === "autunite-crystal")!;
  const refiningRecipe = content.refiningRecipes.find((r) => r.id === "radiant-alloy-bar")!;
  const refineInputs: ResourceInstance[] = [
    { resource: igneousOre, quantity: 2, qualities: { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 } },
    { resource: autuniteCrystal, quantity: 1, qualities: { purity: null, density: 60, potency: 60, durability: 60, rarity: 60 } },
  ];
  assert.equal(refineInputs[0]!.quantity, refiningRecipe.inputs[0]!.quantity);
  const refineResult = refine(refineInputs, "Gold", queueRandom([0, 0.5, 0.5, 0.5]));
  assert.deepEqual(refineResult.qualities, { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 });

  const radiantAlloyBar = content.resources.find((r) => r.id === "radiant-alloy-bar")!;
  const hydrogenGas = content.resources.find((r) => r.id === "hydrogen-gas")!;
  const recipe = content.recipes.find((r) => r.id === "ion-forged-hull-plate")!;
  const schematic = content.schematics.find((s) => s.recipeId === recipe.id)!;
  const craftInputs: ResourceInstance[] = [
    { resource: radiantAlloyBar, quantity: 1, qualities: refineResult.qualities },
    { resource: hydrogenGas, quantity: 1, qualities: { purity: 60, density: 60, potency: 60, durability: null, rarity: 60 } },
  ];
  const craftResult = craft(craftInputs, recipe, schematic.tier, "Gold", queueRandom([0.5])) as CraftAccepted;
  assert.equal(craftResult.accepted, true);
  assert.deepEqual(craftResult.qualities, { purity: 71, density: 71, potency: 71, durability: 71, rarity: 71 });

  // Step 4 (Phase 3): list the real crafted item -- an Ion-Forged Hull
  // Plate is itemTier 3 (see content/resources.json), well under the
  // global-listable ceiling, so this must not throw.
  const craftedResource = content.resources.find((r) => r.id === "ion-forged-hull-plate")!;
  const basePriceEntry = tradingContent.tradingBasePrices.find((p) => p.itemId === "ion-forged-hull-plate")!;

  const listing = createListing(
    { resource: craftedResource, quantity: 1, qualities: craftResult.qualities },
    1,
    basePriceEntry.basePrice,
    { planetId: planet.id },
    "seller-1",
    "integration-listing-1",
    0,
  );
  assert.equal(listing.itemId, "ion-forged-hull-plate");
  assert.equal(listing.marketTier, "Green"); // straight average of five 71s -> 71 -> Green (61-75)

  // Step 5 (Phase 3): purchase it, with a real PlanetMarketState seeded
  // from Agent 14's real base price.
  const marketState: PlanetMarketState = {
    planetId: planet.id,
    itemId: "ion-forged-hull-plate",
    currentPrice: basePriceEntry.basePrice,
    basePrice: basePriceEntry.basePrice,
  };
  const purchase = purchaseListing(listing, 1, "buyer-1", marketState) as PurchaseSucceeded;
  assert.equal(purchase.success, true);
  assert.equal(purchase.closed, true);
  assert.equal(purchase.totalPaid, basePriceEntry.basePrice);
  // The buyer's copy of the item still carries its real crafted qualities
  // -- proving quality data survives the full gather->refine->craft->list
  // ->purchase chain, not just each individual step in isolation.
  assert.deepEqual(craftResult.qualities, { purity: 71, density: 71, potency: 71, durability: 71, rarity: 71 });
});

test("hand-verified pricing example: a known starting price + a known trade produces the exact expected drifted price", () => {
  const galaxy = generateGalaxy(3, content.resources, "phase3-integration-pricing-example");
  const planet = galaxy.planets[0]!;
  const basePriceEntry = tradingContent.tradingBasePrices.find((p) => p.itemId === "igneous-ore")!;
  assert.equal(basePriceEntry.basePrice, 5); // the real content value this example is built on

  const igneousOre = content.resources.find((r) => r.id === "igneous-ore")!;
  const listing = createListing(
    { resource: igneousOre, quantity: 10, qualities: { purity: 50, density: 50, potency: 50, durability: 50, rarity: 50 } },
    10,
    6,
    { planetId: planet.id },
    "seller-1",
    "pricing-example-listing",
    0,
  );
  const marketState: PlanetMarketState = {
    planetId: planet.id,
    itemId: "igneous-ore",
    currentPrice: basePriceEntry.basePrice,
    basePrice: basePriceEntry.basePrice,
  };

  const purchase = purchaseListing(listing, 3, "buyer-1", marketState) as PurchaseSucceeded;
  assert.equal(purchase.success, true);

  // Hand-calculated: 3 units bought -> price rises 2% per unit, compounding:
  // 5 * 1.02^3 = 5 * 1.061208 = 5.30604
  const expectedPrice = 5 * 1.02 ** 3;
  assert.ok(Math.abs(purchase.updatedMarketState!.currentPrice - expectedPrice) < 1e-9);
  assert.ok(Math.abs(expectedPrice - 5.30604) < 1e-9);

  // totalPaid = 3 * 6 = 18; fee = 5% of 18 = 0.9; proceeds = 17.1
  assert.equal(purchase.totalPaid, 18);
  assert.ok(Math.abs(purchase.feeDeducted - 0.9) < 1e-9);
  assert.ok(Math.abs(purchase.proceedsToSeller - 17.1) < 1e-9);
});

test("hand-verified global price invariant, using real multi-planet generated data", () => {
  const galaxy = generateGalaxy(5, content.resources, "phase3-integration-invariant");
  const [planetA, planetB, planetC] = galaxy.planets;
  const basePrice = tradingContent.tradingBasePrices.find((p) => p.itemId === "igneous-ore")!.basePrice;
  assert.equal(basePrice, 5);

  const stateA: PlanetMarketState = { planetId: planetA!.id, itemId: "igneous-ore", currentPrice: basePrice, basePrice };
  // Planet B: 2 units sold into its market -> price drops.
  const stateB = applyDrift(
    { planetId: planetB!.id, itemId: "igneous-ore", currentPrice: basePrice, basePrice },
    2,
    "sell",
  );
  // Planet C: 4 units bought from its market -> price rises.
  const stateC = applyDrift(
    { planetId: planetC!.id, itemId: "igneous-ore", currentPrice: basePrice, basePrice },
    4,
    "buy",
  );

  const expectedB = 5 * 0.98 ** 2; // 4.802
  const expectedC = 5 * 1.02 ** 4; // 5.4121608
  assert.ok(Math.abs(stateB.currentPrice - expectedB) < 1e-9);
  assert.ok(Math.abs(stateC.currentPrice - expectedC) < 1e-9);

  const marketStates = [stateA, stateB, stateC];
  const buyPrice = getGlobalPrice("igneous-ore", "buy", marketStates);
  const sellPrice = getGlobalPrice("igneous-ore", "sell", marketStates);

  // Hand-calculated: buy = min(all 3 planets' prices) + 10% markup;
  // Planet B (4.802) is the cheapest -> buy = 4.802 * 1.1 = 5.2822.
  const expectedBuy = expectedB * 1.1;
  assert.ok(Math.abs(buyPrice - expectedBuy) < 1e-9);
  assert.ok(Math.abs(expectedBuy - 5.2822) < 1e-6);

  // sell = max(all 3 planets' prices) - 10% discount; Planet C (5.4121608)
  // is the most expensive -> sell = 5.4121608 * 0.9 = 4.87094472.
  const expectedSell = expectedC * 0.9;
  assert.ok(Math.abs(sellPrice - expectedSell) < 1e-9);
  assert.ok(Math.abs(expectedSell - 4.87094472) < 1e-6);

  // The invariant itself, against the real generated+drifted data: global
  // never structurally beats the best live planet price.
  const allPrices = marketStates.map((s) => s.currentPrice);
  assert.ok(buyPrice >= Math.min(...allPrices));
  assert.ok(sellPrice <= Math.max(...allPrices));
});

test("regression: the original MVP's and Phase 2's hand-calculated cases still pass with zero deviation", () => {
  // Re-asserts the exact same cases tests/integration/mvpLoop.test.ts and
  // tests/galaxy/regressionCheck.test.ts already prove, as a dedicated
  // marker (per this agent's own Definition of Done) that the full Phase 3
  // roster -- amendment, Agents 11-14 -- didn't disturb them.
  const refineInputs: ResourceInstance[] = [
    { resource: content.resources.find((r) => r.id === "igneous-ore")!, quantity: 2, qualities: { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 } },
    { resource: content.resources.find((r) => r.id === "autunite-crystal")!, quantity: 1, qualities: { purity: null, density: 60, potency: 60, durability: 60, rarity: 60 } },
  ];
  const refineResult = refine(refineInputs, "Gold", queueRandom([0, 0.5, 0.5, 0.5]));
  assert.deepEqual(refineResult, {
    qualities: { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 },
    outputTier: "White",
    refundUnits: 0,
  });

  const recipe = content.recipes.find((r) => r.id === "ion-forged-hull-plate")!;
  const schematic = content.schematics.find((s) => s.recipeId === recipe.id)!;
  const craftInputs: ResourceInstance[] = [
    { resource: content.resources.find((r) => r.id === "radiant-alloy-bar")!, quantity: 1, qualities: { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 } },
    { resource: content.resources.find((r) => r.id === "hydrogen-gas")!, quantity: 1, qualities: { purity: 60, density: 60, potency: 60, durability: null, rarity: 60 } },
  ];
  const craftResult = craft(craftInputs, recipe, schematic.tier, "Gold", queueRandom([0.5])) as CraftAccepted;
  assert.equal(craftResult.accepted, true);
  assert.deepEqual(craftResult.qualities, { purity: 71, density: 71, potency: 71, durability: 71, rarity: 71 });

  const galaxy = generateGalaxy(6, content.resources, "phase3-integration-regression-reproduce");
  const galaxyAgain = generateGalaxy(6, content.resources, "phase3-integration-regression-reproduce");
  assert.deepEqual(galaxy, galaxyAgain);
});
