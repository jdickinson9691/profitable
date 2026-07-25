import type { TierColor } from "../data/types/tierColor.ts";
import type { RefundChance } from "../data/types/refundChance.ts";
import { REFUND_CHANCE } from "../data/constants/refundChance.ts";

export function getRefundChance(tier: TierColor): RefundChance {
  const refund = REFUND_CHANCE.find((entry) => entry.tier === tier);
  if (!refund) {
    throw new RangeError(`no refund chance entry for tier ${tier}`);
  }
  return refund;
}
