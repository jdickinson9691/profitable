// Colonist-Driven Production / Citadels (planet-ownership.md). One entry
// per planet that has ever had colonists transported, been claimed, or had
// a Citadel built -- planets with no entry are treated as the defaults
// below (0 colonists, no citadel, unowned), never requiring an entry to
// exist just to read a planet's ownership state.
export interface PlanetOwnershipEntry {
  colonistCount: number;
  citadelLevel: 0 | 1 | 2 | 3;
  ownedByPlayerId: string | null;
}

export const DEFAULT_PLANET_OWNERSHIP_ENTRY: PlanetOwnershipEntry = {
  colonistCount: 0,
  citadelLevel: 0,
  ownedByPlayerId: null,
};
