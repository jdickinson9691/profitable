import type { RefundChance } from "../types/refundChance.ts";

// GDD §3.2 — refund chance per consumed unit, keyed to the refining OUTPUT
// tier (not the input tier).
export const REFUND_CHANCE: readonly RefundChance[] = [
  { tier: "Grey", chance: 0 },
  { tier: "White", chance: 0 },
  { tier: "Green", chance: 0.05 },
  { tier: "Blue", chance: 0.1 },
  { tier: "Purple", chance: 0.15 },
  { tier: "Orange", chance: 0.2 },
  { tier: "Gold", chance: 0.25, secondaryUnitChance: 0.2 },
];
