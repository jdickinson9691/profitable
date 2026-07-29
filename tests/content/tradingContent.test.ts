import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadTradingContent } from "../../src/trading/loadTradingContent.ts";

const CONTENT_DIR = join(import.meta.dirname, "../../content");

function readJson(filename: string): unknown {
  return JSON.parse(readFileSync(join(CONTENT_DIR, filename), "utf8"));
}

test("the real trading content files load through loadTradingContent() with no errors", () => {
  const loaded = loadTradingContent({
    tradingBasePrices: readJson("tradingBasePrices.json"),
    planetMarketPreferences: readJson("planetMarketPreferences.json"),
  });

  // Alpha content roster: 60 total resources, each with a base price --
  // see content/README.md's Alpha Content Roster section.
  assert.equal(loaded.tradingBasePrices.length, 60);
  assert.equal(loaded.planetMarketPreferences.length, 4);
});

test("every MVP resource has a base price (no gaps for Agent 15 to seed from)", () => {
  const resources = readJson("resources.json") as Array<{ id: string }>;
  const basePrices = readJson("tradingBasePrices.json") as Array<{ itemId: string }>;
  const pricedIds = new Set(basePrices.map((p) => p.itemId));

  for (const resource of resources) {
    assert.ok(pricedIds.has(resource.id), `no base price for resource "${resource.id}"`);
  }
});

test("base prices are internally consistent: each output tier costs more than its raw inputs combined", () => {
  const basePrices = readJson("tradingBasePrices.json") as Array<{ itemId: string; basePrice: number }>;
  const price = (id: string) => basePrices.find((p) => p.itemId === id)?.basePrice ?? 0;

  // Radiant Alloy Bar refines from 2x Igneous Ore + 1x Autunite Crystal.
  const alloyInputCost = 2 * price("igneous-ore") + price("autunite-crystal");
  assert.ok(price("radiant-alloy-bar") > alloyInputCost);

  // Ion-Forged Hull Plate crafts from 1x Radiant Alloy Bar + 1x Hydrogen Gas.
  const hullPlateInputCost = price("radiant-alloy-bar") + price("hydrogen-gas");
  assert.ok(price("ion-forged-hull-plate") > hullPlateInputCost);
});

test("alpha content roster: every refining recipe's output costs more than its inputs combined", () => {
  const basePrices = readJson("tradingBasePrices.json") as Array<{ itemId: string; basePrice: number }>;
  const price = (id: string) => basePrices.find((p) => p.itemId === id)?.basePrice ?? 0;
  const refiningRecipes = readJson("refiningRecipes.json") as Array<{
    id: string;
    inputs: Array<{ resourceId: string; quantity: number }>;
    outputResourceId: string;
  }>;

  for (const recipe of refiningRecipes) {
    const inputCost = recipe.inputs.reduce((sum, input) => sum + price(input.resourceId) * input.quantity, 0);
    assert.ok(
      price(recipe.outputResourceId) > inputCost,
      `refining recipe "${recipe.id}": output price ${price(recipe.outputResourceId)} does not exceed input cost ${inputCost}`,
    );
  }
});

test("alpha content roster: every crafting recipe's output costs more than its inputs combined", () => {
  const basePrices = readJson("tradingBasePrices.json") as Array<{ itemId: string; basePrice: number }>;
  const price = (id: string) => basePrices.find((p) => p.itemId === id)?.basePrice ?? 0;
  const resources = readJson("resources.json") as Array<{ id: string; category: string }>;
  const recipes = readJson("recipes.json") as Array<{
    id: string;
    inputs: Array<{ category: string; quantity: number }>;
    outputResourceId: string;
  }>;
  const resourceForCategory = (category: string) => resources.find((r) => r.category === category);

  for (const recipe of recipes) {
    const inputCost = recipe.inputs.reduce((sum, input) => {
      const resource = resourceForCategory(input.category);
      assert.ok(resource, `recipe "${recipe.id}": no resource for category "${input.category}"`);
      return sum + price(resource!.id) * input.quantity;
    }, 0);
    assert.ok(
      price(recipe.outputResourceId) > inputCost,
      `recipe "${recipe.id}": output price ${price(recipe.outputResourceId)} does not exceed input cost ${inputCost}`,
    );
  }
});

test("planet market preferences reference only real resource ids -- no dangling references", () => {
  const resources = readJson("resources.json") as Array<{ id: string }>;
  const resourceIds = new Set(resources.map((r) => r.id));
  const preferences = readJson("planetMarketPreferences.json") as Array<{
    sellsCheap: string[];
    buysAtPremium: string[];
  }>;

  for (const pref of preferences) {
    for (const id of [...pref.sellsCheap, ...pref.buysAtPremium]) {
      assert.ok(resourceIds.has(id), `planet market preference references unknown resource id "${id}"`);
    }
  }
});

test("every Planet Type has a market preference entry -- no generated planet is left without one", () => {
  const preferences = readJson("planetMarketPreferences.json") as Array<{ planetType: string }>;
  const covered = new Set(preferences.map((p) => p.planetType));
  for (const planetType of ["Terrestrial", "SuperEarth", "Neptunian", "GasGiant"]) {
    assert.ok(covered.has(planetType), `no market preference for Planet Type "${planetType}"`);
  }
});

test("resources.json's itemTier values reflect raw < refined < crafted pipeline depth", () => {
  const resources = readJson("resources.json") as Array<{ id: string; itemTier?: number }>;
  const tier = (id: string) => resources.find((r) => r.id === id)?.itemTier;

  assert.equal(tier("igneous-ore"), 1);
  assert.equal(tier("hydrogen-gas"), 1);
  assert.equal(tier("autunite-crystal"), 1);
  assert.equal(tier("radiant-alloy-bar"), 2);
  assert.ok((tier("ion-forged-hull-plate") ?? 0) > (tier("radiant-alloy-bar") ?? 0));
});
