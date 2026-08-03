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
import { writeFileSync, readFileSync } from "node:fs";
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
import { loadContent } from "../src/simulation/loadContent.ts";
import { generateGalaxy } from "../src/galaxy/generateGalaxy.ts";
import { generateResourcesForCycle, getCurrentPlanetResources } from "../src/galaxy/planetResourceCycle.ts";
import { createListing } from "../src/trading/createListing.ts";
import { applyDrift, applyRecovery } from "../src/trading/drift.ts";
import { getCurrentSeason, getSeasonalEffect, getSeasonalPriceMultiplier } from "../src/trading/season.ts";
import { getActiveEmergency, getEmergencyPriceMultiplier } from "../src/trading/emergency.ts";
import { getGlobalPrice } from "../src/trading/globalPrice.ts";
import { purchaseListing } from "../src/trading/purchaseListing.ts";
import { sellToMarket } from "../src/trading/sellToMarket.ts";
import { sellToGlobalMarket } from "../src/trading/sellToGlobalMarket.ts";
import { expireListings } from "../src/trading/expireListings.ts";
import { hireCrew } from "../src/crew/hireCrew.ts";
import { dismissCrew } from "../src/crew/dismissCrew.ts";
import { payUpkeep } from "../src/crew/payUpkeep.ts";
import { checkAttrition } from "../src/crew/checkAttrition.ts";
import { purchaseCapacity } from "../src/crew/purchaseCapacity.ts";
import { refreshCrewPool } from "../src/crew/refreshCrewPool.ts";
import { assignToCraft } from "../src/crew/assignToCraft.ts";
import { resolveBackgroundCrafting } from "../src/crew/resolveBackgroundCrafting.ts";
import { calculateDistance } from "../src/ships/calculateDistance.ts";
import { calculateTravelTime } from "../src/ships/calculateTravelTime.ts";
import { calculateFuelCost } from "../src/ships/calculateFuelCost.ts";
import { deriveFuelCapacity } from "../src/ships/deriveFuelCapacity.ts";
import { deriveShipTier, tierMidpoint } from "../src/ships/deriveShipTier.ts";
import { assembleShip } from "../src/ships/assembleShip.ts";
import { initiateVoyage } from "../src/ships/initiateVoyage.ts";
import { resolveArrival } from "../src/ships/resolveArrival.ts";
import { purchaseShip } from "../src/ships/purchaseShip.ts";
import { purchaseScanner } from "../src/ships/purchaseScanner.ts";
import { refreshShipyardPool } from "../src/ships/refreshShipyardPool.ts";
import { refreshScannerPool } from "../src/ships/refreshScannerPool.ts";
import { refuelShip } from "../src/ships/refuelShip.ts";
import { getCrewSlotsForShip } from "../src/ships/getCrewSlotsForShip.ts";
import { assignToShipRole } from "../src/ships/assignToShipRole.ts";
import { unassignFromShipRole } from "../src/ships/unassignFromShipRole.ts";
import { resolveComponentRepair } from "../src/ships/resolveComponentRepair.ts";
import { performScan } from "../src/ships/performScan.ts";
import { initiateCombat } from "../src/ships/initiateCombat.ts";
import { resolveEncounters } from "../src/ships/resolveEncounters.ts";
import { resolveCombatChoice } from "../src/ships/resolveCombatChoice.ts";

import type { Resource } from "../src/data/types/resource.ts";
import type { ResourceInstance } from "../src/data/types/resourceInstance.ts";
import type { Recipe } from "../src/data/types/recipe.ts";
import type { TierColor } from "../src/data/types/tierColor.ts";
import type { QualityRoll } from "../src/data/types/quality.ts";
import type { RandomFn } from "../src/data/types/random.ts";
import type { Planet } from "../src/data/types/planet.ts";
import type { PlanetType } from "../src/data/types/planetType.ts";
import type { Listing, MarketLocation } from "../src/data/types/listing.ts";
import type { PlanetMarketState } from "../src/data/types/planetMarketState.ts";
import type { Wallet } from "../src/data/types/wallet.ts";
import type { CrewCandidate } from "../src/data/types/crewCandidate.ts";
import type { CrewCapacity } from "../src/data/types/crewCapacity.ts";
import type { CrewMember } from "../src/data/types/crewMember.ts";
import type { PlanetCrewPool } from "../src/data/types/planetCrewPool.ts";
import type { CraftAction } from "../src/data/types/craftAction.ts";
import type { Ship } from "../src/data/types/ship.ts";
import type { ShipComponent } from "../src/data/types/shipComponent.ts";
import type { ShipCandidate } from "../src/data/types/shipCandidate.ts";
import type { ShipyardPool } from "../src/data/types/shipyardPool.ts";
import type { Scanner } from "../src/data/types/scanner.ts";
import type { ScannerCandidate } from "../src/data/types/scannerCandidate.ts";
import type { ScannerPool } from "../src/data/types/scannerPool.ts";
import type { Voyage, VoyageCargoItem } from "../src/data/types/voyage.ts";
import type { CombatEncounter } from "../src/data/types/combatEncounter.ts";
import type { ComponentCategory } from "../src/data/types/componentCategory.ts";
import type { ShipCrewRole } from "../src/data/types/shipCrewRole.ts";

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

// ---- Galaxy/Planet generation cases (Migration Phase 2, Sub-Phase A) ----
// Uses the REAL content/*.json catalog (via loadContent()), not the small
// hand-picked fixture set above -- this is the exact input the live game
// itself calls generateGalaxy() with, so ItemTier-based eligibility
// filtering (ResourceSubsetSelector's real bug-fix case) gets genuine
// coverage, not just a synthetic 4-resource catalog too small to exercise
// it. Seeded, so C# reproducing the same seed against the same content
// must produce a byte-identical Galaxy -- this is what actually proves
// SeededRandom/PlanetGenerator/ResourceSubsetSelector/PlanetQualityRoller
// agree with the TypeScript source end-to-end, not just per-function.
const contentDir = join(dirname(fileURLToPath(import.meta.url)), "..", "content");
function readContentJson(filename: string): unknown {
  return JSON.parse(readFileSync(join(contentDir, filename), "utf8"));
}
const realContent = loadContent({
  resources: readContentJson("resources.json"),
  recipes: readContentJson("recipes.json"),
  refiningRecipes: readContentJson("refiningRecipes.json"),
  schematics: readContentJson("schematics.json"),
  planets: readContentJson("planets.json"),
});
const realResources = realContent.resources;

function serializePlanet(planet: Planet): Record<string, unknown> {
  return {
    id: planet.id,
    name: planet.name,
    planetType: planet.planetType,
    tier: planet.tier,
    position: planet.position,
    producibleResourceIds: planet.producibleResourceIds,
    specialtyResourceId: planet.specialtyResourceId,
    resourceQualities: Object.fromEntries(
      Object.entries(planet.resourceQualities ?? {}).map(([id, roll]) => [id, serializeQualityRoll(roll)]),
    ),
    discovered: planet.discovered,
  };
}

const galaxySeeds = ["parity-seed-alpha", "parity-seed-beta", "parity-seed-gamma"];
const galaxyCases = galaxySeeds.flatMap((seed) =>
  [5, 50].map((planetCount) => {
    const galaxy = generateGalaxy(planetCount, realResources, seed);
    return {
      seed,
      planetCount,
      expectedGalaxy: {
        seed: galaxy.seed,
        planets: galaxy.planets.map(serializePlanet),
      },
    };
  }),
);

// ---- Planet resource cycle cases: same (seed, tier, planetType) across
// several cycle indices, proving determinism within a cycle and real
// divergence across cycles -- exactly what getCurrentPlanetResources()'s
// live-reset-cycle guarantee depends on. ----
const cycleTestSubjects: Array<{ seed: string; tier: TierColor; planetType: PlanetType }> = [
  { seed: "cycle-test-1", tier: "Grey", planetType: "Terrestrial" },
  { seed: "cycle-test-2", tier: "Gold", planetType: "GasGiant" },
  { seed: "cycle-test-3", tier: "Blue", planetType: "SuperEarth" },
];
const planetResourceCycleCases = cycleTestSubjects.flatMap((subject) =>
  [0, 1, 2, 41].map((cycleIndex) => {
    const result = generateResourcesForCycle(subject.seed, subject.tier, subject.planetType, realResources, cycleIndex);
    return {
      seed: subject.seed,
      tier: subject.tier,
      planetType: subject.planetType,
      cycleIndex,
      expectedResult: {
        producibleResourceIds: result.producibleResourceIds,
        specialtyResourceId: result.specialtyResourceId,
        resourceQualities: Object.fromEntries(
          Object.entries(result.resourceQualities).map(([id, roll]) => [id, serializeQualityRoll(roll)]),
        ),
      },
    };
  }),
);

