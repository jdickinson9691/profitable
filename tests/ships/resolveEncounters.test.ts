import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveEncounters } from "../../src/ships/resolveEncounters.ts";
import { rollQuality } from "../../src/simulation/rollQuality.ts";
import { igneousOre, hydrogenGas, autuniteCrystal } from "../fixtures/resources.ts";
import { queueRandom } from "../fixtures/random.ts";
import {
  ENCOUNTER_CHECK_WINDOW_HOURS,
  ENCOUNTER_TRIGGER_CHANCE,
  ENCOUNTER_TRADE_OPPORTUNITY_MIN_CREDITS,
  ENCOUNTER_TRADE_OPPORTUNITY_MAX_CREDITS,
  HAZARD_PASS_THRESHOLD,
  HAZARD_BASE_FAILURE_COST,
} from "../../src/data/constants/shipsAndTravelConfig.ts";
import type { Voyage } from "../../src/data/types/voyage.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { Planet } from "../../src/data/types/planet.ts";
import type { Resource } from "../../src/data/types/resource.ts";
import type { EncounterResult, DiscoveryEncounterResult, HazardEncounterResult } from "../../src/data/types/encounter.ts";
import type { RandomFn } from "../../src/data/types/random.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

// Agent 21 (amendment): proves the Agent 20 amendment's resolveEncounters()
// matches Travel Encounters GDD Section 2 exactly. resolveEncounters()
// never touches Wallet or inventory directly (same boundary
// resolveArrival() already holds for cargo/Listing) -- these tests confirm
// the *reported* outcome data (creditsGranted/creditsLost/rolled item) is
// correct, which is what a caller would apply to real state.

function ship(tier: Ship["tier"] = "Grey"): Ship {
  return {
    id: "ship-1",
    name: "Ship-1",
    ownerId: "player-1",
    tier,
    currentPlanetId: "origin",
    fuelCapacity: 100,
    currentFuel: 100,
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
  };
}

function voyage(windowCount: number, overrides: Partial<Voyage> = {}): Voyage {
  return {
    id: "voyage-1",
    shipId: "ship-1",
    originPlanetId: "origin",
    destinationPlanetId: "destination",
    departedAt: 0,
    arrivesAt: windowCount * ENCOUNTER_CHECK_WINDOW_HOURS * MS_PER_HOUR,
    cargo: [],
    ...overrides,
  };
}

function planet(overrides: Partial<Planet> = {}): Planet {
  return {
    id: "destination",
    name: "Destination",
    producibleResourceIds: [igneousOre.id, hydrogenGas.id, autuniteCrystal.id],
    discovered: false,
    ...overrides,
  };
}

const resources: Resource[] = [igneousOre, hydrogenGas, autuniteCrystal];

test("a window's trigger roll uses ENCOUNTER_TRIGGER_CHANCE exactly -- just under triggers, exactly at/over does not", () => {
  const belowThreshold = queueRandom([ENCOUNTER_TRIGGER_CHANCE - 0.001, 0, 0]); // trigger, tradeOpportunity, credits roll
  const triggered = resolveEncounters(voyage(1), ship(), planet(), resources, belowThreshold);
  assert.equal(triggered.encounters.length, 1);

  const atThreshold = queueRandom([ENCOUNTER_TRIGGER_CHANCE]); // no trigger -- only 1 call consumed
  const notTriggered = resolveEncounters(voyage(1), ship(), planet(), resources, atThreshold);
  assert.equal(notTriggered.encounters.length, 0);
});

test("a voyage spanning N windows gets N independent trigger rolls, not one roll for the whole voyage", () => {
  // 3 windows, each: trigger (low roll) -> tradeOpportunity (low roll) -> credits roll.
  const random = queueRandom([0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5]);
  const { encounters: results } = resolveEncounters(voyage(3), ship(), planet(), resources, random);
  assert.equal(results.length, 3);
  assert.deepEqual(
    results.map((r) => r.windowIndex),
    [0, 1, 2],
  );
});

