import type { Ship } from "../data/types/ship.ts";
import type { Planet } from "../data/types/planet.ts";
import type { Wallet } from "../data/types/wallet.ts";
import type { PlanetOwnershipEntry } from "../data/types/planetOwnershipEntry.ts";
import type { TransportColonistsResult } from "../data/types/transportColonistsResult.ts";
import { COLONIST_TRANSPORT_COST } from "../data/constants/planetOwnership.ts";

// Colonist-Driven Production (planet-ownership.md). Requires the ship be
// docked at destinationPlanet -- without this, the ship parameter would
// have no enforced purpose, and "colonists are transported" would be true
// in name only. Colonists have no separate origin/supply -- abstracted as
// "arranged via credits" once docked, not carried from a source planet or
// limited pool (a deliberate simplification, per the design entry).
export function transportColonists(
  ship: Ship,
  destinationPlanet: Planet,
  quantity: number,
  wallet: Wallet,
  currentOwnershipEntry: PlanetOwnershipEntry,
): TransportColonistsResult {
  if (ship.currentPlanetId !== destinationPlanet.id) {
    return { success: false, reason: "ship must be docked at the destination planet to transport colonists" };
  }
  if (quantity <= 0) {
    return { success: false, reason: "quantity must be positive" };
  }

  const cost = quantity * COLONIST_TRANSPORT_COST;
  if (wallet.credits < cost) {
    return { success: false, reason: `insufficient funds: need ${cost}, have ${wallet.credits}` };
  }

  return {
    success: true,
    updatedWallet: { ...wallet, credits: wallet.credits - cost },
    updatedOwnershipEntry: {
      ...currentOwnershipEntry,
      colonistCount: currentOwnershipEntry.colonistCount + quantity,
    },
  };
}