// ---- getCurrentPlanetResources cases: the colonist gate, and the
// starting-planet tutorial guarantee across several cycles (not just
// cycle 0 -- planet.md's own flagged testing requirement that this
// idempotency claim needs a real multi-cycle test). ----
function planetFixture(overrides: Partial<Planet>): Planet {
  return {
    id: "gcpr-test-planet",
    name: "GCPR Test Planet",
    producibleResourceIds: [],
    planetType: "Terrestrial",
    tier: "Grey",
    ...overrides,
  };
}
const nowMs = 1_000_000_000_000;
const gcprCases = [
  { label: "below-colonist-threshold", planet: planetFixture({ colonistCount: 2 }), now: nowMs, isStartingPlanet: false },
  { label: "at-colonist-threshold", planet: planetFixture({ colonistCount: 5 }), now: nowMs, isStartingPlanet: false },
  { label: "above-colonist-threshold-not-starting", planet: planetFixture({ colonistCount: 20 }), now: nowMs, isStartingPlanet: false },
  { label: "starting-planet-cycle-0", planet: planetFixture({ colonistCount: 20 }), now: nowMs, isStartingPlanet: true },
  {
    label: "starting-planet-cycle-3",
    planet: planetFixture({ colonistCount: 20 }),
    now: nowMs + 3 * 168 * 60 * 60 * 1000,
    isStartingPlanet: true,
  },
].map((testCase) => {
  const result = getCurrentPlanetResources(testCase.planet, realResources, testCase.now, testCase.isStartingPlanet);
  return {
    label: testCase.label,
    planet: { ...testCase.planet, resourceQualities: undefined },
    nowMs: testCase.now,
    isStartingPlanet: testCase.isStartingPlanet,
    expectedResult: {
      producibleResourceIds: result.producibleResourceIds,
      specialtyResourceId: result.specialtyResourceId,
      resourceQualities: Object.fromEntries(
        Object.entries(result.resourceQualities).map(([id, roll]) => [id, serializeQualityRoll(roll)]),
      ),
    },
  };
});

// ---- Sub-Phase B (Trading) cases. Real content resources throughout
// (igneous-ore/autunite-crystal/radiant-alloy-bar/ion-forged-hull-plate),
// same "real content, not synthetic fixtures" discipline as the
// galaxy/planet cases above. Error/rejection paths that can't be reached
// with real content (e.g. a global listing above the tier-5 ceiling --
// nothing in the real catalog exceeds tier 4 yet) are covered by each
// language's own direct unit tests instead, not recorded here. ----
function findRealResource(id: string): Resource {
  const resource = realResources.find((r) => r.id === id);
  if (!resource) throw new Error(`parityHarness: real resource '${id}' not found`);
  return resource;
}

function serializeListing(listing: Listing): Record<string, unknown> {
  return {
    id: listing.id,
    itemId: listing.itemId,
    quantity: listing.quantity,
    pricePerUnit: listing.pricePerUnit,
    marketTier: listing.marketTier,
    location: listing.location,
    createdByPlayerId: listing.createdByPlayerId,
    createdAt: listing.createdAt,
    expiresAt: listing.expiresAt,
  };
}

const createListingSubjects = [
  {
    itemInstance: makeInstance(findRealResource("igneous-ore"), 10, { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 }),
    quantity: 10,
    pricePerUnit: 5,
    location: "global" as MarketLocation,
    playerId: "player-1",
    id: "listing-1",
    now: 1_000_000_000_000,
  },
  {
    itemInstance: makeInstance(findRealResource("autunite-crystal"), 3, { density: 80, potency: 80, durability: 80, rarity: 80 }),
    quantity: 3,
    pricePerUnit: 12,
    location: { planetId: "planet-alpha" } as MarketLocation,
    playerId: "player-2",
    id: "listing-2",
    now: 1_000_000_050_000,
  },
  {
    itemInstance: makeInstance(findRealResource("ion-forged-hull-plate"), 2, { purity: 45, density: 45, potency: 45, durability: 45, rarity: 45 }),
    quantity: 2,
    pricePerUnit: 40,
    location: "global" as MarketLocation,
    playerId: "player-3",
    id: "listing-3",
    now: 1_000_000_100_000,
  },
];
const createListingCases = createListingSubjects.map((c) => ({
  itemInstance: serializeInstance(c.itemInstance),
  quantity: c.quantity,
  pricePerUnit: c.pricePerUnit,
  location: c.location,
  playerId: c.playerId,
  id: c.id,
  nowMs: c.now,
  expectedListing: serializeListing(createListing(c.itemInstance, c.quantity, c.pricePerUnit, c.location, c.playerId, c.id, c.now)),
}));

const driftMarketStateSubjects: PlanetMarketState[] = [
  { planetId: "planet-alpha", itemId: "igneous-ore", currentPrice: 5, basePrice: 5 },
  { planetId: "planet-beta", itemId: "hydrogen-gas", currentPrice: 6, basePrice: 4 },
  { planetId: "planet-gamma", itemId: "autunite-crystal", currentPrice: 8, basePrice: 12 },
];
const applyDriftCases = [
  { marketState: driftMarketStateSubjects[0]!, unitsTraded: 1, direction: "buy" as const },
  { marketState: driftMarketStateSubjects[0]!, unitsTraded: 10, direction: "sell" as const },
  { marketState: driftMarketStateSubjects[1]!, unitsTraded: 25, direction: "buy" as const }, // enough units to hit the ceiling clamp
  { marketState: driftMarketStateSubjects[2]!, unitsTraded: 25, direction: "sell" as const }, // enough units to hit the floor clamp
].map((c) => ({ ...c, expectedMarketState: applyDrift(c.marketState, c.unitsTraded, c.direction) }));

const applyRecoveryCases = [
  { marketState: driftMarketStateSubjects[0]!, elapsedHours: 1 },
  { marketState: driftMarketStateSubjects[1]!, elapsedHours: 12.5 },
  { marketState: driftMarketStateSubjects[2]!, elapsedHours: 0 },
  { marketState: driftMarketStateSubjects[2]!, elapsedHours: 500 }, // effectively fully recovered
].map((c) => ({ ...c, expectedMarketState: applyRecovery(c.marketState, c.elapsedHours) }));

const seasonSubjects = [
  { planetId: "planet-alpha", now: 1_000_000_000_000, categories: ["solid", "gas", "radioactive crystal"] },
  { planetId: "planet-beta", now: 1_000_000_000_000 + 6 * 60 * 60 * 1000, categories: ["solid", "gas"] },
  { planetId: "planet-gamma", now: 1_000_000_000_000 + 30 * 60 * 60 * 1000, categories: [] as string[] },
];
const seasonCases = seasonSubjects.map((s) => {
  const season = getCurrentSeason(s.planetId, s.now);
  const effect = getSeasonalEffect(s.planetId, s.now, s.categories);
  return {
    planetId: s.planetId,
    nowMs: s.now,
    categories: s.categories,
    expectedSeason: season,
    expectedEffect: effect,
    expectedMultiplierForFirstCategory: s.categories.length > 0 ? getSeasonalPriceMultiplier(s.categories[0]!, effect) : null,
  };
});

