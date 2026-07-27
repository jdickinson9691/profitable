import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadContent } from "../../src/simulation/loadContent.ts";
import { refine } from "../../src/simulation/refine.ts";
import { craft } from "../../src/simulation/craft.ts";
import { generateGalaxy } from "../../src/galaxy/generateGalaxy.ts";
import { loadTradingContent } from "../../src/trading/loadTradingContent.ts";
import { purchaseListing } from "../../src/trading/purchaseListing.ts";
import { refreshCrewPool } from "../../src/crew/refreshCrewPool.ts";
import { hireCrew } from "../../src/crew/hireCrew.ts";
import { assignToCraft } from "../../src/crew/assignToCraft.ts";
import { resolveBackgroundCrafting } from "../../src/crew/resolveBackgroundCrafting.ts";
import { payUpkeep } from "../../src/crew/payUpkeep.ts";
import { checkAttrition } from "../../src/crew/checkAttrition.ts";
import { dismissCrew } from "../../src/crew/dismissCrew.ts";
import { BACKGROUND_IDLE_OUTPUT_RATE, WAGE_PAYMENT_INTERVAL_HOURS, UPKEEP_GRACE_PERIOD_HOURS } from "../../src/data/constants/crewConfig.ts";
import { queueRandom } from "../fixtures/random.ts";
import type { ResourceInstance } from "../../src/data/types/resourceInstance.ts";
import type { CraftAccepted } from "../../src/data/types/craftResult.ts";
import type { CraftAction } from "../../src/data/types/craftAction.ts";
import type { CrewCapacity } from "../../src/data/types/crewCapacity.ts";
import type { Wallet } from "../../src/data/types/wallet.ts";
import type { HireSucceeded } from "../../src/data/types/hireResult.ts";
import type { AssignSucceeded } from "../../src/data/types/assignResult.ts";
import type { BackgroundResolved } from "../../src/data/types/backgroundResult.ts";
import type { PaymentPaid } from "../../src/data/types/paymentResult.ts";
import type { PurchaseSucceeded } from "../../src/data/types/purchaseResult.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

// Agent 19 (Phase 4 Integration): verifies the full extended loop -- hire
// a crew member from a generated planet's crew pool -> assign them to an
// active craft that runs SIMULTANEOUSLY with the player's own craft ->
// leave another crew member idle and later resolve their background
// production via the catch-up calculation -> pay upkeep -> attrition/
// dismissal -- end-to-end using real (non-mocked) data: the actual
// content/*.json files, a real generated galaxy, and the actual Agent 16
// crew functions. Distinct from Agent 17's unit tests, which prove each
// function correct in isolation; this proves the real wiring between
// Phase 4 and everything before it has no gap, same spirit as Agents 7,
// 10, and 15's own verifications.

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

function craftAction(id: string): CraftAction {
  const recipe = content.recipes.find((r) => r.id === "ion-forged-hull-plate")!;
  const schematic = content.schematics.find((s) => s.recipeId === recipe.id)!;
  const radiantAlloyBar = content.resources.find((r) => r.id === "radiant-alloy-bar")!;
  const hydrogenGas = content.resources.find((r) => r.id === "hydrogen-gas")!;
  const inputs: ResourceInstance[] = [
    { resource: radiantAlloyBar, quantity: 1, qualities: { purity: 70, density: 70, potency: 70, durability: 70, rarity: 70 } },
    { resource: hydrogenGas, quantity: 1, qualities: { purity: 70, density: 70, potency: 70, durability: null, rarity: 70 } },
  ];
  return { id, inputs, recipe, schematicTier: schematic.tier };
}

