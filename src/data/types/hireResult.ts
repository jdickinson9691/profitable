import type { CrewMember } from "./crewMember.ts";
import type { PlanetCrewPool } from "./planetCrewPool.ts";
import type { Wallet } from "./wallet.ts";

// Necessary completion: Agent 16's contract names `hireCrew(...): CrewMember
// | HireError` but never defines HireError, and a bare CrewMember return
// on success can't also carry the updated pool/wallet a pure function
// must return alongside it. Modeled on the existing CraftResult/
// PurchaseResult pattern (a discriminated union), since capacity-full and
// insufficient-funds are normal business outcomes the caller must always
// handle, not exceptional cases.
export interface HireSucceeded {
  hired: true;
  crewMember: CrewMember;
  updatedPool: PlanetCrewPool;
  updatedWallet: Wallet;
}

export interface HireRejected {
  hired: false;
  reason: string;
}

export type HireResult = HireSucceeded | HireRejected;
