import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performScan } from "../../src/ships/performScan.ts";
import { purchaseScanner } from "../../src/ships/purchaseScanner.ts";
import { deriveShipTier } from "../../src/ships/deriveShipTier.ts";
import type { Ship } from "../../src/data/types/ship.ts";
import type { Planet } from "../../src/data/types/planet.ts";
import type { Scanner } from "../../src/data/types/scanner.ts";
import type { ScannerCandidate } from "../../src/data/types/scannerCandidate.ts";
import type { ScannerPool } from "../../src/data/types/scannerPool.ts";
import type { Wallet } from "../../src/data/types/wallet.ts";
import type { ScanSucceeded } from "../../src/data/types/performScanResult.ts";
import type { CrewMember } from "../../src/data/types/crewMember.ts";
import {
  SCANNER_BASE_SCAN_RADIUS,
  SCANNER_TIER_RADIUS_BONUS,
  SCIENCE_OFFICER_RADIUS_BONUS_BY_TIER,
} from "../../src/data/constants/shipsAndTravelConfig.ts";

const SRC_DIR = join(import.meta.dirname, "../../src");

function radiusBonus(tier: Scanner["tier"]): number {
  return SCANNER_TIER_RADIUS_BONUS.find((e) => e.tier === tier)!.radiusBonus;
}

function ship(overrides: Partial<Ship> = {}): Ship {
  return {
    id: "ship-1",
    name: "Ship-1",
    ownerId: "player-1",
    tier: "Grey",
    fuelCapacity: 100,
    currentFuel: 100,
    currentPlanetId: "delta-rigelus",
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
    ...overrides,
  };
}

function dockedPlanet(overrides: Partial<Planet> = {}): Planet {
  return {
    id: "delta-rigelus",
    name: "Delta Rigelus",
    producibleResourceIds: ["igneous-ore"],
    planetType: "Terrestrial",
    tier: "Blue",
    position: { x: 0, y: 0 },
    specialtyResourceId: "igneous-ore",
    discovered: true,
    ...overrides,
  };
}

function planetAt(id: string, x: number, y: number, discovered = false): Planet {
  return { id, name: id, producibleResourceIds: ["igneous-ore"], position: { x, y }, discovered };
}

function scanner(tier: Scanner["tier"], id = `scanner-${tier}`): Scanner {
  return { id, tier, ownerId: "player-1" };
}

function scienceOfficer(tier: CrewMember["tier"]): CrewMember {
  return {
    id: "science-officer-1",
    hiredByPlayerId: "player-1",
    tier,
    profession: null,
    status: "idle",
    assignedCraftId: null,
    hiredAt: 0,
    lastCheckedAt: 0,
    wageAmount: 10,
    lastPaidAt: 0,
    shipRole: "Science Officer",
    assignedShipId: "ship-1",
  };
}

test("performScan() rejects when the ship is not docked at the given planet", () => {
  const result = performScan(ship({ currentPlanetId: "elsewhere" }), dockedPlanet(), [scanner("Blue")], []);
  assert.equal(result.scanned, false);
});

test("performScan() rejects when the docked planet is not yet discovered", () => {
  const result = performScan(ship(), dockedPlanet({ discovered: false }), [scanner("Blue")], []);
  assert.equal(result.scanned, false);
});

test("performScan() rejects when no scanner is owned", () => {
  const result = performScan(ship(), dockedPlanet(), [], []);
  assert.equal(result.scanned, false);
});

test("performScan() effective radius matches a hand-calculated value (base + tier bonus) across several tiers", () => {
  for (const tier of ["White", "Blue", "Gold"] as const) {
    const expectedRadius = SCANNER_BASE_SCAN_RADIUS + radiusBonus(tier);
    const justInside = planetAt("inside", expectedRadius, 0);
    const justOutside = planetAt("outside", expectedRadius + 1, 0);

    const result = performScan(ship(), dockedPlanet(), [scanner(tier)], [justInside, justOutside]) as ScanSucceeded;

    assert.equal(result.scanned, true);
    assert.deepEqual(
      result.newlyDiscovered.map((p) => p.id),
      ["inside"],
      `tier ${tier}: expected radius ${expectedRadius}`,
    );
  }
});

test("performScan() boundary: a planet exactly on the radius is discovered, one unit beyond is not", () => {
  const radius = SCANNER_BASE_SCAN_RADIUS + radiusBonus("White");
  const onBoundary = planetAt("on-boundary", radius, 0);
  const justBeyond = planetAt("just-beyond", radius + 1, 0);

  const result = performScan(ship(), dockedPlanet(), [scanner("White")], [onBoundary, justBeyond]) as ScanSucceeded;

  assert.deepEqual(result.newlyDiscovered.map((p) => p.id), ["on-boundary"]);
});

test("performScan() with multiple owned scanners uses only the highest-tier one's radius, not a sum of all owned scanners", () => {
  // White bonus 40, Blue bonus 130 -- correct (max-only) radius is
  // base+130; an incorrectly-summed radius would be base+40+130. A planet
  // placed strictly between those two values proves which one was used.
  const correctRadius = SCANNER_BASE_SCAN_RADIUS + radiusBonus("Blue");
  const summedRadius = SCANNER_BASE_SCAN_RADIUS + radiusBonus("White") + radiusBonus("Blue");
  const between = Math.floor((correctRadius + summedRadius) / 2);
  assert.ok(between > correctRadius && between < summedRadius);

  const testPlanet = planetAt("between", between, 0);
  const result = performScan(ship(), dockedPlanet(), [scanner("White"), scanner("Blue", "scanner-blue-2")], [testPlanet]) as ScanSucceeded;

  assert.deepEqual(result.newlyDiscovered, []);
});

