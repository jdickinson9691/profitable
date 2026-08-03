import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadContent } from "../../src/simulation/loadContent.ts";
import { craft } from "../../src/simulation/craft.ts";
import { refine } from "../../src/simulation/refine.ts";
import { computeAggregateTier } from "../../src/simulation/aggregateTier.ts";
import { generateGalaxy } from "../../src/galaxy/generateGalaxy.ts";
import { loadTradingContent } from "../../src/trading/loadTradingContent.ts";
import { purchaseListing } from "../../src/trading/purchaseListing.ts";
import { createListing } from "../../src/trading/createListing.ts";
import { hireCrew } from "../../src/crew/hireCrew.ts";
import { loadShipsContent } from "../../src/ships/loadShipsContent.ts";
import { refreshShipyardPool } from "../../src/ships/refreshShipyardPool.ts";
import { purchaseShip } from "../../src/ships/purchaseShip.ts";
import { assembleShip } from "../../src/ships/assembleShip.ts";
import { deriveShipTier } from "../../src/ships/deriveShipTier.ts";
import { calculateTravelTime } from "../../src/ships/calculateTravelTime.ts";
import { initiateVoyage } from "../../src/ships/initiateVoyage.ts";
import { resolveArrival } from "../../src/ships/resolveArrival.ts";
import { igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar } from "../fixtures/resources.ts";
import { makeInstance } from "../fixtures/instances.ts";
import { queueRandom } from "../fixtures/random.ts";
import { ionForgedHullPlateRecipe } from "../fixtures/recipes.ts";
import { DISTANCE_TO_TRAVEL_HOURS_PER_UNIT, SHIP_TIER_SPEED_MODIFIER } from "../../src/data/constants/shipsAndTravelConfig.ts";
import type { ResourceInstance } from "../../src/data/types/resourceInstance.ts";
import type { CraftAccepted } from "../../src/data/types/craftResult.ts";
import type { PurchaseShipSucceeded } from "../../src/data/types/purchaseShipResult.ts";
import type { PurchaseSucceeded } from "../../src/data/types/purchaseResult.ts";
import type { HireSucceeded } from "../../src/data/types/hireResult.ts";
import type { CrewCandidate } from "../../src/data/types/crewCandidate.ts";
import type { PlanetCrewPool } from "../../src/data/types/planetCrewPool.ts";
import type { CrewCapacity } from "../../src/data/types/crewCapacity.ts";
import type { Wallet } from "../../src/data/types/wallet.ts";
import type { Listing } from "../../src/data/types/listing.ts";
import type { ShipComponent } from "../../src/data/types/shipComponent.ts";
import type { ArrivalResolved } from "../../src/data/types/arrivalResult.ts";
import type { Resource } from "../../src/data/types/resource.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

// Agent 24 (Phase 5 Integration): verifies the full extended loop -- craft
// a component of every category -> purchase a ship from a generated
// planet's shipyard pool -> assemble the components -> confirm the derived
// tier -> compute a hand-verified travel time -> initiate and resolve a
// voyage -- end-to-end using real (non-mocked) data: the actual
// content/*.json files, a real generated galaxy, and the actual Agent 20
// ships/travel functions. Distinct from Agent 21's unit tests, which prove
// each function correct in isolation; this proves the real wiring between
// Phase 5 and everything before it has no gap, same spirit as Agents 7,
// 10, 15, and 19's own verifications.

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

const shipsContent = loadShipsContent({ componentRecipes: readJson("componentRecipes.json") });