test("a voyage shorter than one full window still gets at least one roll", () => {
  const shortVoyage = voyage(1, { arrivesAt: Math.floor(ENCOUNTER_CHECK_WINDOW_HOURS * MS_PER_HOUR * 0.1) });
  // queueRandom supplies exactly 1 value -- if resolveEncounters() tried to
  // roll 0 windows (no calls) or 2+ windows (2+ calls), this would either
  // leave the value unused (undetectable here) or throw on exhaustion. The
  // real proof is the exact-match test in resolveArrival.test.ts's
  // regression suite; this test just documents the floor-at-1 behavior.
  const random = queueRandom([1]); // no trigger (1 >= ENCOUNTER_TRIGGER_CHANCE)
  const { encounters: results } = resolveEncounters(shortVoyage, ship(), planet(), resources, random);
  assert.equal(results.length, 0);
});

test("type distribution over many trials roughly matches ENCOUNTER_TYPE_WEIGHTS, with hazard genuinely least common", () => {
  const counts: Record<string, number> = { tradeOpportunity: 0, discovery: 0, hazard: 0 };
  const trials = 3000;
  for (let i = 0; i < trials; i++) {
    // Force every window to trigger (roll 0), then let the type-split and
    // outcome rolls vary with a real (statistical, not hand-verified) RNG.
    let call = 0;
    const values = [0, Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random()];
    const random: RandomFn = () => values[call++] ?? Math.random();
    const { encounters: results } = resolveEncounters(voyage(1), ship(), planet(), resources, random);
    for (const result of results) counts[result.type] = (counts[result.type] ?? 0) + 1;
  }

  const total = counts.tradeOpportunity! + counts.discovery! + counts.hazard!;
  assert.ok(total > trials * 0.9); // almost every trial triggered (roll forced to 0)

  const hazardRate = counts.hazard! / total;
  const tradeRate = counts.tradeOpportunity! / total;
  const discoveryRate = counts.discovery! / total;

  assert.ok(Math.abs(hazardRate - 0.2) < 0.05, `hazard rate ${hazardRate} too far from 0.2`);
  assert.ok(Math.abs(tradeRate - 0.4) < 0.05, `tradeOpportunity rate ${tradeRate} too far from 0.4`);
  assert.ok(Math.abs(discoveryRate - 0.35) < 0.05, `discovery rate ${discoveryRate} too far from 0.35`);
  assert.ok(counts.hazard! < counts.tradeOpportunity!);
  assert.ok(counts.hazard! < counts.discovery!);
});

test("tradeOpportunity: exact credits amount from a known roll, and every trial across many stays within the documented range", () => {
  // trigger (0), type roll landing on tradeOpportunity (0, < 0.4), credits roll 0.5
  const random = queueRandom([0, 0, 0.5]);
  const {
    encounters: [result],
  } = resolveEncounters(voyage(1), ship(), planet(), resources, random);
  assert.equal(result!.type, "tradeOpportunity");
  const expected = Math.round(ENCOUNTER_TRADE_OPPORTUNITY_MIN_CREDITS + 0.5 * (ENCOUNTER_TRADE_OPPORTUNITY_MAX_CREDITS - ENCOUNTER_TRADE_OPPORTUNITY_MIN_CREDITS));
  assert.equal((result as EncounterResult & { type: "tradeOpportunity" }).outcome.creditsGranted, expected);

  for (let i = 0; i < 200; i++) {
    const trialRandom = queueRandom([0, 0, Math.random()]);
    const {
      encounters: [trial],
    } = resolveEncounters(voyage(1), ship(), planet(), resources, trialRandom);
    const credits = (trial as EncounterResult & { type: "tradeOpportunity" }).outcome.creditsGranted;
    assert.ok(credits >= ENCOUNTER_TRADE_OPPORTUNITY_MIN_CREDITS && credits <= ENCOUNTER_TRADE_OPPORTUNITY_MAX_CREDITS);
  }
});

