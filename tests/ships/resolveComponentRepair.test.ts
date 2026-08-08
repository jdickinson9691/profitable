import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveComponentRepair } from "../../src/ships/resolveComponentRepair.ts";
import {
  SYSTEMS_ENGINEER_REPAIR_RATE_BY_TIER,
  CRAFTER_REPAIR_RATE_BY_TIER,
  REPAIR_ELAPSED_TIME_CAP_HOURS,
} from "../../src/data/constants/shipsAndTravelConfig.ts";
import { QUALITY_MAX } from "../../src/data/constants/quality.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { ShipComponent } from "../../src/data/types/shipComponent.ts";
import type { CrewMember } from "../../src/data/types/crewMember.ts";
import type { Voyage } from "../../src/data/types/voyage.ts";

// Ship Crew Roles -- task #89's resolved repair interaction (ship.md's own
// consolidated contract). Proves the additive stacking rule and the
// docked/traveling location gate exactly as specified: Systems Engineer is
// unconditional, Crafter only accrues while traveling and only for its
// matching component category.
//
// Retroactive removal (2026-08-04): this file used to also cover a third
// source, Citadel Level 2/3 repair (docked + owned only), and the
// `dockedPlanet` parameter that carried it -- see planet-ownership.md's
// own retroactive note. Those cases are removed; Systems Engineer and
// Crafter coverage are both unaffected.

const MS_PER_HOUR = 60 * 60 * 1000;
const NOW = 1_000_000_000_000;

function component(durability: number | null, category: ShipComponent["category"] = "weapon"): ShipComponent {
  const qualities = { purity: 50, density: 50, potency: 50, durability, rarity: 50 };
  return { id: `${category}-1`, category, qualities, tier: "Grey" };
}

function ship(overrides: Partial<Ship> = {}): Ship {
  return {
    id: "ship-1",
    name: "Ship-1",
    ownerId: "player-1",
    tier: "Grey",
    currentPlanetId: "planet-a",
    fuelCapacity: 100,
    currentFuel: 100,
    components: { weapon: component(50), engine: null, shield: null, cargoHold: null },
    ...overrides,
  };
}

function crew(overrides: Partial<CrewMember> = {}): CrewMember {
  return {
    id: "crew-1",
    hiredByPlayerId: "player-1",
    tier: "Grey",
    profession: null,
    status: "idle",
    assignedCraftId: null,
    hiredAt: 0,
    lastCheckedAt: 0,
    wageAmount: 0,
    lastPaidAt: 0,
    ...overrides,
  };
}

function voyage(overrides: Partial<Voyage> = {}): Voyage {
  return {
    id: "voyage-1",
    shipId: "ship-1",
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    departedAt: NOW - MS_PER_HOUR,
    arrivesAt: NOW + MS_PER_HOUR,
    cargo: [],
    ...overrides,
  };
}

test("resolveComponentRepair() with no crew leaves durability unchanged but still stamps lastRepairedAt", () => {
  const result = resolveComponentRepair(ship({ lastRepairedAt: NOW - 10 * MS_PER_HOUR }), [], null, NOW);
  assert.equal(result.components.weapon!.qualities.durability, 50);
  assert.equal(result.lastRepairedAt, NOW);
});

test("resolveComponentRepair() Systems Engineer repairs unconditionally while docked", () => {
  const rate = SYSTEMS_ENGINEER_REPAIR_RATE_BY_TIER.find((e) => e.tier === "Grey")!.rate;
  const engineer = crew({ id: "engineer", shipRole: "Systems Engineer", assignedShipId: "ship-1", tier: "Grey" });
  const startShip = ship({ lastRepairedAt: NOW - 4 * MS_PER_HOUR });
  const result = resolveComponentRepair(startShip, [engineer], null, NOW);
  assert.equal(result.components.weapon!.qualities.durability, Math.round(50 + rate * 4));
});

test("resolveComponentRepair() Systems Engineer repairs unconditionally while traveling too", () => {
  const rate = SYSTEMS_ENGINEER_REPAIR_RATE_BY_TIER.find((e) => e.tier === "Grey")!.rate;
  const engineer = crew({ id: "engineer", shipRole: "Systems Engineer", assignedShipId: "ship-1", tier: "Grey" });
  const startShip = ship({ lastRepairedAt: NOW - 4 * MS_PER_HOUR });
  const result = resolveComponentRepair(startShip, [engineer], voyage(), NOW);
  assert.equal(result.components.weapon!.qualities.durability, Math.round(50 + rate * 4));
});

test("resolveComponentRepair() Crafter repairs only its matching category, only while traveling", () => {
  const rate = CRAFTER_REPAIR_RATE_BY_TIER.find((e) => e.tier === "Grey")!.rate;
  const crafter = crew({ id: "crafter", shipRole: "Crafter", assignedShipId: "ship-1", tier: "Grey", profession: "Weaponsmith" });
  const startShip = ship({
    lastRepairedAt: NOW - 4 * MS_PER_HOUR,
    components: { weapon: component(50, "weapon"), engine: component(50, "engine"), shield: null, cargoHold: null },
  });
  const result = resolveComponentRepair(startShip, [crafter], voyage(), NOW);
  assert.equal(result.components.weapon!.qualities.durability, Math.round(50 + rate * 4));
  assert.equal(result.components.engine!.qualities.durability, 50);
});

