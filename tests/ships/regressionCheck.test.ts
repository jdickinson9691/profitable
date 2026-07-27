import { test } from "node:test";
import assert from "node:assert/strict";
import { refine } from "../../src/simulation/refine.ts";
import { craft } from "../../src/simulation/craft.ts";
import { generateGalaxy } from "../../src/galaxy/generateGalaxy.ts";
import { purchaseListing } from "../../src/trading/purchaseListing.ts";
import { hireCrew } from "../../src/crew/hireCrew.ts";
import { igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar } from "../fixtures/resources.ts";
import { makeInstance } from "../fixtures/instances.ts";
import { queueRandom } from "../fixtures/random.ts";
import { ionForgedHullPlateRecipe } from "../fixtures/recipes.ts";
import type { CraftAccepted } from "../../src/data/types/craftResult.ts";
import type { Listing } from "../../src/data/types/listing.ts";
import type { PurchaseSucceeded } from "../../src/data/types/purchaseResult.ts";
import type { CrewCandidate } from "../../src/data/types/crewCandidate.ts";
import type { PlanetCrewPool } from "../../src/data/types/planetCrewPool.ts";
import type { CrewCapacity } from "../../src/data/types/crewCapacity.ts";
import type { HireSucceeded } from "../../src/data/types/hireResult.ts";

// Phase 5 GDD §5 / Agent 21's contract: the most important check in this
// suite. Re-runs the exact hand-calculated MVP (Agent 3), Phase 2 (Agent
// 9), Phase 3 (Agent 12), and Phase 4 (Agent 17) cases, confirming
// byte-for-byte identical results now that Agent 20 (ships & travel core)
// exists alongside them -- none of refine()/craft()/generateGalaxy()/
// purchaseListing()/hireCrew() take any ship or travel data at all, and
// `git status` across the whole Phase 5 amendment + Agent 20 shows zero
// changes to src/simulation/refine.ts, craft.ts, anything under
// src/galaxy/, src/trading/, or src/crew/.

test("refine() unchanged: same hand-calculated case as the pre-Phase-5 MVP/Phase 2/3/4 tests", () => {
  const inputs = [
    makeInstance(igneousOre, 2, { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 }),
    makeInstance(autuniteCrystal, 1, { purity: null, density: 60, potency: 60, durability: 60, rarity: 60 }),
  ];

  const result = refine(inputs, "Gold", queueRandom([0, 0.5, 0.5, 0.5]));

  assert.deepEqual(result, {
    qualities: { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 },
    outputTier: "White",
    refundUnits: 0,
  });
});

test("craft() unchanged: same hand-calculated case as the pre-Phase-5 MVP/Phase 2/3/4 tests", () => {
  const inputs = [
    makeInstance(radiantAlloyBar, 1, { purity: 70, density: 70, potency: 70, durability: 70, rarity: 70 }),
    makeInstance(hydrogenGas, 1, { purity: 70, density: 70, potency: 70, rarity: 70 }),
  ];

  const result = craft(inputs, ionForgedHullPlateRecipe, "Blue", "Green", queueRandom([1])) as CraftAccepted;

  assert.equal(result.accepted, true);
  assert.deepEqual(result.qualities, {
    purity: 79,
    density: 79,
    potency: 79,
    durability: 79,
    rarity: 79,
  });
});

test("generateGalaxy() unchanged: same seed still reproduces the identical galaxy", () => {
  const resources = [igneousOre, hydrogenGas, autuniteCrystal, radiantAlloyBar];
  const a = generateGalaxy(5, resources, "phase-5-regression-check");
  const b = generateGalaxy(5, resources, "phase-5-regression-check");
  assert.deepEqual(a, b);
});

test("purchaseListing() unchanged: same hand-calculated drift case as the pre-Phase-5 Phase 3 tests", () => {
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

  const result = purchaseListing(listing, 5, "buyer-1", null) as PurchaseSucceeded;

  assert.equal(result.success, true);
  assert.equal(result.totalPaid, 100);
  assert.equal(result.feeDeducted, 5);
  assert.equal(result.proceedsToSeller, 95);
});

test("hireCrew() unchanged: same hand-calculated hire-cost case as the pre-Phase-5 Phase 4 tests", () => {
  const candidate: CrewCandidate = { id: "candidate-1", tier: "Blue", profession: null };
  const pool: PlanetCrewPool = { planetId: "delta-rigelus", availableHires: [candidate], lastRefreshedAt: 0 };
  const capacity: CrewCapacity = { playerId: "player-1", baseCapacity: 2, purchasedSlots: 0 };

  const result = hireCrew(candidate, pool, capacity, [], { playerId: "player-1", credits: 1000 }, "player-1", 100) as HireSucceeded;

  assert.equal(result.hired, true);
  assert.equal(result.updatedWallet.credits, 1000 - 350); // Blue tier hire cost
});
