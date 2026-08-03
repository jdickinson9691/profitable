import { test } from "node:test";
import assert from "node:assert/strict";
import { assignToShipRole } from "../../src/ships/assignToShipRole.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { ShipComponent } from "../../src/data/types/shipComponent.ts";
import type { CrewMember } from "../../src/data/types/crewMember.ts";

function component(tier: ShipComponent["tier"], category: ShipComponent["category"]): ShipComponent {
  return { id: `${category}-1`, category, qualities: { purity: 50, density: 50, potency: 50, durability: 50, rarity: 50 }, tier };
}

function ship(overrides: Partial<Ship> = {}): Ship {
  return {
    id: "ship-1",
    name: "Ship-1",
    ownerId: "player-1",
    tier: "Grey",
    currentPlanetId: "delta-rigelus",
    fuelCapacity: 100,
    currentFuel: 100,
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
    ...overrides,
  };
}

// deriveShipTier() re-derives from installed components, ignoring the
// ship's own .tier field -- a real Blue-tier ship for capacity tests.
function blueShip(overrides: Partial<Ship> = {}): Ship {
  return ship({
    components: {
      weapon: component("Blue", "weapon"),
      engine: component("Blue", "engine"),
      shield: component("Blue", "shield"),
      cargoHold: component("Blue", "cargoHold"),
    },
    ...overrides,
  });
}

function crew(id: string, overrides: Partial<CrewMember> = {}): CrewMember {
  return {
    id,
    hiredByPlayerId: "player-1",
    tier: "Grey",
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

test("assignToShipRole() assigns an eligible crew member to an open Pilot slot", () => {
  const result = assignToShipRole(crew("c1"), ship(), "Pilot", []);
  assert.equal(result.assigned, true);
  if (result.assigned) {
    assert.equal(result.updatedCrewMember.shipRole, "Pilot");
    assert.equal(result.updatedCrewMember.assignedShipId, "ship-1");
  }
});

test("assignToShipRole() rejects Crafter for a crew member with no profession", () => {
  const result = assignToShipRole(crew("c1", { profession: null }), ship(), "Crafter", []);
  assert.equal(result.assigned, false);
});

test("assignToShipRole() allows Crafter for a crew member with a profession", () => {
  const result = assignToShipRole(crew("c1", { profession: "Artisan" }), ship(), "Crafter", []);
  assert.equal(result.assigned, true);
});

test("assignToShipRole() rejects the 4 non-Crafter roles for no reason tied to tier/profession", () => {
  const lowTierNoProfession = crew("c1", { tier: "Grey", profession: null });
  for (const role of ["Pilot", "Combat Engineer", "Science Officer", "Systems Engineer"] as const) {
    const result = assignToShipRole(lowTierNoProfession, ship(), role, []);
    assert.equal(result.assigned, true, `expected ${role} to be assignable`);
  }
});

test("assignToShipRole() rejects when the role's slot on this ship is already full", () => {
  // Grey tier: pilot capacity is 1.
  const roster = [crew("c1", { shipRole: "Pilot", assignedShipId: "ship-1" })];
  const result = assignToShipRole(crew("c2"), ship(), "Pilot", roster);
  assert.equal(result.assigned, false);
});

test("assignToShipRole() ignores assignments to a DIFFERENT ship when checking capacity", () => {
  const roster = [crew("c1", { shipRole: "Pilot", assignedShipId: "some-other-ship" })];
  const result = assignToShipRole(crew("c2"), ship(), "Pilot", roster);
  assert.equal(result.assigned, true);
});

test("assignToShipRole() treats Combat Engineer and Science Officer as one combined pool", () => {
  // Grey tier: combatEngineerOrScienceOfficer capacity is 1 (either, not both).
  const roster = [crew("c1", { shipRole: "Combat Engineer", assignedShipId: "ship-1" })];
  const result = assignToShipRole(crew("c2"), ship(), "Science Officer", roster);
  assert.equal(result.assigned, false);
});

test("assignToShipRole() allows both Combat Engineer and Science Officer once the pool grows to 2 (Blue+)", () => {
  const roster = [crew("c1", { shipRole: "Combat Engineer", assignedShipId: "ship-1" })];
  const result = assignToShipRole(crew("c2"), blueShip(), "Science Officer", roster);
  assert.equal(result.assigned, true);
});

test("assignToShipRole() excludes the crew member's own prior assignment from the capacity count", () => {
  // c1 already holds the one Pilot slot on this ship -- reassigning c1 to
  // Pilot again must not be rejected as "full" against itself.
  const roster = [crew("c1", { shipRole: "Pilot", assignedShipId: "ship-1" })];
  const result = assignToShipRole(crew("c1", { shipRole: "Pilot", assignedShipId: "ship-1" }), ship(), "Pilot", roster);
  assert.equal(result.assigned, true);
});

test("assignToShipRole() does not mutate the input CrewMember", () => {
  const c = crew("c1");
  const snapshot = JSON.parse(JSON.stringify(c));
  assignToShipRole(c, ship(), "Pilot", []);
  assert.deepEqual(c, snapshot);
});
