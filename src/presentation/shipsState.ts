import { saveSystem } from "./gameState.ts";
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
import { SHIPYARD_POOL_REFRESH_INTERVAL_HOURS, SCANNER_POOL_REFRESH_INTERVAL_HOURS } from "../data/constants/shipsAndTravelConfig.ts";
import componentRecipes from "../../content/componentRecipes.json" with { type: "json" };

const MS_PER_HOUR = 60 * 60 * 1000;

// Agent 22's own cross-scene state, same pattern crewState.ts/tradingState.ts
// already established. The shipyard pool is keyed per planet (below) --
// planet-aware fix, see ShipyardScene.ts -- generated on demand for
// whichever planet is actually requested, not just startingPlanet. The
// owned ship roster and active voyages aren't planet-scoped, since a ship
// (once purchased) and its voyages belong to the player, not to any one
// planet.

// Renamed from "profitable:shipyardPool": that key held one ShipyardPool
// total, always for startingPlanet. This holds a per-planet map instead,
// so an old save's single pool is simply regenerated fresh under the new
// key rather than misread as a map.
const SHIPYARD_POOLS_SAVE_KEY = "profitable:shipyardPoolsByPlanet";
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

let shipyardPoolsByPlanet: Record<string, ShipyardPool> =
  (saveSystem.load(SHIPYARD_POOLS_SAVE_KEY) as Record<string, ShipyardPool> | null) ?? {};
let roster: Ship[] = (saveSystem.load(SHIP_ROSTER_SAVE_KEY) as Ship[] | null) ?? [];
let voyages: Voyage[] = (saveSystem.load(VOYAGES_SAVE_KEY) as Voyage[] | null) ?? [];

// Generates a planet's pool on first request and persists it, the same
// "load or create, then cache" behavior the old single-pool
// getShipyardPool() had -- just keyed per planet now instead of assuming
// startingPlanet. Re-rolls a fresh pool once
// SHIPYARD_POOL_REFRESH_INTERVAL_HOURS has elapsed since the stored
// pool's own lastRefreshedAt -- a real, previously-missing check (the
// constant existed and was tunable, but nothing ever compared elapsed
// time against it, so a planet's pool never refreshed for the rest of a
// session once generated, despite travel.md's own documentation claiming
// it did). `now` is injectable, same pattern every other time-aware
// function here uses.
export function getShipyardPool(planetId: string, now: number = Date.now()): ShipyardPool {
  const stored = shipyardPoolsByPlanet[planetId];
  if (stored && (now - stored.lastRefreshedAt) / MS_PER_HOUR < SHIPYARD_POOL_REFRESH_INTERVAL_HOURS) {
    return stored;
  }
  const pool = refreshShipyardPool(planetId, undefined, now);
  setShipyardPool(planetId, pool);
  return pool;
}

export function setShipyardPool(planetId: string, next: ShipyardPool): void {
  shipyardPoolsByPlanet = { ...shipyardPoolsByPlanet, [planetId]: next };
  saveSystem.save(SHIPYARD_POOLS_SAVE_KEY, shipyardPoolsByPlanet);
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
// call-out). Keyed per planet (below), same planet-aware fix as the
// shipyard pool -- see ShipyardScene.ts. Owned scanners aren't
// planet-scoped, same as the ship roster -- once purchased, a scanner
// belongs to the player, usable from wherever their ship is currently
// docked.

// Renamed from "profitable:scannerPool": that key held one ScannerPool
// total, always for startingPlanet. This holds a per-planet map instead.
const SCANNER_POOLS_SAVE_KEY = "profitable:scannerPoolsByPlanet";
const SCANNER_ROSTER_SAVE_KEY = "profitable:scannerRoster";

let scannerPoolsByPlanet: Record<string, ScannerPool> =
  (saveSystem.load(SCANNER_POOLS_SAVE_KEY) as Record<string, ScannerPool> | null) ?? {};
let ownedScanners: Scanner[] = (saveSystem.load(SCANNER_ROSTER_SAVE_KEY) as Scanner[] | null) ?? [];

// Generates a planet's pool on first request and persists it, the same
// "load or create, then cache" behavior the old single-pool
// getScannerPool() had -- just keyed per planet now instead of assuming
// startingPlanet. Re-rolls a fresh pool once
// SCANNER_POOL_REFRESH_INTERVAL_HOURS has elapsed since the stored
// pool's own lastRefreshedAt -- same previously-missing check the
// shipyard/crew pools also lacked; see getShipyardPool()'s own comment.
export function getScannerPool(planetId: string, now: number = Date.now()): ScannerPool {
  const stored = scannerPoolsByPlanet[planetId];
  if (stored && (now - stored.lastRefreshedAt) / MS_PER_HOUR < SCANNER_POOL_REFRESH_INTERVAL_HOURS) {
    return stored;
  }
  const pool = refreshScannerPool(planetId, undefined, now);
  setScannerPool(planetId, pool);
  return pool;
}

export function setScannerPool(planetId: string, next: ScannerPool): void {
  scannerPoolsByPlanet = { ...scannerPoolsByPlanet, [planetId]: next };
  saveSystem.save(SCANNER_POOLS_SAVE_KEY, scannerPoolsByPlanet);
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