const emergencySubjects = [
  { planetId: "planet-alpha", now: 1_000_000_000_000, categories: ["solid", "gas", "radioactive crystal"] },
  { planetId: "planet-beta", now: 1_000_000_000_000 + 2 * 60 * 60 * 1000, categories: ["solid", "gas"] },
  { planetId: "planet-gamma", now: 1_000_000_000_000 + 10 * 60 * 60 * 1000, categories: ["solid"] },
  { planetId: "planet-delta", now: 1_000_000_000_000, categories: [] as string[] },
  // Found by search (not hand-picked to "look right"): this exact
  // (planetId, now, categories) combination is one of the ~15% of
  // windows that actually triggers, so the corpus exercises the
  // triggered branch's category/endsAt fields too, not just the far
  // more common "no emergency" result.
  { planetId: "emergency-search-3", now: 1_000_000_000_000, categories: ["solid", "gas", "radioactive crystal"] },
];
const emergencyCases = emergencySubjects.map((s) => {
  const emergency = getActiveEmergency(s.planetId, s.now, s.categories);
  return {
    planetId: s.planetId,
    nowMs: s.now,
    categories: s.categories,
    expectedEmergency: emergency,
    expectedMultiplierForFirstCategory: s.categories.length > 0 ? getEmergencyPriceMultiplier(s.categories[0]!, emergency) : null,
  };
});

const globalPriceMarketStates: PlanetMarketState[] = [
  { planetId: "planet-alpha", itemId: "igneous-ore", currentPrice: 4.5, basePrice: 5 },
  { planetId: "planet-beta", itemId: "igneous-ore", currentPrice: 5.5, basePrice: 5 },
  { planetId: "planet-gamma", itemId: "igneous-ore", currentPrice: 5.0, basePrice: 5 },
];
const globalPriceCases = [
  { itemId: "igneous-ore", direction: "buy" as const, marketStates: globalPriceMarketStates },
  { itemId: "igneous-ore", direction: "sell" as const, marketStates: globalPriceMarketStates },
].map((c) => ({ ...c, expectedPrice: getGlobalPrice(c.itemId, c.direction, c.marketStates) }));

const purchaseListingSubjects: Array<{
  label: string;
  listing: Listing;
  quantityToBuy: number;
  buyerPlayerId: string;
  marketState: PlanetMarketState | null;
}> = [
  {
    label: "successful-planet-purchase",
    listing: { id: "l1", itemId: "igneous-ore", quantity: 10, pricePerUnit: 5, marketTier: "White", location: { planetId: "planet-alpha" }, createdByPlayerId: "seller-1", createdAt: 0, expiresAt: 999_999_999_999 },
    quantityToBuy: 4,
    buyerPlayerId: "buyer-1",
    marketState: { planetId: "planet-alpha", itemId: "igneous-ore", currentPrice: 5, basePrice: 5 },
  },
  {
    label: "successful-global-purchase-closes-listing",
    listing: { id: "l2", itemId: "hydrogen-gas", quantity: 3, pricePerUnit: 4, marketTier: "Green", location: "global", createdByPlayerId: "seller-2", createdAt: 0, expiresAt: 999_999_999_999 },
    quantityToBuy: 3,
    buyerPlayerId: "buyer-2",
    marketState: null,
  },
  {
    label: "self-trade-rejected",
    listing: { id: "l3", itemId: "igneous-ore", quantity: 5, pricePerUnit: 5, marketTier: "White", location: "global", createdByPlayerId: "seller-3", createdAt: 0, expiresAt: 999_999_999_999 },
    quantityToBuy: 1,
    buyerPlayerId: "seller-3",
    marketState: null,
  },
  {
    label: "insufficient-quantity-rejected",
    listing: { id: "l4", itemId: "igneous-ore", quantity: 2, pricePerUnit: 5, marketTier: "White", location: "global", createdByPlayerId: "seller-4", createdAt: 0, expiresAt: 999_999_999_999 },
    quantityToBuy: 5,
    buyerPlayerId: "buyer-4",
    marketState: null,
  },
  {
    label: "non-positive-quantity-rejected",
    listing: { id: "l5", itemId: "igneous-ore", quantity: 5, pricePerUnit: 5, marketTier: "White", location: "global", createdByPlayerId: "seller-5", createdAt: 0, expiresAt: 999_999_999_999 },
    quantityToBuy: 0,
    buyerPlayerId: "buyer-5",
    marketState: null,
  },
];
const purchaseListingCases = purchaseListingSubjects.map((s) => {
  const result = purchaseListing(s.listing, s.quantityToBuy, s.buyerPlayerId, s.marketState);
  return {
    label: s.label,
    listing: serializeListing(s.listing),
    quantityToBuy: s.quantityToBuy,
    buyerPlayerId: s.buyerPlayerId,
    marketState: s.marketState,
    expectedResult: result.success
      ? {
          success: true,
          updatedListing: serializeListing(result.updatedListing),
          closed: result.closed,
          quantityPurchased: result.quantityPurchased,
          totalPaid: result.totalPaid,
          feeDeducted: result.feeDeducted,
          proceedsToSeller: result.proceedsToSeller,
          updatedMarketState: result.updatedMarketState,
        }
      : { success: false, reason: result.reason },
  };
});

const sellToMarketSubjects = [
  {
    itemInstance: makeInstance(findRealResource("igneous-ore"), 5, { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 }),
    quantity: 5,
    marketState: { planetId: "planet-alpha", itemId: "igneous-ore", currentPrice: 5, basePrice: 5 } as PlanetMarketState,
    wallet: { playerId: "seller-1", credits: 100 } as Wallet,
    sellerPlayerId: "seller-1",
  },
  {
    itemInstance: makeInstance(findRealResource("hydrogen-gas"), 8, { purity: 70, density: 70, potency: 70, rarity: 70 }),
    quantity: 8,
    marketState: { planetId: "planet-beta", itemId: "hydrogen-gas", currentPrice: 4, basePrice: 4 } as PlanetMarketState,
    wallet: { playerId: "seller-2", credits: 0 } as Wallet,
    sellerPlayerId: "seller-2",
  },
];
const sellToMarketCases = sellToMarketSubjects.map((s) => ({
  itemInstance: serializeInstance(s.itemInstance),
  quantity: s.quantity,
  marketState: s.marketState,
  wallet: s.wallet,
  sellerPlayerId: s.sellerPlayerId,
  expectedResult: sellToMarket(s.itemInstance, s.quantity, s.marketState, s.wallet, s.sellerPlayerId),
}));

const sellToGlobalMarketSubjects = [
  {
    itemInstance: makeInstance(findRealResource("igneous-ore"), 6, { purity: 55, density: 55, potency: 55, durability: 55, rarity: 55 }),
    quantity: 6,
    marketStates: globalPriceMarketStates,
    wallet: { playerId: "seller-1", credits: 50 } as Wallet,
    sellerPlayerId: "seller-1",
  },
];
const sellToGlobalMarketCases = sellToGlobalMarketSubjects.map((s) => ({
  itemInstance: serializeInstance(s.itemInstance),
  quantity: s.quantity,
  marketStates: s.marketStates,
  wallet: s.wallet,
  sellerPlayerId: s.sellerPlayerId,
  expectedResult: sellToGlobalMarket(s.itemInstance, s.quantity, s.marketStates, s.wallet, s.sellerPlayerId),
}));

const expireListingsSubjects: Listing[] = [
  { id: "e1", itemId: "igneous-ore", quantity: 4, pricePerUnit: 5, marketTier: "White", location: "global", createdByPlayerId: "seller-1", createdAt: 0, expiresAt: 500 }, // expired, global, non-zero -> returned to inventory
  { id: "e2", itemId: "igneous-ore", quantity: 3, pricePerUnit: 5, marketTier: "White", location: { planetId: "planet-alpha" }, createdByPlayerId: "seller-2", createdAt: 0, expiresAt: 500 }, // expired, planet, non-zero -> planet-pickup
  { id: "e3", itemId: "igneous-ore", quantity: 0, pricePerUnit: 5, marketTier: "White", location: "global", createdByPlayerId: "seller-3", createdAt: 0, expiresAt: 500 }, // expired but sold out -> nothing returned
  { id: "e4", itemId: "igneous-ore", quantity: 5, pricePerUnit: 5, marketTier: "White", location: "global", createdByPlayerId: "seller-4", createdAt: 0, expiresAt: 1_500 }, // not yet expired
];
const expireListingsCurrentTime = 1000;
const expireListingsCases = [
  {
    listings: expireListingsSubjects.map(serializeListing),
    currentTimeMs: expireListingsCurrentTime,
    expectedResult: expireListings(expireListingsSubjects, expireListingsCurrentTime),
  },
];