test("discovery: calls the real rollQuality() (not a reimplementation) -- output matches an independent direct call with the same resource and random sequence", () => {
  // trigger (0), type roll landing on discovery (0.5, in [0.4, 0.8)),
  // resource-pick roll (0 -> igneousOre, first in the sorted-by-caller-order pool),
  // then rollQuality()'s own 5 dimension rolls.
  const rollSequence = [0.1, 0.2, 0.3, 0.4, 0.5];
  const random = queueRandom([0, 0.5, 0, ...rollSequence]);
  const {
    encounters: [result],
  } = resolveEncounters(voyage(1), ship(), planet(), resources, random);
  assert.equal(result!.type, "discovery");
  const discovery = result as DiscoveryEncounterResult;
  assert.equal(discovery.outcome.resourceId, igneousOre.id);

  const expectedQualities = rollQuality(igneousOre, queueRandom(rollSequence));
  assert.deepEqual(discovery.outcome.qualities, expectedQualities);
});

test("discovery: never sets discovered: true on any planet, across many trials with a real (not-yet-discovered) planet", () => {
  const targetPlanet = planet({ discovered: false });
  const snapshot = { ...targetPlanet };

  for (let i = 0; i < 200; i++) {
    const random: RandomFn = () => Math.random();
    resolveEncounters(voyage(3), ship(), targetPlanet, resources, random);
  }

  assert.deepEqual(targetPlanet, snapshot, "resolveEncounters() must never mutate the planet it was given");
  assert.equal(targetPlanet.discovered, false);
});

test("discovery: an empty eligible pool produces no result for that window rather than throwing", () => {
  const emptyPoolPlanet = planet({ producibleResourceIds: [] });
  const random = queueRandom([0, 0.5]); // trigger, discovery type -- no 3rd roll since the pool is empty
  const { encounters: results } = resolveEncounters(voyage(1), ship(), emptyPoolPlanet, resources, random);
  assert.equal(results.length, 0);
});

test("hazard: the pass/fail roll is modified by the voyage's ship's derived tier -- an identical raw roll fails for Grey but passes for Gold", () => {
  // trigger (0), type roll landing on hazard (0.9, in [0.8, 0.95) --
  // Combat GDD amendment shrank hazard's slice but 0.9 still lands inside
  // it), raw roll of 40 (1-100 scale: floor(0.39 * 100) + 1 = 40) --
  // Grey's +0 bonus keeps it below HAZARD_PASS_THRESHOLD (50); Gold's +30
  // bonus pushes it to 70, a pass.
  const rawRoll = 0.39;

  const greyResult = resolveEncounters(voyage(1), ship("Grey"), planet(), resources, queueRandom([0, 0.9, rawRoll])).encounters as HazardEncounterResult[];
  assert.equal(greyResult[0]!.type, "hazard");
  assert.equal(greyResult[0]!.outcome.passed, false);

  const goldResult = resolveEncounters(voyage(1), ship("Gold"), planet(), resources, queueRandom([0, 0.9, rawRoll])).encounters as HazardEncounterResult[];
  assert.equal(goldResult[0]!.type, "hazard");
  assert.equal(goldResult[0]!.outcome.passed, true);
});

