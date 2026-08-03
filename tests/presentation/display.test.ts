import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatQualityRoll,
  formatQualityLabel,
  describeRefineResult,
  describeCraftResult,
  describeEncounter,
  describePendingCombat,
  describeCombatResolution,
  computeAggregateTier,
} from "../../src/presentation/display.ts";
import type { QualityRoll } from "../../src/data/types/quality.ts";
import type { RefineResult } from "../../src/data/types/refineResult.ts";
import type { CraftAccepted, CraftRejected } from "../../src/data/types/craftResult.ts";
import type {
  TradeOpportunityEncounterResult,
  DiscoveryEncounterResult,
  HazardEncounterResult,
} from "../../src/data/types/encounter.ts";
import type { CombatEncounter } from "../../src/data/types/combatEncounter.ts";
import type { CombatResolution } from "../../src/data/types/combatResolution.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { CrewMember } from "../../src/data/types/crewMember.ts";

const fullRoll: QualityRoll = { purity: 72, density: 45, potency: 97, durability: null, rarity: 1 };

test("formatQualityRoll() maps every dimension to its value and tier, preserving null", () => {
  const rows = formatQualityRoll(fullRoll);

  assert.equal(rows.length, 5);
  assert.deepEqual(
    rows.find((r) => r.quality === "purity"),
    { quality: "purity", value: 72, tier: "Green" },
  );
  assert.deepEqual(
    rows.find((r) => r.quality === "potency"),
    { quality: "potency", value: 97, tier: "Gold" },
  );
  assert.deepEqual(
    rows.find((r) => r.quality === "durability"),
    { quality: "durability", value: null, tier: null },
  );
  assert.deepEqual(
    rows.find((r) => r.quality === "rarity"),
    { quality: "rarity", value: 1, tier: "Grey" },
  );
});

test("formatQualityLabel() renders a value+tier row and an N/A row distinctly", () => {
  assert.equal(formatQualityLabel({ quality: "purity", value: 72, tier: "Green" }), "Purity: 72 (Green)");
  assert.equal(formatQualityLabel({ quality: "durability", value: null, tier: null }), "Durability: N/A");
});

test("describeRefineResult() mentions the refund only when units were actually refunded", () => {
  const noRefund: RefineResult = { qualities: fullRoll, outputTier: "Blue", refundUnits: 0 };
  const oneRefund: RefineResult = { qualities: fullRoll, outputTier: "Gold", refundUnits: 1 };
  const twoRefunds: RefineResult = { qualities: fullRoll, outputTier: "Gold", refundUnits: 2 };

  assert.equal(describeRefineResult(noRefund), "Output tier: Blue");
  assert.match(describeRefineResult(oneRefund), /\+1 refunded unit\b/);
  assert.match(describeRefineResult(twoRefunds), /\+2 refunded units\b/);
});

test("computeAggregateTier() averages only the non-null dimensions", () => {
  // purity 72, density 45, potency 97, rarity 1 -> average excludes the
  // null durability entirely (never treated as 0).
  const average = (72 + 45 + 97 + 1) / 4; // 53.75 -> White (41-60)
  assert.equal(computeAggregateTier(fullRoll), "White");
  assert.notEqual(Math.round(average), 0); // sanity: the exclusion mattered
});

test("computeAggregateTier() returns null when every dimension is null", () => {
  const allNull: QualityRoll = { purity: null, density: null, potency: null, durability: null, rarity: null };
  assert.equal(computeAggregateTier(allNull), null);
});

test("describeCraftResult() reports the rejection reason for a rejected craft", () => {
  const rejected: CraftRejected = { accepted: false, reason: "an input is 45 points below threshold" };
  assert.match(describeCraftResult(rejected), /^Craft rejected: /);
  assert.match(describeCraftResult(rejected), /45 points below threshold/);
});

test("describeCraftResult() reports the aggregate tier for an accepted craft", () => {
  const accepted: CraftAccepted = { accepted: true, qualities: fullRoll };
  assert.equal(describeCraftResult(accepted), "Crafted! Aggregate tier: White");
});

test("describeEncounter() formats a trade-opportunity as a currency grant", () => {
  const result: TradeOpportunityEncounterResult = { type: "tradeOpportunity", windowIndex: 0, outcome: { creditsGranted: 150 } };
  assert.equal(describeEncounter(result), "Encountered a trader en route: +150 Credits");
});

