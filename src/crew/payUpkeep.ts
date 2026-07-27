import type { CrewMember } from "../data/types/crewMember.ts";
import type { Wallet } from "../data/types/wallet.ts";
import type { PaymentResult } from "../data/types/paymentResult.ts";
import { WAGE_PAYMENT_INTERVAL_HOURS } from "../data/constants/crewConfig.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

// Phase 4 GDD §2.6. A single wage payment per call, gated on whether a
// full interval has elapsed since lastPaidAt -- not a catch-up sum of
// however many intervals were missed, keeping this simple and matching
// the contract's literal "deducts the crew member's wageAmount... at the
// tunable interval" (singular). checkAttrition (not this function) is
// what turns a run of missed payments into departure.
export function payUpkeep(crewMember: CrewMember, wallet: Wallet, currentTime: number): PaymentResult {
  const elapsedHours = (currentTime - crewMember.lastPaidAt) / MS_PER_HOUR;
  if (elapsedHours < WAGE_PAYMENT_INTERVAL_HOURS) {
    return { status: "not-due" };
  }

  if (wallet.credits < crewMember.wageAmount) {
    return { status: "insufficient-funds" };
  }

  return {
    status: "paid",
    updatedCrewMember: { ...crewMember, lastPaidAt: currentTime },
    updatedWallet: { ...wallet, credits: wallet.credits - crewMember.wageAmount },
  };
}
