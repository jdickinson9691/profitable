// Colonist-Driven Production (planet-ownership.md). One entry per planet
// that has ever had colonists transported -- planets with no entry are
// treated as the default below (0 colonists), never requiring an entry
// to exist just to read a planet's ownership state.
//
// Retroactive removal (2026-08-04): citadelLevel/ownedByPlayerId removed
// along with the whole Citadels sub-system -- see planet-ownership.md's
// own retroactive note for the full account. Colonist-Driven Production
// is unaffected; it never depended on Citadels for anything.
export interface PlanetOwnershipEntry {
  colonistCount: number;
}

export const DEFAULT_PLANET_OWNERSHIP_ENTRY: PlanetOwnershipEntry = {
  colonistCount: 0,
};