// ---- Sub-Phase C (Crew) cases. Real content resources/recipes for the
// craft-touching functions (AssignToCraft/ResolveBackgroundCrafting);
// hand-built crew/wallet/capacity fixtures elsewhere, since none of that
// data comes from the content catalog. ----
function serializeCrewMember(member: CrewMember): Record<string, unknown> {
  return {
    id: member.id,
    hiredByPlayerId: member.hiredByPlayerId,
    tier: member.tier,
    profession: member.profession,
    status: member.status,
    assignedCraftId: member.assignedCraftId,
    hiredAt: member.hiredAt,
    lastCheckedAt: member.lastCheckedAt,
    wageAmount: member.wageAmount,
    lastPaidAt: member.lastPaidAt,
    unavailableUntil: member.unavailableUntil ?? null,
    shipRole: member.shipRole ?? null,
    assignedShipId: member.assignedShipId ?? null,
  };
}

function crewMemberFixture(overrides: Partial<CrewMember>): CrewMember {
  return {
    id: "crew-1",
    hiredByPlayerId: "player-1",
    tier: "White",
    profession: null,
    status: "idle",
    assignedCraftId: null,
    hiredAt: 0,
    lastCheckedAt: 0,
    wageAmount: 10,
    lastPaidAt: 0,
    ...overrides,
  };
}

const hireCrewSubjects: Array<{
  label: string;
  candidate: CrewCandidate;
  pool: PlanetCrewPool;
  capacity: CrewCapacity;
  existingCrew: CrewMember[];
  wallet: Wallet;
  playerId: string;
  now: number;
}> = [
  {
    label: "successful-hire",
    candidate: { id: "candidate-1", tier: "White", profession: null },
    pool: { planetId: "planet-alpha", availableHires: [{ id: "candidate-1", tier: "White", profession: null }], lastRefreshedAt: 0 },
    capacity: { playerId: "player-1", baseCapacity: 2, purchasedSlots: 0 },
    existingCrew: [],
    wallet: { playerId: "player-1", credits: 1000 },
    playerId: "player-1",
    now: 1_000_000,
  },
  {
    label: "rejected-not-in-pool",
    candidate: { id: "candidate-missing", tier: "White", profession: null },
    pool: { planetId: "planet-alpha", availableHires: [{ id: "candidate-1", tier: "White", profession: null }], lastRefreshedAt: 0 },
    capacity: { playerId: "player-1", baseCapacity: 2, purchasedSlots: 0 },
    existingCrew: [],
    wallet: { playerId: "player-1", credits: 1000 },
    playerId: "player-1",
    now: 1_000_000,
  },
  {
    label: "rejected-at-capacity",
    candidate: { id: "candidate-1", tier: "White", profession: null },
    pool: { planetId: "planet-alpha", availableHires: [{ id: "candidate-1", tier: "White", profession: null }], lastRefreshedAt: 0 },
    capacity: { playerId: "player-1", baseCapacity: 1, purchasedSlots: 0 },
    existingCrew: [crewMemberFixture({ id: "crew-existing" })],
    wallet: { playerId: "player-1", credits: 1000 },
    playerId: "player-1",
    now: 1_000_000,
  },
  {
    label: "rejected-insufficient-funds",
    candidate: { id: "candidate-1", tier: "Gold", profession: null },
    pool: { planetId: "planet-alpha", availableHires: [{ id: "candidate-1", tier: "Gold", profession: null }], lastRefreshedAt: 0 },
    capacity: { playerId: "player-1", baseCapacity: 2, purchasedSlots: 0 },
    existingCrew: [],
    wallet: { playerId: "player-1", credits: 10 },
    playerId: "player-1",
    now: 1_000_000,
  },
];
const hireCrewCases = hireCrewSubjects.map((s) => {
  const result = hireCrew(s.candidate, s.pool, s.capacity, s.existingCrew, s.wallet, s.playerId, s.now);
  return {
    label: s.label,
    candidate: s.candidate,
    pool: s.pool,
    capacity: s.capacity,
    existingCrew: s.existingCrew.map(serializeCrewMember),
    wallet: s.wallet,
    playerId: s.playerId,
    nowMs: s.now,
    expectedResult: result.hired
      ? { hired: true, crewMember: serializeCrewMember(result.crewMember), updatedPool: result.updatedPool, updatedWallet: result.updatedWallet }
      : { hired: false, reason: result.reason },
  };
});

const dismissCrewSubjects = [
  { label: "owner-dismisses", crewMember: crewMemberFixture({ hiredByPlayerId: "player-1" }), playerId: "player-1" },
  { label: "non-owner-rejected", crewMember: crewMemberFixture({ hiredByPlayerId: "player-1" }), playerId: "player-2" },
];
const dismissCrewCases = dismissCrewSubjects.map((s) => ({
  label: s.label,
  crewMember: serializeCrewMember(s.crewMember),
  playerId: s.playerId,
  expectedResult: dismissCrew(s.crewMember, s.playerId),
}));

const payUpkeepSubjects = [
  { label: "not-due", crewMember: crewMemberFixture({ lastPaidAt: 0, wageAmount: 10 }), wallet: { playerId: "player-1", credits: 100 } as Wallet, now: 1 * 60 * 60 * 1000 },
  { label: "paid", crewMember: crewMemberFixture({ lastPaidAt: 0, wageAmount: 10 }), wallet: { playerId: "player-1", credits: 100 } as Wallet, now: 25 * 60 * 60 * 1000 },
  { label: "insufficient-funds", crewMember: crewMemberFixture({ lastPaidAt: 0, wageAmount: 10 }), wallet: { playerId: "player-1", credits: 1 } as Wallet, now: 25 * 60 * 60 * 1000 },
];
const payUpkeepCases = payUpkeepSubjects.map((s) => {
  const result = payUpkeep(s.crewMember, s.wallet, s.now);
  return {
    label: s.label,
    crewMember: serializeCrewMember(s.crewMember),
    wallet: s.wallet,
    nowMs: s.now,
    expectedResult: result.status === "paid"
      ? { status: "paid", updatedCrewMember: serializeCrewMember(result.updatedCrewMember), updatedWallet: result.updatedWallet }
      : { status: result.status },
  };
});

const checkAttritionSubjects = [
  { label: "within-grace-period", crewMember: crewMemberFixture({ lastPaidAt: 0 }), now: 24 * 60 * 60 * 1000 },
  { label: "exactly-at-grace-period-boundary", crewMember: crewMemberFixture({ lastPaidAt: 0 }), now: 48 * 60 * 60 * 1000 },
  { label: "past-grace-period", crewMember: crewMemberFixture({ lastPaidAt: 0 }), now: 49 * 60 * 60 * 1000 },
];
const checkAttritionCases = checkAttritionSubjects.map((s) => ({
  label: s.label,
  crewMember: serializeCrewMember(s.crewMember),
  nowMs: s.now,
  expectedResult: checkAttrition(s.crewMember, s.now),
}));

const purchaseCapacitySubjects = [
  { label: "slot-0-sufficient-funds", capacity: { playerId: "player-1", baseCapacity: 2, purchasedSlots: 0 } as CrewCapacity, wallet: { playerId: "player-1", credits: 1000 } as Wallet },
  { label: "slot-2-sufficient-funds", capacity: { playerId: "player-1", baseCapacity: 2, purchasedSlots: 2 } as CrewCapacity, wallet: { playerId: "player-1", credits: 3000 } as Wallet },
  { label: "insufficient-funds", capacity: { playerId: "player-1", baseCapacity: 2, purchasedSlots: 0 } as CrewCapacity, wallet: { playerId: "player-1", credits: 1 } as Wallet },
];
const purchaseCapacityCases = purchaseCapacitySubjects.map((s) => {
  const result = purchaseCapacity(s.capacity, s.wallet);
  return {
    label: s.label,
    capacity: s.capacity,
    wallet: s.wallet,
    expectedResult: result.purchased
      ? { purchased: true, updatedCapacity: result.updatedCapacity, updatedWallet: result.updatedWallet }
      : { purchased: false, reason: result.reason },
  };
});

