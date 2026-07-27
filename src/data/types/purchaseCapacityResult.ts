import type { CrewCapacity } from "./crewCapacity.ts";
import type { Wallet } from "./wallet.ts";

// Necessary completion, discovered while implementing Agent 18: its
// contract requires a UI "option to purchase additional capacity" (Phase
// 4 GDD §2.4), but Agent 16's contract never listed a corresponding
// function -- §2.4 decided the mechanic, but no Outputs entry for it
// exists in agent-16-crew-core.md. Since Agent 18 must never implement
// crew logic itself, this belongs in Agent 16's module (src/crew/), not
// presentation -- see purchaseCapacity.ts.
export interface PurchaseCapacitySucceeded {
  purchased: true;
  updatedCapacity: CrewCapacity;
  updatedWallet: Wallet;
}

export interface PurchaseCapacityRejected {
  purchased: false;
  reason: string;
}

export type PurchaseCapacityResult = PurchaseCapacitySucceeded | PurchaseCapacityRejected;
