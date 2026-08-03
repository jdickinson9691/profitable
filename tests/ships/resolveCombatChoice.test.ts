import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCombatChoice } from "../../src/ships/resolveCombatChoice.ts";
import { queueRandom } from "../fixtures/random.ts";
import {
  COMBAT_CREW_UNAVAILABLE_DURATION_HOURS,
  COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT,
  COMBAT_ENGINEER_MITIGATION_BY_TIER,
} from "../../src/data/constants/shipsAndTravelConfig.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { ShipComponent } from "../../src/data/types/shipComponent.ts";
import type { Voyage } from "../../src/data/types/voyage.ts";
import type { Planet } from "../../src/data/types/planet.ts";
import type { CrewMember } from "../../src/data/types/crewMember.ts";
import type { CombatEncounter } from "../../src/data/types/combatEncounter.ts";
import type { TierColor } from "../../src/data/types/tierColor.ts";

// Combat GDD §2.3/§2.4/§2.5/§3 -- Agent 21 (amendment): proves
// resolveCombatChoice() matches the GDD's flee/win/lose rules exactly,
// including the weapon-tier-vs-opponent-threat formula's hand-calculated
// values, the component/crew mutation scope, and the shared retreat
// voyage mechanism.

const MS_PER_HOUR = 60 * 60 * 1000;

function ship(overrides: Partial<Ship> = {}): Ship {
  return {
    id: "ship-1",
    name: "Ship-1",
    ownerId: "player-1",
    tier: "Blue",
    fuelCapacity: 100,
    currentFuel: 100,
    currentPlanetId: "destination",
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
    ...overrides,
  };
}

function weaponComponent(qualityValue: number, tier: TierColor): ShipComponent {
  return {
    id: "weapon-1",
    category: "weapon",
    qualities: { purity: qualityValue, density: qualityValue, potency: qualityValue, durability: qualityValue, rarity: qualityValue },
    tier,
  };
}

function voyage(overrides: Partial<Voyage> = {}): Voyage {
  return {
    id: "voyage-1",
    shipId: "ship-1",
    originPlanetId: "origin",
    destinationPlanetId: "destination",
    departedAt: 0,
    arrivesAt: 1000,
    cargo: [{ itemId: "ion-forged-hull-plate", quantity: 2 }],
    ...overrides,
  };
}

const originPlanet: Planet = { id: "origin", name: "Origin", producibleResourceIds: [], position: { x: 0, y: 0 } };
const currentPlanet: Planet = { id: "destination", name: "Destination", producibleResourceIds: [], position: { x: 300, y: 400 } };