const refreshCrewPoolSubjects = [
  { planetId: "planet-alpha", seed: "crew-pool-seed-1", now: 1_000_000 },
  { planetId: "planet-beta", seed: "crew-pool-seed-2", now: 2_000_000 },
  { planetId: "planet-gamma", seed: "crew-pool-seed-3", now: 3_000_000 },
];
const refreshCrewPoolCases = refreshCrewPoolSubjects.map((s) => ({
  planetId: s.planetId,
  seed: s.seed,
  nowMs: s.now,
  expectedResult: refreshCrewPool(s.planetId, s.seed, s.now),
}));

const assignToCraftSubjects = [
  {
    label: "gold-crew-blue-schematic",
    crewMember: crewMemberFixture({ tier: "Gold" }),
    craftAction: {
      id: "craft-1",
      inputs: [
        makeInstance(radiantAlloyBar, 1, { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 }),
        makeInstance(hydrogenGas, 1, { purity: 60, density: 60, potency: 60, rarity: 60 }),
      ],
      recipe: ionForgedHullPlateRecipe,
      schematicTier: "Blue" as TierColor,
    } as CraftAction,
  },
  {
    label: "grey-crew-white-schematic",
    crewMember: crewMemberFixture({ tier: "Grey" }),
    craftAction: {
      id: "craft-2",
      inputs: [
        makeInstance(radiantAlloyBar, 1, { purity: 40, density: 40, potency: 40, durability: 40, rarity: 40 }),
        makeInstance(hydrogenGas, 1, { purity: 40, density: 40, potency: 40, rarity: 40 }),
      ],
      recipe: ionForgedHullPlateRecipe,
      schematicTier: "White" as TierColor,
    } as CraftAction,
  },
];
const assignToCraftCases = assignToCraftSubjects.map((s) => {
  const sequence = randomSequence();
  const result = assignToCraft(s.crewMember, s.craftAction, queueRandom([...sequence]));
  return {
    label: s.label,
    crewMember: serializeCrewMember(s.crewMember),
    craftAction: {
      id: s.craftAction.id,
      inputs: s.craftAction.inputs.map(serializeInstance),
      recipeId: s.craftAction.recipe.id,
      schematicTier: s.craftAction.schematicTier,
    },
    randomSequence: sequence,
    expectedResult: result.assigned
      ? {
          assigned: true,
          updatedCrewMember: serializeCrewMember(result.updatedCrewMember),
          craftResult: result.craftResult.accepted
            ? { accepted: true, qualities: serializeQualityRoll(result.craftResult.qualities) }
            : { accepted: false, reason: result.craftResult.reason },
        }
      : { assigned: false, reason: result.reason },
  };
});

const backgroundCraftAction: CraftAction = {
  id: "background-craft-1",
  inputs: [
    makeInstance(radiantAlloyBar, 1, { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 }),
    makeInstance(hydrogenGas, 1, { purity: 60, density: 60, potency: 60, rarity: 60 }),
  ],
  recipe: ionForgedHullPlateRecipe,
  schematicTier: "Blue",
};
const resolveBackgroundCraftingSubjects: Array<{
  label: string;
  crewMember: CrewMember;
  now: number;
  backgroundRateOmitted: boolean;
  backgroundRate?: number | null;
  maxUnits?: number;
}> = [
  { label: "omitted-rate-uses-config-default", crewMember: crewMemberFixture({ tier: "Blue", lastCheckedAt: 0 }), now: 6 * 60 * 60 * 1000, backgroundRateOmitted: true },
  { label: "explicit-null-rate-unavailable", crewMember: crewMemberFixture({ tier: "Blue", lastCheckedAt: 0 }), now: 6 * 60 * 60 * 1000, backgroundRateOmitted: false, backgroundRate: null },
  { label: "max-units-caps-below-elapsed-derived-count", crewMember: crewMemberFixture({ tier: "Blue", lastCheckedAt: 0 }), now: 6 * 60 * 60 * 1000, backgroundRateOmitted: false, backgroundRate: 0.5, maxUnits: 1 },
  { label: "zero-elapsed-time", crewMember: crewMemberFixture({ tier: "Blue", lastCheckedAt: 1_000 }), now: 1_000, backgroundRateOmitted: false, backgroundRate: 0.5 },
];
const resolveBackgroundCraftingCases = resolveBackgroundCraftingSubjects.map((s) => {
  const sequence = randomSequence();
  const random = queueRandom([...sequence]);
  const result = s.backgroundRateOmitted
    ? resolveBackgroundCrafting(s.crewMember, backgroundCraftAction, s.now, undefined, random, s.maxUnits)
    : resolveBackgroundCrafting(s.crewMember, backgroundCraftAction, s.now, s.backgroundRate, random, s.maxUnits);
  return {
    label: s.label,
    crewMember: serializeCrewMember(s.crewMember),
    nowMs: s.now,
    backgroundRateOmitted: s.backgroundRateOmitted,
    backgroundRate: s.backgroundRate ?? null,
    maxUnits: s.maxUnits ?? null,
    randomSequence: sequence,
    expectedResult: result.resolved
      ? {
          resolved: true,
          unitsCompleted: result.unitsCompleted,
          results: result.results.map((r) =>
            r.accepted ? { accepted: true, qualities: serializeQualityRoll(r.qualities) } : { accepted: false, reason: r.reason },
          ),
          updatedCrewMember: serializeCrewMember(result.updatedCrewMember),
        }
      : { resolved: false, reason: result.reason, updatedCrewMember: serializeCrewMember(result.updatedCrewMember) },
  };
});

// ---- Sub-Phase D (Ships & Travel, incl. Scanner/Combat/Encounters)
// cases. Real generated galaxy planets (real positions, so real
// distances/travel-times/fuel-costs are exercised, not synthetic
// coordinates), real content resources (discovery-encounter rolls);
// hand-built ship/crew/pool fixtures elsewhere, since none of that data
// comes from the content catalog. ----
const shipsParityGalaxy = generateGalaxy(5, realResources, "ships-parity-galaxy-seed");
const shipsPlanetA: Planet = { ...shipsParityGalaxy.planets[0]!, discovered: true };
const shipsPlanetB: Planet = { ...shipsParityGalaxy.planets[1]!, discovered: true };

function shipComponent(id: string, category: ComponentCategory, tier: TierColor, value: number): ShipComponent {
  return { id, category, qualities: { purity: value, density: value, potency: value, durability: value, rarity: value }, tier };
}

function shipFixture(overrides: Partial<Ship> = {}): Ship {
  return {
    id: "ship-1", name: "Test Ship", ownerId: "player-1", tier: "White", currentPlanetId: shipsPlanetA.id,
    fuelCapacity: 65, currentFuel: 65,
    components: {
      weapon: shipComponent("w1", "weapon", "White", 50),
      engine: shipComponent("e1", "engine", "White", 50),
      shield: shipComponent("s1", "shield", "White", 50),
      cargoHold: shipComponent("c1", "cargoHold", "White", 50),
    },
    ...overrides,
  };
}

function shipCrewMemberFixture(overrides: Partial<CrewMember> = {}): CrewMember {
  return {
    id: "crew-x", hiredByPlayerId: "player-1", tier: "White", profession: null, status: "idle",
    assignedCraftId: null, hiredAt: 0, lastCheckedAt: 0, wageAmount: 10, lastPaidAt: 0,
    ...overrides,
  };
}

const calculateDistanceCases = [
  { a: { x: 0, y: 0 }, b: { x: 3, y: 4 } },
  { a: shipsPlanetA.position!, b: shipsPlanetB.position! },
  { a: { x: -1000, y: -1000 }, b: { x: 1000, y: 1000 } },
].map((c) => ({ ...c, expectedDistance: calculateDistance(c.a, c.b) }));

const calculateTravelTimeSubjects = [
  { label: "no-pilot", ship: shipFixture(), pilot: null },
  { label: "gold-tier-ship", ship: shipFixture({ tier: "Gold" }), pilot: null },
  { label: "with-gold-pilot", ship: shipFixture(), pilot: shipCrewMemberFixture({ tier: "Gold" }) },
];
const calculateTravelTimeCases = calculateTravelTimeSubjects.map((s) => ({
  label: s.label,
  origin: { id: shipsPlanetA.id, position: shipsPlanetA.position },
  destination: { id: shipsPlanetB.id, position: shipsPlanetB.position },
  ship: s.ship,
  pilot: s.pilot,
  expectedTravelTimeMs: calculateTravelTime(shipsPlanetA, shipsPlanetB, s.ship, s.pilot),
}));

