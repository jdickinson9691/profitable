import type { CrewMember } from "./crewMember.ts";
import type { Wallet } from "./wallet.ts";

// Necessary completion: Agent 16's contract names `payUpkeep(...):
// PaymentResult` but never defines it. Three outcomes, not two -- "not
// due yet" (called before a full WAGE_PAYMENT_INTERVAL_HOURS has
// elapsed) is a normal no-op, distinct from an actual failure
// (insufficient funds), which is what feeds checkAttrition's grace-period
// clock via an unmoved lastPaidAt.
export interface PaymentPaid {
  status: "paid";
  updatedCrewMember: CrewMember;
  updatedWallet: Wallet;
}

export interface PaymentNotDue {
  status: "not-due";
}

export interface PaymentInsufficientFunds {
  status: "insufficient-funds";
}

export type PaymentResult = PaymentPaid | PaymentNotDue | PaymentInsufficientFunds;