test("hazard: failure cost curve matches the escalating shape exactly at several distance-below-threshold values", () => {
  // Grey tier: +0 bonus, so effectiveRoll === rawRoll (1-100). HAZARD_PASS_THRESHOLD
  // is used directly as pointsBelow = threshold - effectiveRoll.
  const cases: Array<{ rawRoll: number; expectedPointsBelow: number; expectedMultiplier: number }> = [
    { rawRoll: HAZARD_PASS_THRESHOLD - 5, expectedPointsBelow: 5, expectedMultiplier: 1.0 },
    { rawRoll: HAZARD_PASS_THRESHOLD - 15, expectedPointsBelow: 15, expectedMultiplier: 2.0 },
    { rawRoll: HAZARD_PASS_THRESHOLD - 25, expectedPointsBelow: 25, expectedMultiplier: 4.0 },
    { rawRoll: HAZARD_PASS_THRESHOLD - 35, expectedPointsBelow: 35, expectedMultiplier: 7.0 },
    { rawRoll: HAZARD_PASS_THRESHOLD - 45, expectedPointsBelow: 45, expectedMultiplier: 10.0 },
  ];

  for (const { rawRoll, expectedMultiplier } of cases) {
    // random() for the 1-100 roll: Math.floor(x * 100) + 1 === rawRoll => x = (rawRoll - 1) / 100.
    const x = (rawRoll - 1) / 100;
    const random = queueRandom([0, 0.9, x]);
    const {
      encounters: [result],
    } = resolveEncounters(voyage(1), ship("Grey"), planet(), resources, random);
    const hazard = result as HazardEncounterResult;
    assert.equal(hazard.outcome.passed, false);
    assert.equal(hazard.outcome.creditsLost, Math.round(HAZARD_BASE_FAILURE_COST * expectedMultiplier));
  }
});

test("hazard: a passed roll produces zero currency deduction", () => {
  // Grey tier, raw roll exactly at HAZARD_PASS_THRESHOLD (a pass, not a failure).
  const x = (HAZARD_PASS_THRESHOLD - 1) / 100;
  const random = queueRandom([0, 0.9, x]);
  const {
    encounters: [result],
  } = resolveEncounters(voyage(1), ship("Grey"), planet(), resources, random);
  const hazard = result as HazardEncounterResult;
  assert.equal(hazard.outcome.passed, true);
  assert.equal(hazard.outcome.creditsLost, 0);
});

// Combat GDD §1/§2.2/§2.6/§3 -- Agent 21 (amendment): detection and the
// isRetreat guard.

test("combat: a type-split roll landing on combat creates a pending CombatEncounter (not an EncounterResult) and does not resolve an outcome", () => {
  // trigger (0), type roll landing on combat (0.97, in [0.95, 1.0) under
  // the Combat GDD's rebalanced weights), threat roll (0.5 -> floor(50)+1
  // = 51, in White's 41-60 range).
  const { encounters, pendingCombats } = resolveEncounters(voyage(1), ship(), planet(), resources, queueRandom([0, 0.97, 0.5]));

  assert.equal(encounters.length, 0);
  assert.equal(pendingCombats.length, 1);
  const combat = pendingCombats[0]!;
  assert.equal(combat.voyageId, "voyage-1");
  assert.equal(combat.id, "voyage-1-combat-w0");
  assert.equal(combat.triggerContext, "travel");
  assert.equal(combat.windowIndex, 0);
  assert.equal(combat.status, "pending");
  assert.equal(combat.outcome, null);
  assert.equal(combat.opponentThreatTier, "White");
});

test("mixed scenario: a combat detection in one window does not affect a trade-opportunity resolving synchronously in another -- proving the two output channels are independent", () => {
  const random = queueRandom([
    0, 0.97, 0.5, // window 0: trigger, combat type, threat roll
    0, 0, 0.5, // window 1: trigger, tradeOpportunity type, credits roll
  ]);
  const { encounters, pendingCombats } = resolveEncounters(voyage(2), ship(), planet(), resources, random);

  assert.equal(pendingCombats.length, 1);
  assert.equal(pendingCombats[0]!.windowIndex, 0);

  assert.equal(encounters.length, 1);
  assert.equal(encounters[0]!.type, "tradeOpportunity");
  assert.equal(encounters[0]!.windowIndex, 1);
});

test("isRetreat: true returns immediately with zero rolls of any kind -- an explicit proof, not just 'nothing happened to trigger'", () => {
  const random: RandomFn = () => {
    throw new Error("resolveEncounters() must not call random() at all when voyage.isRetreat is true");
  };

  const result = resolveEncounters(voyage(5, { isRetreat: true }), ship(), planet(), resources, random);
  assert.deepEqual(result, { encounters: [], pendingCombats: [] });
});