const calculateFuelCostCases = [{ origin: shipsPlanetA, destination: shipsPlanetB }].map((c) => ({
  origin: { id: c.origin.id, position: c.origin.position },
  destination: { id: c.destination.id, position: c.destination.position },
  expectedFuelCost: calculateFuelCost(c.origin, c.destination),
}));

const deriveFuelCapacityCases = TIERS.map((tier) => ({ tier, expectedCapacity: deriveFuelCapacity(tier) }));

const deriveShipTierSubjects = [
  { label: "zero-components", ship: shipFixture({ components: { weapon: null, engine: null, shield: null, cargoHold: null } }) },
  {
    label: "all-gold",
    ship: shipFixture({
      components: {
        weapon: shipComponent("w", "weapon", "Gold", 99), engine: shipComponent("e", "engine", "Gold", 99),
        shield: shipComponent("s", "shield", "Gold", 99), cargoHold: shipComponent("c", "cargoHold", "Gold", 99),
      },
    }),
  },
  {
    label: "mixed-tiers-one-null",
    ship: shipFixture({
      components: {
        weapon: shipComponent("w", "weapon", "Grey", 10), engine: shipComponent("e", "engine", "Gold", 99),
        shield: null, cargoHold: shipComponent("c", "cargoHold", "Blue", 80),
      },
    }),
  },
];
const deriveShipTierCases = deriveShipTierSubjects.map((s) => ({ label: s.label, ship: s.ship, expectedTier: deriveShipTier(s.ship) }));
const tierMidpointCases = TIERS.map((tier) => ({ tier, expectedMidpoint: tierMidpoint(tier) }));

const assembleShipCases = [
  { ship: shipFixture(), component: shipComponent("new-weapon", "weapon", "Gold", 99), slot: "weapon" as ComponentCategory },
].map((c) => ({ ship: c.ship, component: c.component, slot: c.slot, expectedShip: assembleShip(c.ship, c.component, c.slot) }));

const initiateVoyageSubjects = [
  {
    label: "normal-voyage",
    ship: shipFixture({ fuelCapacity: 1000, currentFuel: 1000 }),
    cargo: [] as VoyageCargoItem[],
    now: 1_000_000, id: "voyage-1", isRetreat: false, pilot: null as CrewMember | null,
  },
  {
    label: "retreat-voyage-skips-fuel-and-cargo-checks",
    ship: shipFixture({ fuelCapacity: 1000, currentFuel: 0 }),
    cargo: [{ itemId: "igneous-ore", quantity: 9999 }] as VoyageCargoItem[],
    now: 1_000_000, id: "voyage-2", isRetreat: true, pilot: null as CrewMember | null,
  },
];
const initiateVoyageCases = initiateVoyageSubjects.map((s) => {
  const originPlanet: Planet = { id: shipsPlanetA.id, position: shipsPlanetA.position } as Planet;
  const destinationPlanet: Planet = { id: shipsPlanetB.id, position: shipsPlanetB.position } as Planet;
  const result = initiateVoyage(s.ship, originPlanet, destinationPlanet, s.cargo, s.now, s.id, s.isRetreat, s.pilot);
  return {
    label: s.label, ship: s.ship, origin: originPlanet, destination: destinationPlanet,
    cargo: s.cargo, nowMs: s.now, id: s.id, isRetreat: s.isRetreat, pilot: s.pilot,
    expectedResult: result,
  };
});

const resolveArrivalSubjects = [
  {
    label: "not-yet-due",
    voyage: { id: "v1", shipId: "s1", originPlanetId: shipsPlanetA.id, destinationPlanetId: shipsPlanetB.id, departedAt: 0, arrivesAt: 1_000_000, cargo: [] } as Voyage,
    ship: shipFixture(),
    now: 500_000,
    destinationPlanet: undefined as Planet | undefined,
    resources: undefined as Resource[] | undefined,
  },
  {
    label: "resolved-with-encounter-resolution",
    voyage: { id: "v2", shipId: "s1", originPlanetId: shipsPlanetA.id, destinationPlanetId: shipsPlanetB.id, departedAt: 0, arrivesAt: 1_000, cargo: [] } as Voyage,
    ship: shipFixture(),
    now: 100_000,
    destinationPlanet: shipsPlanetB,
    resources: realResources,
  },
];
const resolveArrivalCases = resolveArrivalSubjects.map((s) => {
  const sequence = randomSequence(200);
  const result = resolveArrival(s.voyage, s.ship, s.now, s.destinationPlanet, s.resources, queueRandom([...sequence]));
  return {
    label: s.label, voyage: s.voyage, ship: s.ship, nowMs: s.now,
    destinationPlanet: s.destinationPlanet ? { id: s.destinationPlanet.id, producibleResourceIds: s.destinationPlanet.producibleResourceIds } : null,
    hasResources: s.resources !== undefined,
    randomSequence: sequence,
    expectedResult: result,
  };
});

const purchaseShipSubjects = [
  {
    label: "successful-purchase",
    candidate: { id: "sc1", name: "Ship-sc1", tier: "Blue", components: { weapon: null, engine: null, shield: null, cargoHold: null } } as ShipCandidate,
    pool: { planetId: "planet-alpha", availableShips: [] as ShipCandidate[], lastRefreshedAt: 0 } as ShipyardPool,
    wallet: { playerId: "player-1", credits: 100000 } as Wallet,
  },
  {
    label: "rejected-insufficient-funds",
    candidate: { id: "sc2", name: "Ship-sc2", tier: "Gold", components: { weapon: null, engine: null, shield: null, cargoHold: null } } as ShipCandidate,
    pool: { planetId: "planet-alpha", availableShips: [] as ShipCandidate[], lastRefreshedAt: 0 } as ShipyardPool,
    wallet: { playerId: "player-1", credits: 1 } as Wallet,
  },
  {
    label: "rejected-not-in-pool",
    candidate: { id: "sc-missing", name: "Ship-missing", tier: "White", components: { weapon: null, engine: null, shield: null, cargoHold: null } } as ShipCandidate,
    pool: { planetId: "planet-alpha", availableShips: [] as ShipCandidate[], lastRefreshedAt: 0 } as ShipyardPool,
    wallet: { playerId: "player-1", credits: 100000 } as Wallet,
  },
];
const purchaseShipCases = purchaseShipSubjects.map((s) => {
  const pool: ShipyardPool = s.label === "rejected-not-in-pool" ? s.pool : { ...s.pool, availableShips: [s.candidate] };
  return {
    label: s.label, candidate: s.candidate, pool, wallet: s.wallet,
    expectedResult: purchaseShip(s.candidate, pool, s.wallet, "player-1"),
  };
});

const purchaseScannerSubjects = [
  { label: "successful-purchase", candidate: { id: "scn1", tier: "Blue" } as ScannerCandidate, wallet: { playerId: "player-1", credits: 100000 } as Wallet },
  { label: "rejected-insufficient-funds", candidate: { id: "scn2", tier: "Gold" } as ScannerCandidate, wallet: { playerId: "player-1", credits: 1 } as Wallet },
];
const purchaseScannerCases = purchaseScannerSubjects.map((s) => {
  const pool: ScannerPool = { planetId: "planet-alpha", availableScanners: [s.candidate], lastRefreshedAt: 0 };
  return { label: s.label, candidate: s.candidate, pool, wallet: s.wallet, expectedResult: purchaseScanner(s.candidate, pool, s.wallet, "player-1") };
});

const refreshShipyardPoolCases = ["shipyard-seed-1", "shipyard-seed-2"].map((seed) => ({
  planetId: "planet-alpha", seed, nowMs: 1_000_000,
  expectedResult: refreshShipyardPool("planet-alpha", seed, 1_000_000),
}));

const refreshScannerPoolCases = ["scanner-pool-seed-1", "scanner-pool-seed-2"].map((seed) => ({
  planetId: "planet-alpha", seed, nowMs: 1_000_000,
  expectedResult: refreshScannerPool("planet-alpha", seed, 1_000_000),
}));