test("performScan() returns the exact set of newly-discovered planets, given a known layout, and never touches already-discovered planets", () => {
  const near = planetAt("near", 50, 0, false);
  const alreadyDiscovered = planetAt("already-discovered", 60, 0, true);
  const far = planetAt("far", 10000, 0, false);

  const result = performScan(ship(), dockedPlanet(), [scanner("Blue")], [near, alreadyDiscovered, far]) as ScanSucceeded;

  assert.deepEqual(result.newlyDiscovered.map((p) => p.id), ["near"]);
});

test("guardrail: performScan() never modifies any Planet field other than discovered", () => {
  const before = planetAt("candidate", 10, 0, false);
  const beforeSnapshot = { ...before };

  const result = performScan(ship(), dockedPlanet(), [scanner("Gold")], [before]) as ScanSucceeded;
  const after = result.newlyDiscovered.find((p) => p.id === "candidate")!;

  const changedKeys = (Object.keys(after) as (keyof Planet)[]).filter((key) => after[key] !== beforeSnapshot[key]);
  assert.deepEqual(changedKeys, ["discovered"]);
  assert.equal(after.discovered, true);
  // The original input object is untouched -- performScan() never mutates
  // in place, same immutable-copy convention as purchaseShip()'s
  // updatedPool/updatedWallet.
  assert.deepEqual(before, beforeSnapshot);
});

test("guardrail: deriveShipTier() produces identical output regardless of whether the ship's owner owns a scanner", () => {
  const s = ship({ components: { weapon: null, engine: null, shield: null, cargoHold: null } });
  const tierBefore = deriveShipTier(s);

  // Actually purchase a Gold-tier scanner for the ship's own owner --
  // deriveShipTier() takes only `ship`, so nothing about this purchase can
  // structurally reach it (Scanner lives entirely outside
  // Ship/ShipComponent). Re-deriving after the purchase proves it.
  const candidate: ScannerCandidate = { id: "candidate-gold", tier: "Gold" };
  const pool: ScannerPool = { planetId: "delta-rigelus", availableScanners: [candidate], lastRefreshedAt: 0 };
  const wallet: Wallet = { playerId: s.ownerId, credits: 100000 };
  const purchase = purchaseScanner(candidate, pool, wallet, s.ownerId);
  assert.equal(purchase.purchased, true);

  const tierAfter = deriveShipTier(s);
  assert.equal(tierAfter, tierBefore);
});

test("guardrail: no code in the Scanner amendment references resolveEncounters() or any Travel Encounters type", () => {
  for (const file of ["ships/performScan.ts", "ships/refreshScannerPool.ts", "ships/purchaseScanner.ts"]) {
    const source = readFileSync(join(SRC_DIR, file), "utf8");
    assert.doesNotMatch(source, /resolveEncounters|EncounterResult/, `${file} must not reference Travel Encounters`);
  }
});

// --- Ship Crew Roles amendment: Science Officer ---

test("performScan() with no scienceOfficer argument behaves exactly as before the amendment", () => {
  const withNull = performScan(ship(), dockedPlanet(), [scanner("Blue")], []);
  const omitted = performScan(ship(), dockedPlanet(), [scanner("Blue")], []);
  assert.deepEqual(withNull, omitted);
});

test("performScan() stacks SCIENCE_OFFICER_RADIUS_BONUS_BY_TIER on top of the scanner's own radius bonus", () => {
  const officerBonus = SCIENCE_OFFICER_RADIUS_BONUS_BY_TIER.find((e) => e.tier === "Gold")!.radiusBonus;
  const expectedRadius = SCANNER_BASE_SCAN_RADIUS + radiusBonus("Blue") + officerBonus;
  const justInside = planetAt("inside", expectedRadius, 0);
  const justOutside = planetAt("outside", expectedRadius + 1, 0);

  const result = performScan(
    ship(),
    dockedPlanet(),
    [scanner("Blue")],
    [justInside, justOutside],
    scienceOfficer("Gold"),
  ) as ScanSucceeded;

  assert.deepEqual(result.newlyDiscovered.map((p) => p.id), ["inside"]);
});

test("performScan() still rejects with no scanner owned even with a Science Officer assigned", () => {
  const result = performScan(ship(), dockedPlanet(), [], [], scienceOfficer("Gold"));
  assert.equal(result.scanned, false);
});

test("guardrail: no automatic/passive discovery -- resolveArrival() and initiateVoyage() never reference performScan or mutate Planet.discovered", () => {
  for (const file of ["ships/resolveArrival.ts", "ships/initiateVoyage.ts"]) {
    const source = readFileSync(join(SRC_DIR, file), "utf8");
    assert.doesNotMatch(source, /performScan/, `${file} must never call performScan()`);
    assert.doesNotMatch(source, /discovered/, `${file} must never reference Planet.discovered`);
  }
});