test("resolveComponentRepair() Crafter has no effect while docked", () => {
  const crafter = crew({ id: "crafter", shipRole: "Crafter", assignedShipId: "ship-1", tier: "Grey", profession: "Weaponsmith" });
  const startShip = ship({ lastRepairedAt: NOW - 4 * MS_PER_HOUR });
  const result = resolveComponentRepair(startShip, [crafter], null, NOW);
  assert.equal(result.components.weapon!.qualities.durability, 50);
});

test("resolveComponentRepair() Systems Engineer and Crafter stack additively while traveling", () => {
  const engineerRate = SYSTEMS_ENGINEER_REPAIR_RATE_BY_TIER.find((e) => e.tier === "Grey")!.rate;
  const crafterRate = CRAFTER_REPAIR_RATE_BY_TIER.find((e) => e.tier === "Grey")!.rate;
  const engineer = crew({ id: "engineer", shipRole: "Systems Engineer", assignedShipId: "ship-1", tier: "Grey" });
  const crafter = crew({ id: "crafter", shipRole: "Crafter", assignedShipId: "ship-1", tier: "Grey", profession: "Weaponsmith" });
  const startShip = ship({ lastRepairedAt: NOW - 4 * MS_PER_HOUR });
  const result = resolveComponentRepair(startShip, [engineer, crafter], voyage(), NOW);
  assert.equal(result.components.weapon!.qualities.durability, Math.round(50 + (engineerRate + crafterRate) * 4));
});

test("resolveComponentRepair() caps elapsed hours at REPAIR_ELAPSED_TIME_CAP_HOURS", () => {
  const rate = SYSTEMS_ENGINEER_REPAIR_RATE_BY_TIER.find((e) => e.tier === "Grey")!.rate;
  const engineer = crew({ id: "engineer", shipRole: "Systems Engineer", assignedShipId: "ship-1", tier: "Grey" });
  const startShip = ship({ lastRepairedAt: NOW - 10_000 * MS_PER_HOUR });
  const result = resolveComponentRepair(startShip, [engineer], null, NOW);
  const expected = Math.min(QUALITY_MAX, Math.round(50 + rate * REPAIR_ELAPSED_TIME_CAP_HOURS));
  assert.equal(result.components.weapon!.qualities.durability, expected);
});

test("resolveComponentRepair() never exceeds QUALITY_MAX", () => {
  const engineer = crew({ id: "engineer", shipRole: "Systems Engineer", assignedShipId: "ship-1", tier: "Gold" });
  const startShip = ship({
    lastRepairedAt: NOW - REPAIR_ELAPSED_TIME_CAP_HOURS * MS_PER_HOUR,
    components: { weapon: component(99), engine: null, shield: null, cargoHold: null },
  });
  const result = resolveComponentRepair(startShip, [engineer], null, NOW);
  assert.equal(result.components.weapon!.qualities.durability, QUALITY_MAX);
});

test("resolveComponentRepair() treats a never-repaired ship (no lastRepairedAt) as zero elapsed time on first call", () => {
  const engineer = crew({ id: "engineer", shipRole: "Systems Engineer", assignedShipId: "ship-1", tier: "Grey" });
  const startShip = ship();
  const result = resolveComponentRepair(startShip, [engineer], null, NOW);
  assert.equal(result.components.weapon!.qualities.durability, 50);
  assert.equal(result.lastRepairedAt, NOW);
});

test("resolveComponentRepair() leaves a component with null durability untouched", () => {
  const engineer = crew({ id: "engineer", shipRole: "Systems Engineer", assignedShipId: "ship-1", tier: "Grey" });
  const startShip = ship({
    lastRepairedAt: NOW - 4 * MS_PER_HOUR,
    components: { weapon: component(null), engine: null, shield: null, cargoHold: null },
  });
  const result = resolveComponentRepair(startShip, [engineer], null, NOW);
  assert.equal(result.components.weapon!.qualities.durability, null);
});

test("resolveComponentRepair() ignores crew assigned to a different ship", () => {
  const engineer = crew({ id: "engineer", shipRole: "Systems Engineer", assignedShipId: "other-ship", tier: "Grey" });
  const startShip = ship({ lastRepairedAt: NOW - 4 * MS_PER_HOUR });
  const result = resolveComponentRepair(startShip, [engineer], null, NOW);
  assert.equal(result.components.weapon!.qualities.durability, 50);
});

test("resolveComponentRepair() recomputes tier when a repair changes the aggregate", () => {
  const engineer = crew({ id: "engineer", shipRole: "Systems Engineer", assignedShipId: "ship-1", tier: "Gold" });
  const startShip = ship({
    lastRepairedAt: NOW - REPAIR_ELAPSED_TIME_CAP_HOURS * MS_PER_HOUR,
    components: { weapon: component(20), engine: null, shield: null, cargoHold: null },
  });
  const result = resolveComponentRepair(startShip, [engineer], null, NOW);
  assert.equal(result.tier, result.components.weapon!.tier);
});
