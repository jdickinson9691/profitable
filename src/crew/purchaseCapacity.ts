import type { CrewCapacity } from "../data/types/crewCapacity.ts";
import type { Wallet } from "../data/types/wallet.ts";
import type { PurchaseCapacityResult } from "../data/types/purchaseCapacityResult.ts";
import {
  CREW_CAPACITY_EXPANSION_BASE_COST,
  CREW_CAPACITY_EXPANSION_COST_MULTIPLIER,
} from "../data/constants/crewConfig.ts";

// Phase 4 GDD §2.4. Necessary completion -- see purchaseCapacityResult.ts.
// The Nth purchased slot (0-indexed by capacity.purchasedSlots) costs
// CREW_CAPACITY_EXPANSION_BASE_COST * CREW_CAPACITY_EXPANSION_COST_MULTIPLIER^N,
// matching crewConfig.ts's own documented curve.
export function purchaseCapacity(capacity: CrewCapacity, wallet: Wallet): PurchaseCapacityResult {
  const cost = CREW_CAPACITY_EXPANSION_BASE_COST * CREW_CAPACITY_EXPANSION_COST_MULTIPLIER ** capacity.purchasedSlots;

  if (wallet.credits < cost) {
    return { purchased: false, reason: `insufficient funds: need ${Math.ceil(cost)}, have ${wallet.credits}` };
  }

  return {
    purchased: true,
    updatedCapacity: { ...capacity, purchasedSlots: capacity.purchasedSlots + 1 },
    updatedWallet: { ...wallet, credits: wallet.credits - cost },
  };
}