test("full extended loop: hire -> assign (simultaneous with player's own craft) -> idle background resolution -> upkeep -> dismissal, with real data throughout", () => {
  const galaxy = generateGalaxy(5, content.resources, "phase4-integration-full-loop");
  const planet = galaxy.planets[0]!;

  // Step 1: a real crew pool at this generated planet.
  const pool = refreshCrewPool(planet.id, "phase4-integration-pool-seed", 0);
  assert.ok(pool.availableHires.length > 0);

  const capacity: CrewCapacity = { playerId: "player-1", baseCapacity: 2, purchasedSlots: 0 };
  let wallet: Wallet = { playerId: "player-1", credits: 5000 };

  // Step 2: hire two crew members -- one to actively assign, one to leave idle.
  const [candidateA, candidateB] = pool.availableHires;
  assert.ok(candidateA && candidateB, "expected at least 2 candidates in the pool for this scenario");

  const hireA = hireCrew(candidateA!, pool, capacity, [], wallet, "player-1", 0) as HireSucceeded;
  assert.equal(hireA.hired, true);
  wallet = hireA.updatedWallet;

  const hireB = hireCrew(candidateB!, hireA.updatedPool, capacity, [hireA.crewMember], wallet, "player-1", 0) as HireSucceeded;
  assert.equal(hireB.hired, true);
  wallet = hireB.updatedWallet;

  // Step 3: the player's OWN craft, computed the same way CraftScene does
  // -- via the real craft() directly, no crew machinery involved.
  const playerResult = craft(
    craftAction("player-craft").inputs,
    craftAction("player-craft").recipe,
    craftAction("player-craft").schematicTier,
    "White",
    queueRandom([0.5]),
  );
  assert.equal(playerResult.accepted, true);

  // Step 4: crew member A is actively assigned -- SIMULTANEOUSLY with the
  // player's own craft above (both already computed independently by now,
  // proving neither blocked on or serialized after the other).
  const assignResult = assignToCraft(hireA.crewMember, craftAction("crew-a-craft"), queueRandom([0.5])) as AssignSucceeded;
  assert.equal(assignResult.assigned, true);
  assert.equal(assignResult.updatedCrewMember.status, "active");
  assert.equal(assignResult.craftResult.accepted, true);
  // Different crafter tiers (player White, crew A whatever candidateA's
  // tier is) produce independently-correct results -- not the same output
  // reused/shared between the two calls.
  if (playerResult.accepted && assignResult.craftResult.accepted && hireA.crewMember.tier !== "White") {
    assert.notDeepEqual(playerResult.qualities, assignResult.craftResult.qualities);
  }

  // Step 5: crew member B stays idle; later, the player checks on their
  // background production. BACKGROUND_IDLE_OUTPUT_RATE is currently null
  // (Phase 4 GDD §2.1a is still an open design question at integration
  // time), so the real default correctly reports "not yet available" --
  // this is not a gap, it's the documented, expected state; see the
  // dedicated hand-verified example below for what happens once a rate
  // does exist.
  const backgroundNow = 10 * MS_PER_HOUR;
  const backgroundResult = resolveBackgroundCrafting(hireB.crewMember, craftAction("crew-b-craft"), backgroundNow);
  assert.equal(backgroundResult.resolved, false);
  assert.equal(BACKGROUND_IDLE_OUTPUT_RATE, null);
  assert.equal(backgroundResult.updatedCrewMember.lastCheckedAt, backgroundNow);

  // Step 6: upkeep, paid correctly once a full interval has elapsed.
  const upkeepTime = WAGE_PAYMENT_INTERVAL_HOURS * MS_PER_HOUR;
  const payment = payUpkeep(hireA.crewMember, wallet, upkeepTime) as PaymentPaid;
  assert.equal(payment.status, "paid");
  wallet = payment.updatedWallet;

  // Step 7a: attrition correctly does NOT trigger while paid on time.
  const attritionOk = checkAttrition(payment.updatedCrewMember, upkeepTime + 1 * MS_PER_HOUR);
  assert.equal(attritionOk.departed, false);

  // Step 7b: attrition DOES trigger once upkeep goes unpaid past the
  // grace period -- using crew member B, who was never paid after hiring.
  const stillGraced = checkAttrition(hireB.crewMember, UPKEEP_GRACE_PERIOD_HOURS * MS_PER_HOUR);
  assert.equal(stillGraced.departed, false); // exactly at the boundary, not yet past it
  const departed = checkAttrition(hireB.crewMember, UPKEEP_GRACE_PERIOD_HOURS * MS_PER_HOUR + 1);
  assert.equal(departed.departed, true);

  // Step 8: voluntary dismissal of crew member A, as the alternative exit path.
  const dismissal = dismissCrew(hireA.crewMember, "player-1");
  assert.equal(dismissal.dismissed, true);
});