function crewMember(id: string, overrides: Partial<CrewMember> = {}): CrewMember {
  return {
    id,
    hiredByPlayerId: "player-1",
    tier: "Blue",
    profession: null,
    status: "idle",
    assignedCraftId: null,
    hiredAt: 0,
    lastCheckedAt: 0,
    wageAmount: 35,
    lastPaidAt: 0,
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

test("resolveCombatChoice() throws if the encounter is not pending -- a caller/programming error, not a normal outcome", () => {
  const resolved = combatEncounter({ status: "resolved", outcome: "win" });
  assert.throws(
    () => resolveCombatChoice(resolved, "attack", voyage(), ship(), originPlanet, currentPlanet, [], 0, "retreat-1", queueRandom([])),
    RangeError,
  );
});

test("flee: resolves unconditionally with zero rolls, no component/crew mutation, and a retreat voyage to originPlanetId carrying cargo unchanged", () => {
  const s = ship({ components: { weapon: weaponComponent(80, "Blue"), engine: null, shield: null, cargoHold: null } });
  const v = voyage();
  const encounter = combatEncounter();
  const crew = [crewMember("crew-1")];

  // queueRandom([]) throws the instant random() is called -- proves flee
  // truly rolls nothing, not just that nothing happened to matter.
  const result = resolveCombatChoice(encounter, "flee", v, s, originPlanet, currentPlanet, crew, 5000, "retreat-1", queueRandom([]));

  assert.equal(result.combatEncounter.status, "resolved");
  assert.equal(result.combatEncounter.outcome, "flee");
  assert.equal(result.updatedShip, s); // same reference -- untouched
  assert.equal(result.updatedCrewMember, null);
  assert.ok(result.retreatVoyage);
  assert.equal(result.retreatVoyage!.destinationPlanetId, originPlanet.id);
  assert.equal(result.retreatVoyage!.originPlanetId, currentPlanet.id);
  assert.equal(result.retreatVoyage!.isRetreat, true);
  assert.deepEqual(result.retreatVoyage!.cargo, v.cargo);
});

test("attack, win: Gold-tier weapon vs Grey-tier opponent wins even at each side's worst-case roll -- no mutation, no retreat", () => {
  // Gold's minimum value (negative variance, random=0): 98.5 * 0.995 = 98.0075.
  // Grey's maximum value (positive variance, random=0): 20.5 * 0.9 = 18.45.
  // 98.0075 >= 18.45 -- an unambiguous win regardless of exact rolls.
  const s = ship({ components: { weapon: weaponComponent(98, "Gold"), engine: null, shield: null, cargoHold: null } });
  const encounter = combatEncounter({ opponentThreatTier: "Grey" });

  const result = resolveCombatChoice(encounter, "attack", voyage(), s, originPlanet, currentPlanet, [], 0, "retreat-1", queueRandom([0, 0]));

  assert.equal(result.combatEncounter.status, "resolved");
  assert.equal(result.combatEncounter.outcome, "win");
  assert.equal(result.updatedShip, s); // same reference -- untouched
  assert.equal(result.updatedCrewMember, null);
  assert.equal(result.retreatVoyage, null);
});

test("attack, win: an exact tie (identical tier, identical roll) favors the player -- same >= convention resolveHazard() uses", () => {
  const s = ship({ components: { weapon: weaponComponent(20, "Grey"), engine: null, shield: null, cargoHold: null } });
  const encounter = combatEncounter({ opponentThreatTier: "Grey" });

  // Both sides: random()=0.5 -> varianceRoll = -0.1 + 0.5*0.2 = 0 -> both
  // values are exactly tierMidpoint("Grey") = 20.5. A true tie.
  const result = resolveCombatChoice(encounter, "attack", voyage(), s, originPlanet, currentPlanet, [], 0, "retreat-1", queueRandom([0.5, 0.5]));
  assert.equal(result.combatEncounter.outcome, "win");
});

test("attack, lose: Blue-tier weapon vs Gold-tier opponent loses even at each side's best-case roll -- weapon durability/tier, ship tier, one random crew member, and a retreat voyage all correctly applied", () => {
  // Player's best case vs opponent's worst case still loses, proving this
  // is a structural loss, not a lucky roll: Blue max (random=1):
  // 80.5 * 1.11 = 89.355. Gold min (random=0): 98.5 * 0.995 = 98.0075.
  // 89.355 < 98.0075 -- loses regardless of the exact rolls.
  const weapon = weaponComponent(76, "Blue"); // qualities all 76 -> aggregate tier is exactly Blue (76-85)
  const s = ship({ tier: "Blue", components: { weapon, engine: null, shield: null, cargoHold: null } });
  const encounter = combatEncounter({ opponentThreatTier: "Gold" });
  const crew = [crewMember("crew-1"), crewMember("crew-2"), crewMember("crew-3")];

  // player roll = 1 (best case), opponent roll = 0 (worst case for
  // opponent, still wins), crew-pick roll = 0.5 -> floor(0.5*3) = 1 ->
  // picks crew[1] ("crew-2").
  const result = resolveCombatChoice(
    encounter,
    "attack",
    voyage(),
    s,
    originPlanet,
    currentPlanet,
    crew,
    10_000,
    "retreat-1",
    queueRandom([1, 0, 0.5]),
  );

  assert.equal(result.combatEncounter.status, "resolved");
  assert.equal(result.combatEncounter.outcome, "lose");

  const expectedDurability = Math.round(76 * (1 - COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT));
  const damagedWeapon = result.updatedShip.components.weapon!;
  assert.equal(damagedWeapon.qualities.durability, expectedDurability);
  assert.equal(damagedWeapon.qualities.purity, 76); // every other quality untouched

  // New aggregate average: (76*4 + expectedDurability) / 5 -> falls in
  // Green (61-75), a real tier drop from Blue -- computeAggregateTier(),
  // not a durability-only shortcut. (At the current 0.15 damage percent,
  // this is (76*4 + 65) / 5 = 73.8.)
  const expectedAverage = (76 * 4 + expectedDurability) / 5;
  assert.ok(expectedAverage >= 61 && expectedAverage <= 75, "test fixture assumption: damage must cross into Green for this test to prove a real tier drop");
  assert.equal(damagedWeapon.tier, "Green");
  // Ship has only this one component installed, so its derived tier
  // matches the weapon's own new tier exactly.
  assert.equal(result.updatedShip.tier, "Green");

  assert.ok(result.updatedCrewMember);
  assert.equal(result.updatedCrewMember!.id, "crew-2");
  assert.equal(result.updatedCrewMember!.unavailableUntil, 10_000 + COMBAT_CREW_UNAVAILABLE_DURATION_HOURS * MS_PER_HOUR);

  assert.ok(result.retreatVoyage);
  assert.equal(result.retreatVoyage!.destinationPlanetId, originPlanet.id);
  assert.equal(result.retreatVoyage!.isRetreat, true);
  assert.deepEqual(result.retreatVoyage!.cargo, voyage().cargo);
});

test("attack, lose: zero owned crew skips the crew consequence gracefully -- no crew-pick roll consumed, retreat still happens", () => {
  const weapon = weaponComponent(76, "Blue");
  const s = ship({ components: { weapon, engine: null, shield: null, cargoHold: null } });
  const encounter = combatEncounter({ opponentThreatTier: "Gold" });

  // Exactly 2 values queued (player + opponent variance rolls only) --
  // if the crew-pick roll fired anyway despite zero owned crew,
  // queueRandom would throw "exhausted" instead of returning cleanly.
  const result = resolveCombatChoice(encounter, "attack", voyage(), s, originPlanet, currentPlanet, [], 0, "retreat-1", queueRandom([1, 0]));

  assert.equal(result.combatEncounter.outcome, "lose");
  assert.equal(result.updatedCrewMember, null);
  assert.ok(result.retreatVoyage);
});

test("attack, lose: no weapon installed is treated as Grey -- weapon damage is skipped (nothing to damage), crew/retreat still apply", () => {
  const s = ship({ components: { weapon: null, engine: null, shield: null, cargoHold: null } });
  const encounter = combatEncounter({ opponentThreatTier: "Gold" });
  const crew = [crewMember("crew-1")];

  const result = resolveCombatChoice(encounter, "attack", voyage(), s, originPlanet, currentPlanet, crew, 0, "retreat-1", queueRandom([0, 0, 0]));

  assert.equal(result.combatEncounter.outcome, "lose");
  assert.equal(result.updatedShip.components.weapon, null);
  assert.equal(result.updatedShip.tier, s.tier); // unchanged -- no component to recompute from
  assert.ok(result.updatedCrewMember);
  assert.ok(result.retreatVoyage);
});

test("attack, lose: a weapon with null durability is left untouched (never coerced to 0), same 'not applicable, not zero' convention as every other quality-handling function", () => {
  const weapon: ShipComponent = {
    id: "weapon-1",
    category: "weapon",
    qualities: { purity: 76, density: 76, potency: 76, durability: null, rarity: 76 },
    tier: "Blue",
  };
  const s = ship({ components: { weapon, engine: null, shield: null, cargoHold: null } });
  const encounter = combatEncounter({ opponentThreatTier: "Gold" });

  const result = resolveCombatChoice(encounter, "attack", voyage(), s, originPlanet, currentPlanet, [], 0, "retreat-1", queueRandom([0, 0]));

  assert.equal(result.combatEncounter.outcome, "lose");
  // Weapon (and therefore ship) is returned exactly as given -- no
  // durability to reduce, so assembleShip()'s recompute never runs.
  assert.equal(result.updatedShip, s);
});

test("opponentThreatTier is never re-rolled at resolution -- only its stored value is read, with variance applied fresh", () => {
  const s = ship({ components: { weapon: weaponComponent(20, "Grey"), engine: null, shield: null, cargoHold: null } });

  // Two encounters share the exact same stored opponentThreatTier but
  // differ in every other field (id/windowIndex) -- if resolution secretly
  // re-rolled a fresh threat tier instead of reading the stored one, an
  // identical random() sequence could produce a different outcome here.
  // It doesn't: both resolve identically.
  const a = combatEncounter({ id: "a", opponentThreatTier: "White", windowIndex: 0 });
  const b = combatEncounter({ id: "b", opponentThreatTier: "White", windowIndex: 3 });

  const resultA = resolveCombatChoice(a, "attack", voyage(), s, originPlanet, currentPlanet, [], 0, "retreat-1", queueRandom([0.3, 0.3]));
  const resultB = resolveCombatChoice(b, "attack", voyage(), s, originPlanet, currentPlanet, [], 0, "retreat-2", queueRandom([0.3, 0.3]));

  assert.equal(resultA.combatEncounter.outcome, resultB.combatEncounter.outcome);
  // Both calls above used a 2-value queueRandom (player + opponent
  // variance rolls only) and neither threw "exhausted" -- proving no
  // third random() call re-rolls a fresh 1-100 threat roll at resolution.
});

// --- Ship Crew Roles amendment: Combat Engineer ---

test("attack, lose: an assigned Combat Engineer mitigates weapon durability damage by COMBAT_ENGINEER_MITIGATION_BY_TIER", () => {
  const weapon = weaponComponent(76, "Blue");
  const s = ship({ components: { weapon, engine: null, shield: null, cargoHold: null } });
  const encounter = combatEncounter({ opponentThreatTier: "Gold" });
  const engineer = crewMember("engineer-1", { tier: "Gold", shipRole: "Combat Engineer", assignedShipId: "ship-1" });

  const result = resolveCombatChoice(encounter, "attack", voyage(), s, originPlanet, currentPlanet, [engineer], 0, "retreat-1", queueRandom([1, 0, 0]));

  const mitigation = COMBAT_ENGINEER_MITIGATION_BY_TIER.find((e) => e.tier === "Gold")!.mitigationPercent;
  const expectedDurability = Math.round(76 * (1 - COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT * (1 - mitigation)));
  const damagedWeapon = result.updatedShip.components.weapon!;
  assert.equal(damagedWeapon.qualities.durability, expectedDurability);

  // Same mitigation fraction reduces the crew-unavailable duration too.
  assert.ok(result.updatedCrewMember);
  assert.equal(
    result.updatedCrewMember!.unavailableUntil,
    0 + COMBAT_CREW_UNAVAILABLE_DURATION_HOURS * (1 - mitigation) * MS_PER_HOUR,
  );
});

test("attack, lose: a Combat Engineer assigned to a DIFFERENT ship provides no mitigation -- full damage applies", () => {
  const weapon = weaponComponent(76, "Blue");
  const s = ship({ components: { weapon, engine: null, shield: null, cargoHold: null } });
  const encounter = combatEncounter({ opponentThreatTier: "Gold" });
  const engineer = crewMember("engineer-1", { tier: "Gold", shipRole: "Combat Engineer", assignedShipId: "some-other-ship" });

  const result = resolveCombatChoice(encounter, "attack", voyage(), s, originPlanet, currentPlanet, [engineer], 0, "retreat-1", queueRandom([1, 0, 0]));

  const expectedDurability = Math.round(76 * (1 - COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT));
  assert.equal(result.updatedShip.components.weapon!.qualities.durability, expectedDurability);
});

// --- Ship Crew Roles amendment: Pilot ---

test("flee: an assigned Pilot speeds up the retreat voyage (arrivesAt strictly sooner than with no pilot)", () => {
  const s = ship({ components: { weapon: weaponComponent(80, "Blue"), engine: null, shield: null, cargoHold: null } });
  const v = voyage();
  const encounter = combatEncounter();
  const pilotCrew = crewMember("pilot-1", { tier: "Gold", shipRole: "Pilot", assignedShipId: "ship-1" });

  const withPilot = resolveCombatChoice(encounter, "flee", v, s, originPlanet, currentPlanet, [pilotCrew], 5000, "retreat-1", queueRandom([]));
  const withoutPilot = resolveCombatChoice(encounter, "flee", v, s, originPlanet, currentPlanet, [], 5000, "retreat-1", queueRandom([]));

  assert.ok(withPilot.retreatVoyage!.arrivesAt < withoutPilot.retreatVoyage!.arrivesAt);
});

test("flee: a Pilot assigned to a DIFFERENT ship has no effect on the retreat voyage's speed", () => {
  const s = ship({ components: { weapon: weaponComponent(80, "Blue"), engine: null, shield: null, cargoHold: null } });
  const v = voyage();
  const encounter = combatEncounter();
  const pilotCrew = crewMember("pilot-1", { tier: "Gold", shipRole: "Pilot", assignedShipId: "some-other-ship" });

  const withUnrelatedPilot = resolveCombatChoice(encounter, "flee", v, s, originPlanet, currentPlanet, [pilotCrew], 5000, "retreat-1", queueRandom([]));
  const withoutPilot = resolveCombatChoice(encounter, "flee", v, s, originPlanet, currentPlanet, [], 5000, "retreat-1", queueRandom([]));

  assert.equal(withUnrelatedPilot.retreatVoyage!.arrivesAt, withoutPilot.retreatVoyage!.arrivesAt);
});
