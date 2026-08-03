import type { Ship } from "../data/types/ship.ts";
import type { Planet } from "../data/types/planet.ts";
import type { PlanetOwnershipEntry } from "../data/types/planetOwnershipEntry.ts";
import type { ClaimPlanetResult } from "../data/types/claimPlanetResult.ts";
import { MINIMUM_COLONISTS_TO_PRODUCE } from "../data/constants/planetOwnership.ts";

// Citadels (planet-ownership.md). Requires the claiming ship be docked at
// planet, same reasoning as transportColonists() -- claiming a planet
// you're not at makes no more sense than colonizing one you're not at.
// Single-player-only concern as designed; contested claims once
// Multiplayer exists are explicitly not resolved here.
export function claimPlanet(
  ship: Ship,
  planet: Planet,
  playerId: string,
  currentOwnershipEntry: PlanetOwnershipEntry,
): ClaimPlanetResult {
  if (ship.currentPlanetId !== planet.id) {
    return { success: false, reason: "ship must be docked at the planet to claim it" };
  }
  if (currentOwnershipEntry.colonistCount < MINIMUM_COLONISTS_TO_PRODUCE) {
    return { success: false, reason: "planet must be sufficiently colonized before it can be claimed" };
  }
  if (currentOwnershipEntry.ownedByPlayerId !== null) {
    return { success: false, reason: "planet is already claimed" };
  }

  return {
    success: true,
    updatedOwnershipEntry: { ...currentOwnershipEntry, ownedByPlayerId: playerId },
  };
}
