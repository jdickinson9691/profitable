import type { Wallet } from "./wallet.ts";
import type { PlanetOwnershipEntry } from "./planetOwnershipEntry.ts";

export interface TransportColonistsSucceeded {
  success: true;
  updatedWallet: Wallet;
  updatedOwnershipEntry: PlanetOwnershipEntry;
}

export interface TransportColonistsRejected {
  success: false;
  reason: string;
}

export type TransportColonistsResult = TransportColonistsSucceeded | TransportColonistsRejected;
