import type { Ship } from "../data/types/ship.ts";
import type { Planet } from "../data/types/planet.ts";
import type { Wallet } from "../data/types/wallet.ts";
import type { PlanetOwnershipEntry } from "../data/types/planetOwnershipEntry.ts";
import type { BuildCitadelResult } from "../data/types/buildCitadelResult.ts";
import { CITADEL_LEVEL_BENEFITS } from "../data/constants/planetOwnership.ts";

// Citadels (planet-ownership.md). Requires the building ship be docked at
// planet, same reasoning as claimPlanet()/transportColonists(). Requires
// ownership, requires targetLevel === citadelLevel + 1 (sequential, no
// level-skipping). Never touches Inventory directly -- same boundary
// craft() already holds; materialQuantityAvailable is pre-resolved by the
// caller (totalQuantity(inventory, materialResourceId)), and a successful
// result reports what to consume, leaving the actual consume() call to the
// caller, exactly like MarketScene does after sellToMarket() succeeds.
export function buildCitadel(
  ship: Ship,
  planet: Planet,
  targetLevel: 1 | 2 | 3,
  wallet: Wallet,
  materialQuantityAvailable: number,
  currentOwnershipEntry: PlanetOwnershipEntry,
): BuildCitadelResult {
  if (ship.currentPlanetId !== planet.id) {
    return { success: false, reason: "ship must be docked at the planet to build its Citadel" };
  }
  if (currentOwnershipEntry.ownedByPlayerId === null) {
    return { success: false, reason: "planet must be claimed before a Citadel can be built" };
  }
  if (targetLevel !== currentOwnershipEntry.citadelLevel + 1) {
    return { success: false, reason: `must build sequentially: expected level ${currentOwnershipEntry.citadelLevel + 1}, got ${targetLevel}` };
  }

  const benefit = CITADEL_LEVEL_BENEFITS.find((entry) => entry.level === targetLevel);
  if (!benefit) {
    throw new RangeError(`no CITADEL_LEVEL_BENEFITS entry for level ${targetLevel}`);
  }

  const { credits, material } = benefit.constructionCost;
  if (wallet.credits < credits) {
    return { success: false, reason: `insufficient funds: need ${credits}, have ${wallet.credits}` };
  }
  if (material && materialQuantityAvailable < material.quantity) {
    return {
      success: false,
      reason: `insufficient ${material.resourceId}: need ${material.quantity}, have ${materialQuantityAvailable}`,
    };
  }

  return {
    success: true,
    updatedWallet: { ...wallet, credits: wallet.credits - credits },
    updatedOwnershipEntry: { ...currentOwnershipEntry, citadelLevel: targetLevel },
    materialResourceId: material?.resourceId ?? null,
    materialQuantityConsumed: material?.quantity ?? 0,
  };
}