const refuelShipSubjects = [
  { label: "successful-no-discount", ship: shipFixture({ fuelCapacity: 100, currentFuel: 0 }), wallet: { playerId: "player-1", credits: 1000 } as Wallet, amount: 20, dockedPlanet: null as Planet | null },
  {
    label: "successful-with-citadel-level-2-discount",
    ship: shipFixture({ fuelCapacity: 100, currentFuel: 0, ownerId: "player-1" }),
    wallet: { playerId: "player-1", credits: 1000 } as Wallet,
    amount: 20,
    dockedPlanet: { id: shipsPlanetA.id, name: shipsPlanetA.name, producibleResourceIds: [], ownedByPlayerId: "player-1", citadelLevel: 2 } as Planet,
  },
  { label: "rejected-non-positive-amount", ship: shipFixture(), wallet: { playerId: "player-1", credits: 1000 } as Wallet, amount: 0, dockedPlanet: null as Planet | null },
  { label: "rejected-exceeds-capacity", ship: shipFixture({ fuelCapacity: 65, currentFuel: 60 }), wallet: { playerId: "player-1", credits: 1000 } as Wallet, amount: 10, dockedPlanet: null as Planet | null },
];
const refuelShipCases = refuelShipSubjects.map((s) => ({
  label: s.label, ship: s.ship, wallet: s.wallet, amount: s.amount, dockedPlanet: s.dockedPlanet,
  expectedResult: refuelShip(s.ship, s.wallet, s.amount, s.dockedPlanet),
}));

const getCrewSlotsForShipCases = TIERS.map((tier) => {
  const ship = shipFixture({
    components: {
      weapon: shipComponent("w", "weapon", tier, 50), engine: shipComponent("e", "engine", tier, 50),
      shield: shipComponent("s", "shield", tier, 50), cargoHold: shipComponent("c", "cargoHold", tier, 50),
    },
  });
  return { tier, ship, expectedResult: getCrewSlotsForShip(ship) };
});

const assignToShipRoleSubjects = [
  { label: "successful-pilot-assignment", crewMember: shipCrewMemberFixture({ id: "pilot-1" }), ship: shipFixture({ tier: "Gold" }), role: "Pilot" as ShipCrewRole, currentRoster: [] as CrewMember[] },
  { label: "rejected-crafter-without-profession", crewMember: shipCrewMemberFixture({ id: "crafter-1", profession: null }), ship: shipFixture({ tier: "Gold" }), role: "Crafter" as ShipCrewRole, currentRoster: [] as CrewMember[] },
  {
    label: "rejected-slot-full",
    crewMember: shipCrewMemberFixture({ id: "pilot-2" }),
    ship: shipFixture({ tier: "Grey", id: "grey-ship" }),
    role: "Pilot" as ShipCrewRole,
    currentRoster: [shipCrewMemberFixture({ id: "existing-pilot", shipRole: "Pilot", assignedShipId: "grey-ship" })] as CrewMember[],
  },
];
const assignToShipRoleCases = assignToShipRoleSubjects.map((s) => ({
  label: s.label, crewMember: s.crewMember, ship: s.ship, role: s.role, currentRoster: s.currentRoster,
  expectedResult: assignToShipRole(s.crewMember, s.ship, s.role, s.currentRoster),
}));

const unassignFromShipRoleSubjects = [
  { label: "successful-unassign", crewMember: shipCrewMemberFixture({ shipRole: "Pilot", assignedShipId: "ship-1" }) },
  { label: "rejected-nothing-to-unassign", crewMember: shipCrewMemberFixture() },
];
const unassignFromShipRoleCases = unassignFromShipRoleSubjects.map((s) => ({
  label: s.label, crewMember: s.crewMember, expectedResult: unassignFromShipRole(s.crewMember),
}));

const resolveComponentRepairSubjects = [
  {
    label: "systems-engineer-repairs-while-docked",
    ship: shipFixture({ tier: "White", lastRepairedAt: 0, components: { weapon: shipComponent("w", "weapon", "White", 50), engine: null, shield: null, cargoHold: null } }),
    ownedCrew: [shipCrewMemberFixture({ id: "se1", tier: "Gold", shipRole: "Systems Engineer", assignedShipId: "ship-1" })],
    activeVoyage: null as Voyage | null,
    dockedPlanet: null as Planet | null,
    now: 10 * 60 * 60 * 1000,
  },
  {
    label: "crafter-repairs-only-while-traveling",
    ship: shipFixture({
      tier: "White", lastRepairedAt: 0,
      components: { weapon: shipComponent("w", "weapon", "White", 50), engine: null, shield: null, cargoHold: null },
    }),
    ownedCrew: [shipCrewMemberFixture({ id: "cr1", tier: "Gold", profession: "Weaponsmith", shipRole: "Crafter", assignedShipId: "ship-1" })],
    activeVoyage: { id: "v1", shipId: "ship-1", originPlanetId: "a", destinationPlanetId: "b", departedAt: 0, arrivesAt: 100000, cargo: [] } as Voyage,
    dockedPlanet: null as Planet | null,
    now: 10 * 60 * 60 * 1000,
  },
];
const resolveComponentRepairCases = resolveComponentRepairSubjects.map((s) => ({
  label: s.label, ship: s.ship, ownedCrew: s.ownedCrew, activeVoyage: s.activeVoyage, dockedPlanet: s.dockedPlanet, nowMs: s.now,
  expectedResult: resolveComponentRepair(s.ship, s.ownedCrew, s.activeVoyage, s.dockedPlanet, s.now),
}));

const performScanSubjects = [
  {
    label: "discovers-nearby-planets",
    ship: shipFixture({ currentPlanetId: shipsPlanetA.id }),
    dockedPlanet: shipsPlanetA,
    ownedScanners: [{ id: "scn1", tier: "Grey", ownerId: "player-1" } as Scanner],
    allPlanets: shipsParityGalaxy.planets.map((p) => (p.id === shipsPlanetA.id ? { ...p, discovered: true } : { ...p, discovered: false })),
  },
  {
    label: "rejected-no-scanner-owned",
    ship: shipFixture({ currentPlanetId: shipsPlanetA.id }),
    dockedPlanet: shipsPlanetA,
    ownedScanners: [] as Scanner[],
    allPlanets: shipsParityGalaxy.planets,
  },
];
const performScanCases = performScanSubjects.map((s) => ({
  label: s.label, ship: s.ship, dockedPlanet: s.dockedPlanet, ownedScanners: s.ownedScanners,
  // Full planet objects (id/position/discovered are all PerformScan
  // reads), not just ids -- the C# side must reconstruct the exact same
  // input list to call the real function itself, not merely compare
  // against a recorded output with nothing to feed it.
  allPlanets: s.allPlanets.map((p) => ({ id: p.id, position: p.position, discovered: p.discovered })),
  expectedResult: performScan(s.ship, s.dockedPlanet, s.ownedScanners, s.allPlanets),
}));

const initiateCombatCases = [
  { id: "combat-1", voyageId: "v1", triggerContext: "travel" as const, windowIndex: 0 as number | null },
  { id: "combat-2", voyageId: "v2", triggerContext: "arrival" as const, windowIndex: null as number | null },
].map((c) => {
  const sequence = randomSequence(5);
  return { ...c, randomSequence: sequence, expectedResult: initiateCombat(c.id, c.voyageId, c.triggerContext, c.windowIndex, queueRandom([...sequence])) };
});

const resolveEncountersSubjects = [
  {
    label: "normal-voyage-encounters",
    voyage: { id: "v1", shipId: "ship-1", originPlanetId: shipsPlanetA.id, destinationPlanetId: shipsPlanetB.id, departedAt: 0, arrivesAt: 48 * 60 * 60 * 1000, cargo: [] } as Voyage,
    ship: shipFixture(),
    destinationPlanet: shipsPlanetB,
  },
  {
    label: "retreat-voyage-never-rolls",
    voyage: { id: "v2", shipId: "ship-1", originPlanetId: shipsPlanetA.id, destinationPlanetId: shipsPlanetB.id, departedAt: 0, arrivesAt: 48 * 60 * 60 * 1000, cargo: [], isRetreat: true } as Voyage,
    ship: shipFixture(),
    destinationPlanet: shipsPlanetB,
  },
];
const resolveEncountersCases = resolveEncountersSubjects.map((s) => {
  const sequence = randomSequence(300);
  return {
    label: s.label, voyage: s.voyage, ship: s.ship,
    // id + producibleResourceIds is everything ResolveEncounters reads
    // off destinationPlanet -- the C# side reconstructs a real Planet
    // from just these two fields to call the real function itself.
    destinationPlanet: { id: s.destinationPlanet.id, producibleResourceIds: s.destinationPlanet.producibleResourceIds },
    randomSequence: sequence,
    expectedResult: resolveEncounters(s.voyage, s.ship, s.destinationPlanet, realResources, queueRandom([...sequence])),
  };
});