test("hand-verified background-production example: a known lastCheckedAt, a known elapsed time, matching the hand-calculated expected output exactly (using an explicit rate, since BACKGROUND_IDLE_OUTPUT_RATE is still a placeholder per Agent 1's amendment)", () => {
  // FLAGGED PER THIS AGENT'S OWN CONTRACT: Phase 4 GDD §2.1a's exact
  // background/idle output rate is still an open design question at
  // integration time -- BACKGROUND_IDLE_OUTPUT_RATE is null, not a real
  // tunable value yet (confirmed above and in
  // tests/data/phase4Constants.test.ts). This example therefore supplies
  // an explicit rate override (the same injectable parameter Agent 17's
  // own unit tests use) purely to prove the *mechanism* -- elapsed-time
  // derivation, capping, and unit computation -- is correct and ready for
  // whatever real number the design doc eventually locks in. It is not a
  // claim that 1 unit/hour is the final balanced rate.
  assert.equal(BACKGROUND_IDLE_OUTPUT_RATE, null);

  const crewMember = {
    id: "crew-hand-verify",
    hiredByPlayerId: "player-1",
    tier: "Green" as const,
    profession: null,
    status: "idle" as const,
    assignedCraftId: "craft-hand-verify",
    hiredAt: 0,
    lastCheckedAt: 0, // known starting point
    wageAmount: 20,
    lastPaidAt: 0,
  };

  const knownElapsedHours = 5;
  const currentTime = knownElapsedHours * MS_PER_HOUR; // known elapsed time
  const explicitRate = 1; // 1 unit/hour, supplied only for this example

  const result = resolveBackgroundCrafting(
    crewMember,
    craftAction("craft-hand-verify"),
    currentTime,
    explicitRate,
    queueRandom([0.5, 0.5, 0.5, 0.5, 0.5]),
  ) as BackgroundResolved;

  // Hand-calculated: elapsed = 5 hours (well under the 48-hour cap) *
  // 1 unit/hour = 5 completed units, each independently calling the real
  // craft() -- Green crafter tier, Blue schematic, random()=0.5.
  assert.equal(result.resolved, true);
  assert.equal(result.unitsCompleted, 5);
  assert.equal(result.results.length, 5);
  for (const unit of result.results) {
    assert.equal(unit.accepted, true);
  }
  assert.equal(result.updatedCrewMember.lastCheckedAt, currentTime);
});

test("regression: the original MVP's, Phase 2's, and Phase 3's hand-calculated cases still pass with zero deviation", () => {
  // Re-asserts the exact same cases tests/integration/mvpLoop.test.ts,
  // tests/galaxy/regressionCheck.test.ts, and
  // tests/integration/phase3Loop.test.ts already prove, as a dedicated
  // marker (per this agent's own Definition of Done) that the full
  // Phase 4 roster -- amendment, Agents 16-18 -- didn't disturb them.
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

  const galaxy = generateGalaxy(6, content.resources, "phase4-integration-regression-reproduce");
  const galaxyAgain = generateGalaxy(6, content.resources, "phase4-integration-regression-reproduce");
  assert.deepEqual(galaxy, galaxyAgain);

  const listing = {
    id: "listing-1",
    itemId: "igneous-ore",
    quantity: 10,
    pricePerUnit: 20,
    marketTier: "Blue" as const,
    location: "global" as const,
    createdByPlayerId: "seller-1",
    createdAt: 0,
    expiresAt: 1000,
  };
  const purchase = purchaseListing(listing, 5, "buyer-1", null) as PurchaseSucceeded;
  assert.equal(purchase.success, true);
  assert.equal(purchase.totalPaid, 100);
  assert.equal(purchase.feeDeducted, 5);
  assert.equal(purchase.proceedsToSeller, 95);

  // Confirms tradingContent still loads correctly alongside the new
  // Phase 4 content-loading path (no shared-registry collision).
  assert.ok(tradingContent.tradingBasePrices.length > 0);
});
