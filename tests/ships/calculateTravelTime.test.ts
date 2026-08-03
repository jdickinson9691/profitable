import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateTravelTime } from "../../src/ships/calculateTravelTime.ts";
import {
  DISTANCE_TO_TRAVEL_HOURS_PER_UNIT,
  SHIP_TIER_SPEED_MODIFIER,
  PILOT_SPEED_BONUS_BY_TIER,
} from "../../src/data/constants/shipsAndTravelConfig.ts";
import type { Planet } from "../../src/data/types/planet.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { CrewMember } from "../../src/data/types/crewMember.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

function planet(id: string, x: number, y: number): Planet {
  return { id, name: id, producibleResourceIds: ["igneous-ore"], position: { x, y } };
}

function ship(tier: Ship["tier"]): Ship {
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

test("calculateTravelTime() matches a hand-calculated expected value exactly", () => {
  // A 3-4-5 triangle: distance = sqrt(300^2 + 400^2) = 500 exactly.
  const origin = planet("origin", 0, 0);
  const destination = planet("destination", 300, 400);
  const greyModifier = SHIP_TIER_SPEED_MODIFIER.find((e) => e.tier === "Grey")!.travelTimeMultiplier;

  const result = calculateTravelTime(origin, destination, ship("Grey"));

  const expectedMs = 500 * DISTANCE_TO_TRAVEL_HOURS_PER_UNIT * greyModifier * MS_PER_HOUR;
  assert.ok(Math.abs(result - expectedMs) < 1e-9);
});

test("calculateTravelTime() gives a higher-tier ship a strictly shorter travel time than a lower-tier ship on the same route", () => {
  const origin = planet("origin", 0, 0);
  const destination = planet("destination", 300, 400);

  const greyTime = calculateTravelTime(origin, destination, ship("Grey"));
  const goldTime = calculateTravelTime(origin, destination, ship("Gold"));

  assert.ok(goldTime < greyTime);
});

test("calculateTravelTime() uses only 2D distance -- no z axis exists to add", () => {
  // Confirms Planet.position only ever has x/y (a TypeScript-level
  // guarantee, exercised here to document the 2D-only constraint).
  const origin = planet("origin", 0, 0);
  const destination = planet("destination", 3, 4);
  const result = calculateTravelTime(origin, destination, ship("Grey"));
  const expectedMs = 5 * DISTANCE_TO_TRAVEL_HOURS_PER_UNIT * 1.0 * MS_PER_HOUR; // Grey multiplier is 1.0
  assert.ok(Math.abs(result - expectedMs) < 1e-9);
});

test("calculateTravelTime() throws if either planet lacks a generated position", () => {
  const noPosition: Planet = { id: "delta-rigelus", name: "Delta Rigelus", producibleResourceIds: ["igneous-ore"] };
  const withPosition = planet("destination", 100, 100);
  assert.throws(() => calculateTravelTime(noPosition, withPosition, ship("Grey")));
  assert.throws(() => calculateTravelTime(withPosition, noPosition, ship("Grey")));
});

// --- Ship Crew Roles amendment: Pilot ---

function pilot(tier: CrewMember["tier"]): CrewMember {
  return {
    id: "pilot-1",
    hiredByPlayerId: "player-1",
    tier,
    profession: null,
    status: "idle",
    assignedCraftId: null,
    hiredAt: 0,
    lastCheckedAt: 0,
    wageAmount: 10,
    lastPaidAt: 0,
    shipRole: "Pilot",
    assignedShipId: "ship-1",
  };
}

test("calculateTravelTime() with no pilot argument behaves exactly as before the amendment", () => {
  const origin = planet("origin", 0, 0);
  const destination = planet("destination", 300, 400);
  const explicitNull = calculateTravelTime(origin, destination, ship("Grey"), null);
  const omitted = calculateTravelTime(origin, destination, ship("Grey"));
  assert.equal(explicitNull, omitted);
});

test("calculateTravelTime() applies PILOT_SPEED_BONUS_BY_TIER on top of SHIP_TIER_SPEED_MODIFIER", () => {
  const origin = planet("origin", 0, 0);
  const destination = planet("destination", 300, 400);
  const greyModifier = SHIP_TIER_SPEED_MODIFIER.find((e) => e.tier === "Grey")!.travelTimeMultiplier;
  const goldPilotBonus = PILOT_SPEED_BONUS_BY_TIER.find((e) => e.tier === "Gold")!.travelTimeMultiplier;

  const result = calculateTravelTime(origin, destination, ship("Grey"), pilot("Gold"));

  const expectedMs = 500 * DISTANCE_TO_TRAVEL_HOURS_PER_UNIT * greyModifier * goldPilotBonus * MS_PER_HOUR;
  assert.ok(Math.abs(result - expectedMs) < 1e-9);
});

test("calculateTravelTime() with a Grey-tier pilot (1.0 multiplier) matches the no-pilot case exactly", () => {
  const origin = planet("origin", 0, 0);
  const destination = planet("destination", 300, 400);
  const withGreyPilot = calculateTravelTime(origin, destination, ship("Grey"), pilot("Grey"));
  const withoutPilot = calculateTravelTime(origin, destination, ship("Grey"));
  assert.equal(withGreyPilot, withoutPilot);
});
