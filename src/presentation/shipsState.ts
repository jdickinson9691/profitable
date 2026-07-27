import { saveSystem } from "./gameState.ts";
import { startingPlanet } from "./galaxyState.ts";
import { loadShipsContent } from "../ships/loadShipsContent.ts";
import type { LoadedShipsContent } from "../ships/loadShipsContent.ts";
import { refreshShipyardPool } from "../ships/refreshShipyardPool.ts";
import type { Ship } from "../data/types/ship.ts";
import type { ShipyardPool } from "../data/types/shipyardPool.ts";
import type { Voyage } from "../data/types/voyage.ts";
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
