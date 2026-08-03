import type { Ship } from "./ship.ts";
import type { Wallet } from "./wallet.ts";

export interface RefuelShipSucceeded {
  refueled: true;
  updatedShip: Ship;
  updatedWallet: Wallet;
}

export interface RefuelShipRejected {
  refueled: false;
  reason: string;
}

export type RefuelShipResult = RefuelShipSucceeded | RefuelShipRejected;