test("full extended loop: craft one component per category -> purchase a ship -> assemble -> derived tier -> travel time -> initiate/resolve voyage, with real data throughout", () => {
  const galaxy = generateGalaxy(5, content.resources, "phase5-integration-full-loop");
  const [originPlanet, destinationPlanet] = galaxy.planets;
  assert.ok(originPlanet?.position && destinationPlanet?.position, "expected at least 2 generated planets with positions");

  // Step 1: purchase a ship from a real shipyard pool at the origin planet.
  const pool = refreshShipyardPool(originPlanet.id, "phase5-integration-pool-seed", 0);
  assert.equal(pool.availableShips.length, 3);
  let wallet: Wallet = { playerId: "player-1", credits: 20000 };

  const candidate = pool.availableShips[0]!;
  const purchase = purchaseShip(candidate, pool, wallet, "player-1") as PurchaseShipSucceeded;
  assert.equal(purchase.purchased, true);
  wallet = purchase.updatedWallet;
  let ship = purchase.ship;
  assert.equal(ship.currentPlanetId, originPlanet.id);

  // Step 2: craft and install one real component per category, using
  // Agent 23's actual componentRecipes.json link data and recipes.json
  // entries -- the same category-to-resource resolution CraftScene/
  // CrewScene already use.
  const qualities70 = { purity: 70, density: 70, potency: 70, durability: 70, rarity: 70 };
  for (const link of shipsContent.componentRecipes) {
    const recipe = content.recipes.find((r) => r.id === link.recipeId)!;
    assert.ok(recipe, `no recipe found for componentRecipes entry "${link.recipeId}"`);

    const inputs: ResourceInstance[] = recipe.inputs.map((slot) => {
      const resource = content.resources.find((r) => r.category === slot.category)!;
      assert.ok(resource, `no resource for category "${slot.category}"`);
      return makeInstance(resource, slot.quantity, qualities70);
    });

    const craftResult = craft(inputs, recipe, "Blue", "Green", queueRandom([0.5])) as CraftAccepted;
    assert.equal(craftResult.accepted, true, `craft() rejected recipe "${link.recipeId}"`);

    const tier = computeAggregateTier(craftResult.qualities);
    assert.notEqual(tier, null);
    const component: ShipComponent = {
      id: `component-${link.category}`,
      category: link.category,
      qualities: craftResult.qualities,
      tier: tier!,
    };

    ship = assembleShip(ship, component, link.category);
  }

  // Step 3: the ship's derived tier must reflect all 4 freshly-installed
  // components, recomputed by assembleShip() every call, never read off
  // the purchase-time candidate tier.
  assert.equal(ship.tier, deriveShipTier(ship));
  for (const category of ["weapon", "engine", "shield", "cargoHold"] as const) {
    assert.notEqual(ship.components[category], null);
  }

  // Step 4: hand-verified travel time -- the expected value is derived
  // independently here (raw Euclidean distance + the documented constants
  // multiplied by hand), not by calling calculateTravelTime() a second
  // time, so this is a genuine check against the formula, not a tautology.
  const dx = destinationPlanet.position!.x - originPlanet.position!.x;
  const dy = destinationPlanet.position!.y - originPlanet.position!.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speedModifier = SHIP_TIER_SPEED_MODIFIER.find((entry) => entry.tier === ship.tier)!.travelTimeMultiplier;
  const expectedTravelTimeMs = distance * DISTANCE_TO_TRAVEL_HOURS_PER_UNIT * speedModifier * MS_PER_HOUR;

  const actualTravelTimeMs = calculateTravelTime(originPlanet, destinationPlanet, ship);
  assert.equal(actualTravelTimeMs, expectedTravelTimeMs);

  // Step 5: initiate and resolve a real voyage; the ship's location only
  // updates on a successful resolveArrival(), never before.
  const departedAt = 0;
  const { voyage } = initiateVoyage(ship, originPlanet, destinationPlanet, [], departedAt, "voyage-full-loop");
  assert.equal(voyage.arrivesAt, departedAt + actualTravelTimeMs);

  const tooEarly = resolveArrival(voyage, ship, voyage.arrivesAt - 1);
  assert.equal(tooEarly.resolved, false);
  assert.equal(ship.currentPlanetId, originPlanet.id, "ship must not move before arrival time");

  const arrival = resolveArrival(voyage, ship, voyage.arrivesAt) as ArrivalResolved;
  assert.equal(arrival.resolved, true);
  assert.equal(arrival.updatedShip.currentPlanetId, destinationPlanet.id);
  assert.equal(arrival.destinationPlanetId, destinationPlanet.id);
});

test("Phase 3 remote tier 6-7 sale connection: the item travels via a real Voyage and becomes an active listing only after resolveArrival -- not before", () => {
  // No shipped MVP resource reaches tier 6-7 (max is Ion-Forged Hull Plate
  // at tier 3 -- see content/README.md's Phase 3 section), so this uses a
  // synthetic tier-6 fixture, same "construct the edge case directly"
  // approach tests/trading/createListing.test.ts's own tier 6/7 rejection
  // tests already use for the identical reason.
  const exoticArtifact: Resource = {
    id: "exotic-artifact",
    name: "Exotic Artifact",
    category: "artifact",
    applicableQualities: { purity: true, density: true, potency: true, durability: true, rarity: true },
    itemTier: 6,
  };
  const qualities = { purity: 90, density: 88, potency: 92, durability: 85, rarity: 95 };

  const galaxy = generateGalaxy(5, [...content.resources, exoticArtifact], "phase5-integration-remote-sale");
  const [originPlanet, destinationPlanet] = galaxy.planets;
  assert.ok(originPlanet?.position && destinationPlanet?.position);
  // Discovery is the gating requirement for a remote sale (design doc
  // §"Remote tier 6-7 sales") -- both ends must be discovered.
  const discoveredDestination = { ...destinationPlanet, discovered: true };

  const pool = refreshShipyardPool(originPlanet.id, "phase5-integration-remote-sale-pool", 0);
  const purchase = purchaseShip(pool.availableShips[0]!, pool, { playerId: "player-1", credits: 20000 }, "player-1") as PurchaseShipSucceeded;
  const ship = purchase.ship;

  // The item leaves inventory as real Voyage cargo -- not teleported, not
  // listed yet. Voyage.cargo only carries { itemId, quantity } (Agent 20's
  // own necessary-completion scope for that type), so the item's real
  // qualities are kept by the caller (this test, standing in for
  // Presentation/Integration) exactly as resolveArrival()'s own comment
  // says they must be -- the same "elsewhere" pattern tradingState.ts's
  // listingQualities side-table already uses for ordinary purchases.
  const cargo = [{ itemId: exoticArtifact.id, quantity: 1 }];
  const departedAt = 0;
  const { voyage } = initiateVoyage(ship, originPlanet, discoveredDestination, cargo, departedAt, "voyage-remote-sale");

  const activeListings: Listing[] = [];

  // Not before: resolving early is rejected outright, and -- structurally,
  // since nothing below this line has run yet -- no listing exists.
  const early = resolveArrival(voyage, ship, voyage.arrivesAt - 1);
  assert.equal(early.resolved, false);
  assert.equal(activeListings.length, 0);

  // Only after: resolveArrival() delivers the cargo, and only then does
  // the caller turn it into a real Listing via createListing() -- exactly
  // the division of responsibility resolveArrival()'s own comment
  // documents ("does NOT itself activate any Phase 3 Listing... the
  // caller is responsible").
  const arrival = resolveArrival(voyage, ship, voyage.arrivesAt) as ArrivalResolved;
  assert.equal(arrival.resolved, true);
  assert.deepEqual(arrival.cargo, cargo);

  const deliveredItem = arrival.cargo[0]!;
  const listing = createListing(
    makeInstance(exoticArtifact, deliveredItem.quantity, qualities),
    deliveredItem.quantity,
    500,
    { planetId: arrival.destinationPlanetId },
    "player-1",
    "listing-remote-sale",
    voyage.arrivesAt,
  );
  activeListings.push(listing);

  assert.equal(activeListings.length, 1);
  assert.deepEqual(listing.location, { planetId: destinationPlanet.id });
  assert.equal(listing.itemId, exoticArtifact.id);
  assert.equal(listing.createdAt, voyage.arrivesAt, "the listing only comes into existence at (or after) the arrival timestamp, never earlier");

  // A tier 6 item is correctly still rejected from the GLOBAL market --
  // the remote-sale path only ever targets a specific planet's market,
  // never bypasses the global tier restriction.
  assert.throws(() =>
    createListing(
      makeInstance(exoticArtifact, 1, qualities),
      1,
      500,
      "global",
      "player-1",
      "listing-remote-sale-global-attempt",
      voyage.arrivesAt,
    ),
  );
});

