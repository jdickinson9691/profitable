import { saveSystem } from "./gameState.ts";
import type { PlanetOwnershipEntry } from "../data/types/planetOwnershipEntry.ts";
import { DEFAULT_PLANET_OWNERSHIP_ENTRY } from "../data/types/planetOwnershipEntry.ts";
import type { Planet } from "../data/types/planet.ts";
import { mergePlanetOwnership } from "../planets/mergePlanetOwnership.ts";
import { MINIMUM_COLONISTS_TO_PRODUCE } from "../data/constants/planetOwnership.ts";

// Colonist-Driven Production (planet-ownership.md). Persisted side-table --
// Planet objects are never persisted directly (galaxy.md's "must not
// persist the generated planet array itself" rule), so colonistCount (a
// real fact set by discrete player actions, not derivable from the seed)
// lives here instead, exactly like galaxyState.ts's discoveredPlanetIds.
//
// Retroactive removal (2026-08-04): citadelLevel/ownedByPlayerId removed
// along with Citadels -- see planet-ownership.md's own retroactive note.
const PLANET_OWNERSHIP_STATE_SAVE_KEY = "profitable:planetOwnershipState";

let planetOwnershipState: Record<string, PlanetOwnershipEntry> =
  (saveSystem.load(PLANET_OWNERSHIP_STATE_SAVE_KEY) as Record<string, PlanetOwnershipEntry> | null) ?? {};

function persist(): void {
  saveSystem.save(PLANET_OWNERSHIP_STATE_SAVE_KEY, planetOwnershipState);
}

export function getPlanetOwnershipEntry(planetId: string): PlanetOwnershipEntry {
  return planetOwnershipState[planetId] ?? DEFAULT_PLANET_OWNERSHIP_ENTRY;
}

export function setPlanetOwnershipEntry(planetId: string, entry: PlanetOwnershipEntry): void {
  planetOwnershipState = { ...planetOwnershipState, [planetId]: entry };
  persist();
}

// The single source of truth every gameplay caller should use instead of
// reading a raw, unmerged Planet -- mirrors getDiscoveredPlanets()'s own
// "normalize the live-read value" pattern.
export function withPlanetOwnership(planet: Planet): Planet {
  return mergePlanetOwnership(planet, planetOwnershipState[planet.id]);
}

// Bootstrap exception (planet-ownership.md): both startingPlanet and
// secondaryDiscoveredPlanet are pre-colonized, applied at the same moment
// loadOrCreateGalaxy() generates a genuinely new seed. Floor-set, not
// overwrite -- colonistCount = max(existing, MINIMUM_COLONISTS_TO_PRODUCE),
// safe to be idempotent/reapplied, never claws back colonists a player
// transported beyond the minimum.
export function ensureBootstrapColonization(planetIds: readonly string[]): void {
  let changed = false;
  const next = { ...planetOwnershipState };
  for (const planetId of planetIds) {
    const existing = next[planetId] ?? DEFAULT_PLANET_OWNERSHIP_ENTRY;
    const floored = Math.max(existing.colonistCount, MINIMUM_COLONISTS_TO_PRODUCE);
    if (floored !== existing.colonistCount || !(planetId in next)) {
      next[planetId] = { ...existing, colonistCount: floored };
      changed = true;
    }
  }
  if (changed) {
    planetOwnershipState = next;
    persist();
  }
}
