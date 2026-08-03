import type { Wallet } from "./wallet.ts";
import type { PlanetOwnershipEntry } from "./planetOwnershipEntry.ts";

// buildCitadel() never touches Inventory directly -- same boundary craft()
// already holds (it takes pre-resolved ResourceInstance[], never the
// Inventory container itself). The caller checks/consumes materials from
// its own inventory state after a successful result, exactly like
// MarketScene calls removeBatchAt() after sellToMarket() succeeds.
export interface BuildCitadelSucceeded {
  success: true;
  updatedWallet: Wallet;
  updatedOwnershipEntry: PlanetOwnershipEntry;
  materialResourceId: string | null;
  materialQuantityConsumed: number;
}

export interface BuildCitadelRejected {
  success: false;
  reason: string;
}

export type BuildCitadelResult = BuildCitadelSucceeded | BuildCitadelRejected;
