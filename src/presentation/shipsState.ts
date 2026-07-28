import { saveSystem } from "./gameState.ts";
import { startingPlanet } from "./galaxyState.ts";
import { loadShipsContent } from "../ships/loadShipsContent.ts";
import type { LoadedShipsContent } from "../ships/loadShipsContent.ts";
import { refreshShipyardPool } from "../ships/refreshShipyardPool.ts";
import { refreshScannerPool } from "../ships/refreshScannerPool.ts";
import type { Ship } from "../data/types/ship.ts";
import type { ShipyardPool } from "../data/types/shipyardPool.ts";
import type { Voyage } from "../data/types/voyage.ts";
import type { ScannerPool } from "../data/types/scannerPool.ts";
import type { Scanner } from "../data/types/scanner.ts";
import type { CombatEncounter } from "../data/types/combatEncounter.ts";
import componentRecipes from "../../content/componentRecipes.json" with { type: "json" };

// Agent 22's own cross-scene state, same pattern crewState.ts/tradingState.ts
// already established. The shipyard pool is scoped to startingPlanet only
// (the one planet a player can browse without traveling there first) --
// same boundary Agent 13/18 already drew for their own state. The owned
// ship roster and active voyages aren't planet-scoped, since a ship (once
// purchased) and its voyages belong to the player, not to any one planet.

const SHIPYARD_POOL_SAVE_KEY = "profitable:shipyardPool";
const SHIP_ROSTER_SAVE_KEY = "profitable:shipRoster";
const VOYAGES_SAVE_KEY = "profitable:voyages";

// Mirrors tradingState.ts's getTradingContent() exact shape: statically
// imports the one Phase 5 content file loadShipsContent() needs and hands
// it straight through, cached after the first call.
let cachedShipsContent: LoadedShipsContent | null = null;
export function getShipsContent(): LoadedShipsContent {
  if (!cachedShipsContent) {
    cachedShipsContent = loadShipsContent({ componentRecipes });
  }
  return cachedShipsContent;
}

function loadOrCreatePool(): ShipyardPool {
  const stored = saveSystem.load(SHIPYARD_POOL_SAVE_KEY) as ShipyardPool | null;
  if (stored) return stored;
  const pool = refreshShipyardPool(startingPlanet.id);
  saveSystem.save(SHIPYARD_POOL_SAVE_KEY, pool);
  return pool;
}

let pool: ShipyardPool = loadOrCreatePool();
let roster: Ship[] = (saveSystem.load(SHIP_ROSTER_SAVE_KEY) as Ship[] | null) ?? [];
let voyages: Voyage[] = (saveSystem.load(VOYAGES_SAVE_KEY) as Voyage[] | null) ?? [];

export function getShipyardPool(): ShipyardPool {
  return pool;
}

export function setShipyardPool(next: ShipyardPool): void {
  pool = next;
  saveSystem.save(SHIPYARD_POOL_SAVE_KEY, pool);
}

export function getShipRoster(): Ship[] {
  return roster;
}

export function setShipRoster(next: Ship[]): void {
  roster = next;
  saveSystem.save(SHIP_ROSTER_SAVE_KEY, roster);
}

export function addShip(ship: Ship): void {
  setShipRoster([...roster, ship]);
}

export function replaceShip(next: Ship): void {
  setShipRoster(roster.map((ship) => (ship.id === next.id ? next : ship)));
}

export function getVoyages(): Voyage[] {
  return voyages;
}

export function setVoyages(next: Voyage[]): void {
  voyages = next;
  saveSystem.save(VOYAGES_SAVE_KEY, voyages);
}

export function addVoyage(voyage: Voyage): void {
  setVoyages([...voyages, voyage]);
}

export function removeVoyage(id: string): void {
  setVoyages(voyages.filter((voyage) => voyage.id !== id));
}

// Scanner/Probe amendment: same cross-scene state pattern as the shipyard
// pool/roster above, applied to scanners' own separate pool (ScannerPool,
// not merged into ShipyardPool, per the Scanner GDD §2.2's explicit
// call-out). Also scoped to startingPlanet only, same reasoning as the
// shipyard pool -- the one planet a player can browse without traveling
// there first. Owned scanners aren't planet-scoped, same as the ship
// roster -- once purchased, a scanner belongs to the player, usable from
// wherever their ship is currently docked.

const SCANNER_POOL_SAVE_KEY = "profitable:scannerPool";
const SCANNER_ROSTER_SAVE_KEY = "profitable:scannerRoster";

function loadOrCreateScannerPool(): ScannerPool {
  const stored = saveSystem.load(SCANNER_POOL_SAVE_KEY) as ScannerPool | null;
  if (stored) return stored;
  const pool = refreshScannerPool(startingPlanet.id);
  saveSystem.save(SCANNER_POOL_SAVE_KEY, pool);
  return pool;
}

let scannerPool: ScannerPool = loadOrCreateScannerPool();
let ownedScanners: Scanner[] = (saveSystem.load(SCANNER_ROSTER_SAVE_KEY) as Scanner[] | null) ?? [];

export function getScannerPool(): ScannerPool {
  return scannerPool;
}

export function setScannerPool(next: ScannerPool): void {
  scannerPool = next;
  saveSystem.save(SCANNER_POOL_SAVE_KEY, scannerPool);
}

export function getOwnedScanners(): Scanner[] {
  return ownedScanners;
}

export function setOwnedScanners(next: Scanner[]): void {
  ownedScanners = next;
  saveSystem.save(SCANNER_ROSTER_SAVE_KEY, ownedScanners);
}

export function addScanner(scanner: Scanner): void {
  setOwnedScanners([...ownedScanners, scanner]);
}

// Combat amendment (Agent 22): a pending CombatEncounter waiting on the
// player's attack/flee choice, paired with a snapshot of the Voyage it was
// detected on. Necessary completion: CombatEncounter itself only carries a
// bare `voyageId` (Agent 1's own contract), but resolveCombatChoice() needs
// the actual origin/destination/cargo to build a retreat voyage -- and by
// the time a combat encounter surfaces here, resolveArrival() has already
// removed the original Voyage from `voyages` (arrival processing completes
// in full regardless of a pending combat, per Agent 20's own contract).
// The snapshot kept here is presentation-only state, not a second copy of
// anything Core persists.
export interface PendingCombat {
  encounter: CombatEncounter;
  voyage: Voyage;
}

const PENDING_COMBATS_SAVE_KEY = "profitable:pendingCombats";
let pendingCombats: PendingCombat[] = (saveSystem.load(PENDING_COMBATS_SAVE_KEY) as PendingCombat[] | null) ?? [];

export function getPendingCombats(): PendingCombat[] {
  return pendingCombats;
}

export function setPendingCombats(next: PendingCombat[]): void {
  pendingCombats = next;
  saveSystem.save(PENDING_COMBATS_SAVE_KEY, pendingCombats);
}

export function addPendingCombat(pending: PendingCombat): void {
  setPendingCombats([...pendingCombats, pending]);
}

export function removePendingCombat(combatEncounterId: string): void {
  setPendingCombats(pendingCombats.filter((pending) => pending.encounter.id !== combatEncounterId));
}
