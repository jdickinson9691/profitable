import type { Ship } from "../data/types/ship.ts";
import type { Wallet } from "../data/types/wallet.ts";
import type { Planet } from "../data/types/planet.ts";
import type { RefuelShipResult } from "../data/types/refuelShipResult.ts";
import { REFUEL_COST_PER_UNIT } from "../data/constants/shipsAndTravelConfig.ts";
import { CITADEL_LEVEL_BENEFITS } from "../data/constants/planetOwnership.ts";

// Ship Fuel (profitable-design-questions.md). Same shape as
// purchaseScanner(): checks funds, checks capacity (rejects an over-fill,
// never silently clamps), deducts credits, adds fuel. No pool, no
// tier-rolled candidate, no refresh interval -- a flat-rate resupply
// available at any planet with a shipyard.
//
// dockedPlanet (Citadels amendment, planet-ownership.md): the Level 2+
// refuel-discount benefit. Optional/nullable rather than required --
// every pre-Citadels call site (and every existing test) still means
// "no discount applies," the same "explicit state, no hidden lookup"
// convention resolveComponentRepair() established for its own docked/
// traveling distinction. Only applies when the ship's owner also owns
// the planet -- a citadel benefits its owner, not any docked ship.
export function refuelShip(ship: Ship, wallet: Wallet, amount: number, dockedPlanet: Planet | null = null): RefuelShipResult {
  if (amount <= 0) {
    return { refueled: false, reason: "amount must be positive" };
  }

  const citadelLevel = dockedPlanet && dockedPlanet.ownedByPlayerId === ship.ownerId ? (dockedPlanet.citadelLevel ?? 0) : 0;
  const discountPercent = CITADEL_LEVEL_BENEFITS.find((entry) => entry.level === citadelLevel)?.refuelDiscountPercent ?? 0;
  const cost = Math.round(amount * REFUEL_COST_PER_UNIT * (1 - discountPercent));
  if (wallet.credits < cost) {
    return { refueled: false, reason: `insufficient funds: need ${cost}, have ${wallet.credits}` };
  }

  if (ship.currentFuel + amount > ship.fuelCapacity) {
    return {
      refueled: false,
      reason: `would exceed fuel capacity: ${ship.currentFuel} + ${amount} > ${ship.fuelCapacity}`,
    };
  }

  return {
    refueled: true,
    updatedShip: { ...ship, currentFuel: ship.currentFuel + amount },
    updatedWallet: { ...wallet, credits: wallet.credits - cost },
  };
}
