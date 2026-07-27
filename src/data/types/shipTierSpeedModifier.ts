import type { TierColor } from "./tierColor.ts";

// Phase 5 GDD §2.4 -- ship tier's percentage-based speed modifier,
// expressed as a travel-time multiplier applied to the base (distance-
// only) travel time: Grey = 1.0 (baseline, no bonus), lower multipliers
// at higher tiers mean shorter travel time. Deliberately a single
// multiplier per tier (not an asymmetric negative/positive pair like
// TIER_VARIANCE) since travel time has no random roll to narrow --
// ship tier applies a flat, deterministic modifier, not a variance range.
export interface ShipTierSpeedModifier {
  tier: TierColor;
  travelTimeMultiplier: number;
}