test("regression: the original MVP's, Phase 2's, Phase 3's, and Phase 4's hand-calculated cases still pass with zero deviation", () => {
  const refineInputs: ResourceInstance[] = [
    makeInstance(igneousOre, 2, { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 }),
    makeInstance(autuniteCrystal, 1, { density: 60, potency: 60, durability: 60, rarity: 60 }),
  ];
  const refineResult = refine(refineInputs, "Gold", queueRandom([0, 0.5, 0.5, 0.5]));
  assert.deepEqual(refineResult, {
    qualities: { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 },
    outputTier: "White",
    refundUnits: 0,
  });

  const craftInputs: ResourceInstance[] = [
    makeInstance(radiantAlloyBar, 1, { purity: 70, density: 70, potency: 70, durability: 70, rarity: 70 }),
    makeInstance(hydrogenGas, 1, { purity: 70, density: 70, potency: 70, rarity: 70 }),
  ];
  const craftResult = craft(craftInputs, ionForgedHullPlateRecipe, "Blue", "Green", queueRandom([1])) as CraftAccepted;
  assert.equal(craftResult.accepted, true);
  assert.deepEqual(craftResult.qualities, { purity: 79, density: 79, potency: 79, durability: 79, rarity: 79 });

  const galaxy = generateGalaxy(6, content.resources, "phase5-integration-regression-reproduce");
  const galaxyAgain = generateGalaxy(6, content.resources, "phase5-integration-regression-reproduce");
  assert.deepEqual(galaxy, galaxyAgain);

  const listing: Listing = {
    id: "listing-1",
    itemId: "igneous-ore",
    quantity: 10,
    pricePerUnit: 20,
    marketTier: "Blue",
    location: "global",
    createdByPlayerId: "seller-1",
    createdAt: 0,
    expiresAt: 1000,
  };
  const purchase = purchaseListing(listing, 5, "buyer-1", null) as PurchaseSucceeded;
  assert.equal(purchase.success, true);
  assert.equal(purchase.totalPaid, 100);
  assert.equal(purchase.feeDeducted, 5);
  assert.equal(purchase.proceedsToSeller, 95);

  const candidate: CrewCandidate = { id: "candidate-1", tier: "Blue", profession: null };
  const crewPool: PlanetCrewPool = { planetId: "delta-rigelus", availableHires: [candidate], lastRefreshedAt: 0 };
  const capacity: CrewCapacity = { playerId: "player-1", baseCapacity: 2, purchasedSlots: 0 };
  const hire = hireCrew(candidate, crewPool, capacity, [], { playerId: "player-1", credits: 1000 }, "player-1", 100) as HireSucceeded;
  assert.equal(hire.hired, true);
  assert.equal(hire.updatedWallet.credits, 1000 - 350);

  // Confirms tradingContent/shipsContent both still load correctly
  // alongside the MVP content-loading path (no shared-registry collision).
  assert.ok(tradingContent.tradingBasePrices.length > 0);
  assert.ok(shipsContent.componentRecipes.length > 0);
});
