import type { Planet } from "../data/types/planet.ts";
import type { PlanetOwnershipEntry } from "../data/types/planetOwnershipEntry.ts";
import { DEFAULT_PLANET_OWNERSHIP_ENTRY } from "../data/types/planetOwnershipEntry.ts";

// Colonist-Driven Production / Citadels (planet-ownership.md). Merges a
// persisted planetOwnershipState entry onto a freshly-generated Planet at
// read time -- the same "normalize the live-read value, never trust the
// regenerated object's own field" pattern getDiscoveredPlanets() already
// established for `discovered`. Pure function: the SaveSystem-backed
// lookup lives in the caller (src/presentation/planetOwnershipState.ts).
export function mergePlanetOwnership(planet: Planet, entry: PlanetOwnershipEntry | undefined): Planet {
  const resolved = entry ?? DEFAULT_PLANET_OWNERSHIP_ENTRY;
  return {
    ...planet,
    colonistCount: resolved.colonistCount,
    citadelLevel: resolved.citadelLevel,
    ownedByPlayerId: resolved.ownedByPlayerId,
  };
}