const resolveCombatChoiceSubjects = [
  {
    label: "flee",
    encounter: { id: "ce1", voyageId: "v1", triggerContext: "travel" as const, opponentThreatTier: "Gold" as TierColor, status: "pending" as const, outcome: null, windowIndex: 0 } as CombatEncounter,
    choice: "flee" as const,
    ship: shipFixture(),
    ownedCrew: [] as CrewMember[],
  },
  {
    label: "attack-and-win",
    encounter: { id: "ce2", voyageId: "v2", triggerContext: "travel" as const, opponentThreatTier: "Grey" as TierColor, status: "pending" as const, outcome: null, windowIndex: 0 } as CombatEncounter,
    choice: "attack" as const,
    ship: shipFixture({ tier: "Gold", components: { weapon: shipComponent("w", "weapon", "Gold", 99), engine: null, shield: null, cargoHold: null } }),
    ownedCrew: [] as CrewMember[],
  },
  {
    label: "attack-and-lose-with-combat-engineer-mitigation",
    encounter: { id: "ce3", voyageId: "v3", triggerContext: "travel" as const, opponentThreatTier: "Gold" as TierColor, status: "pending" as const, outcome: null, windowIndex: 0 } as CombatEncounter,
    choice: "attack" as const,
    ship: shipFixture({ tier: "Grey", components: { weapon: shipComponent("w", "weapon", "Grey", 10), engine: null, shield: null, cargoHold: null } }),
    ownedCrew: [shipCrewMemberFixture({ id: "ce-1", tier: "Gold", shipRole: "Combat Engineer", assignedShipId: "ship-1" })] as CrewMember[],
  },
];
const resolveCombatChoiceCases = resolveCombatChoiceSubjects.map((s) => {
  const sequence = randomSequence(10);
  const originPlanet: Planet = { id: shipsPlanetA.id, position: shipsPlanetA.position } as Planet;
  const currentPlanet: Planet = { id: shipsPlanetB.id, position: shipsPlanetB.position } as Planet;
  const result = resolveCombatChoice(s.encounter, s.choice, { id: s.encounter.voyageId, shipId: "ship-1", originPlanetId: originPlanet.id, destinationPlanetId: currentPlanet.id, departedAt: 0, arrivesAt: 1000, cargo: [] }, s.ship, originPlanet, currentPlanet, s.ownedCrew, 500_000, `${s.encounter.id}-retreat`, queueRandom([...sequence]));
  return {
    label: s.label, encounter: s.encounter, choice: s.choice, ship: s.ship, ownedCrew: s.ownedCrew,
    // Real planets (with real positions), not just ids -- the C# side
    // needs these to reconstruct the same InitiateVoyage() call the
    // flee/lose retreat-voyage branches make internally, which requires
    // both planets to have a generated position.
    originPlanet: { id: originPlanet.id, position: originPlanet.position },
    currentPlanet: { id: currentPlanet.id, position: currentPlanet.position },
    randomSequence: sequence, retreatVoyageId: `${s.encounter.id}-retreat`, nowMs: 500_000,
    expectedResult: result,
  };
});

const output = {
  generatedAt: new Date().toISOString(),
  tierColorCases,
  rollQualityCases,
  refineCases,
  craftCases,
  galaxyCases,
  planetResourceCycleCases,
  gcprCases,
  createListingCases,
  applyDriftCases,
  applyRecoveryCases,
  seasonCases,
  emergencyCases,
  globalPriceCases,
  purchaseListingCases,
  sellToMarketCases,
  sellToGlobalMarketCases,
  expireListingsCases,
  hireCrewCases,
  dismissCrewCases,
  payUpkeepCases,
  checkAttritionCases,
  purchaseCapacityCases,
  refreshCrewPoolCases,
  assignToCraftCases,
  resolveBackgroundCraftingCases,
  calculateDistanceCases,
  calculateTravelTimeCases,
  calculateFuelCostCases,
  deriveFuelCapacityCases,
  deriveShipTierCases,
  tierMidpointCases,
  assembleShipCases,
  initiateVoyageCases,
  resolveArrivalCases,
  purchaseShipCases,
  purchaseScannerCases,
  refreshShipyardPoolCases,
  refreshScannerPoolCases,
  refuelShipCases,
  getCrewSlotsForShipCases,
  assignToShipRoleCases,
  unassignFromShipRoleCases,
  resolveComponentRepairCases,
  performScanCases,
  initiateCombatCases,
  resolveEncountersCases,
  resolveCombatChoiceCases,
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outPath = join(scriptDir, "..", "unity", "parity", "ts-parity-results.json");
writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`Wrote ${outPath}`);
console.log(
  `  tierColor: ${tierColorCases.length}, rollQuality: ${rollQualityCases.length}, ` +
    `refine: ${refineCases.length}, craft: ${craftCases.length}, galaxy: ${galaxyCases.length}, ` +
    `planetResourceCycle: ${planetResourceCycleCases.length}, gcpr: ${gcprCases.length}, ` +
    `createListing: ${createListingCases.length}, applyDrift: ${applyDriftCases.length}, ` +
    `applyRecovery: ${applyRecoveryCases.length}, season: ${seasonCases.length}, ` +
    `emergency: ${emergencyCases.length}, globalPrice: ${globalPriceCases.length}, ` +
    `purchaseListing: ${purchaseListingCases.length}, sellToMarket: ${sellToMarketCases.length}, ` +
    `sellToGlobalMarket: ${sellToGlobalMarketCases.length}, expireListings: ${expireListingsCases.length}, ` +
    `hireCrew: ${hireCrewCases.length}, dismissCrew: ${dismissCrewCases.length}, ` +
    `payUpkeep: ${payUpkeepCases.length}, checkAttrition: ${checkAttritionCases.length}, ` +
    `purchaseCapacity: ${purchaseCapacityCases.length}, refreshCrewPool: ${refreshCrewPoolCases.length}, ` +
    `assignToCraft: ${assignToCraftCases.length}, resolveBackgroundCrafting: ${resolveBackgroundCraftingCases.length}, ` +
    `calculateDistance: ${calculateDistanceCases.length}, calculateTravelTime: ${calculateTravelTimeCases.length}, ` +
    `calculateFuelCost: ${calculateFuelCostCases.length}, deriveFuelCapacity: ${deriveFuelCapacityCases.length}, ` +
    `deriveShipTier: ${deriveShipTierCases.length}, tierMidpoint: ${tierMidpointCases.length}, ` +
    `assembleShip: ${assembleShipCases.length}, initiateVoyage: ${initiateVoyageCases.length}, ` +
    `resolveArrival: ${resolveArrivalCases.length}, purchaseShip: ${purchaseShipCases.length}, ` +
    `purchaseScanner: ${purchaseScannerCases.length}, refreshShipyardPool: ${refreshShipyardPoolCases.length}, ` +
    `refreshScannerPool: ${refreshScannerPoolCases.length}, refuelShip: ${refuelShipCases.length}, ` +
    `getCrewSlotsForShip: ${getCrewSlotsForShipCases.length}, assignToShipRole: ${assignToShipRoleCases.length}, ` +
    `unassignFromShipRole: ${unassignFromShipRoleCases.length}, resolveComponentRepair: ${resolveComponentRepairCases.length}, ` +
    `performScan: ${performScanCases.length}, initiateCombat: ${initiateCombatCases.length}, ` +
    `resolveEncounters: ${resolveEncountersCases.length}, resolveCombatChoice: ${resolveCombatChoiceCases.length}`,
);
