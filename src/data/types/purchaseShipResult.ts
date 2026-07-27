import type { Ship } from "./ship.ts";
import type { ShipyardPool } from "./shipyardPool.ts";
import type { Wallet } from "./wallet.ts";

// Necessary completion: Agent 20's contract names `purchaseShip(...): Ship
// | PurchaseError` but never defines PurchaseError, and a bare Ship
// return on success can't also carry the updated pool/wallet a pure
// function must return alongside it. Mirrors the existing HireResult
// pattern exactly (Phase 4's equivalent for NPC crew acquisition).
export interface PurchaseShipSucceeded {
  purchased: true;
  ship: Ship;
  updatedPool: ShipyardPool;
  updatedWallet: Wallet;
}

export interface PurchaseShipRejected {
  purchased: false;
  reason: string;
}

export type PurchaseShipResult = PurchaseShipSucceeded | PurchaseShipRejected;