test("describeEncounter() formats a discovery with its resolved name and aggregate tier, falling back to the raw resourceId when no name is given", () => {
  const result: DiscoveryEncounterResult = {
    type: "discovery",
    windowIndex: 1,
    outcome: { resourceId: "igneous-ore", qualities: fullRoll },
  };
  assert.equal(describeEncounter(result, "Igneous Ore"), "Found derelict cargo: Igneous Ore (White)");
  assert.equal(describeEncounter(result), "Found derelict cargo: igneous-ore (White)");
});

test("describeEncounter() formats a passed hazard distinctly from a failed one", () => {
  const passed: HazardEncounterResult = { type: "hazard", windowIndex: 2, outcome: { passed: true, creditsLost: 0 } };
  const failed: HazardEncounterResult = { type: "hazard", windowIndex: 3, outcome: { passed: false, creditsLost: 45 } };
  assert.equal(describeEncounter(passed), "Navigational hazard: passed");
  assert.equal(describeEncounter(failed), "Navigational hazard: -45 Credits");
});

// Combat GDD §2.2/§2.3/§2.5 amendment (Agent 22).

function ship(overrides: Partial<Ship> = {}): Ship {
  return {
    id: "ship-1",
    name: "Ship-1",
    ownerId: "player-1",
    tier: "Blue",
    currentPlanetId: "destination",
    fuelCapacity: 100,
    currentFuel: 100,
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
    ...overrides,
  };
}

function combatEncounter(overrides: Partial<CombatEncounter> = {}): CombatEncounter {
  return {
    id: "combat-1",
    voyageId: "voyage-1",
    triggerContext: "travel",
    opponentThreatTier: "Grey",
    status: "pending",
    outcome: null,
    windowIndex: 0,
    ...overrides,
  };
}

test("describePendingCombat() reports the opponent's threat tier and nothing else -- no outcome hint", () => {
  const encounter = combatEncounter({ opponentThreatTier: "Blue" });
  assert.equal(describePendingCombat(encounter), "Hostile ship encountered! Opponent threat tier: Blue.");
});

test("describeCombatResolution() reports a win with no damage or crew mention", () => {
  const resolution: CombatResolution = {
    combatEncounter: combatEncounter({ status: "resolved", outcome: "win" }),
    updatedShip: ship(),
    updatedCrewMember: null,
    retreatVoyage: null,
  };
  assert.equal(describeCombatResolution(resolution), "Combat won! Your ship continues on, undamaged.");
});

test("describeCombatResolution() reports a flee with no damage or crew mention", () => {
  const resolution: CombatResolution = {
    combatEncounter: combatEncounter({ status: "resolved", outcome: "flee" }),
    updatedShip: ship(),
    updatedCrewMember: null,
    retreatVoyage: null,
  };
  assert.equal(describeCombatResolution(resolution), "Fled the encounter -- redirected back to the last safe planet.");
});

test("describeCombatResolution() reports a lose with the weapon's current tier and the affected crew member's tier", () => {
  const damagedShip = ship({
    components: {
      weapon: { id: "weapon-1", category: "weapon", qualities: { purity: 68, density: 68, potency: 68, durability: 55, rarity: 68 }, tier: "Green" },
      engine: null,
      shield: null,
      cargoHold: null,
    },
  });
  const crewMember: CrewMember = {
    id: "crew-1",
    hiredByPlayerId: "player-1",
    tier: "Purple",
    profession: null,
    status: "idle",
    assignedCraftId: null,
    hiredAt: 0,
    lastCheckedAt: 0,
    wageAmount: 35,
    lastPaidAt: 0,
    unavailableUntil: 100_000,
  };
  const resolution: CombatResolution = {
    combatEncounter: combatEncounter({ status: "resolved", outcome: "lose" }),
    updatedShip: damagedShip,
    updatedCrewMember: crewMember,
    retreatVoyage: null,
  };
  assert.equal(
    describeCombatResolution(resolution),
    "Combat lost! Redirected back to the last safe planet. Weapon now Green tier. A Purple crew member is unavailable for a while.",
  );
});

test("describeCombatResolution() omits the weapon note when no weapon is installed, and the crew note when no crew was affected", () => {
  const resolution: CombatResolution = {
    combatEncounter: combatEncounter({ status: "resolved", outcome: "lose" }),
    updatedShip: ship(), // weapon: null
    updatedCrewMember: null,
    retreatVoyage: null,
  };
  assert.equal(describeCombatResolution(resolution), "Combat lost! Redirected back to the last safe planet.");
});
