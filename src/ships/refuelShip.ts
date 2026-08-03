import type { Ship } from "../data/types/ship.ts";
import type { Wallet } from "../data/types/wallet.ts";
import type { RefuelShipResult } from "../data/types/refuelShipResult.ts";
import { REFUEL_COST_PER_UNIT } from "../data/constants/shipsAndTravelConfig.ts";

// Ship Fuel (profitable-design-questions.md). Same shape as
// purchaseScanner(): checks funds, checks capacity (rejects an over-fill,
// never silently clamps), deducts credits, adds fuel. No pool, no
// tier-rolled candidate, no refresh interval -- a flat-rate resupply
// available at any planet with a shipyard.
export function refuelShip(ship: Ship, wallet: Wallet, amount: number): RefuelShipResult {
  if (amount <= 0) {
    return { refueled: false, reason: "amount must be positive" };
  }

  const cost = amount * REFUEL_COST_PER_UNIT;
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
