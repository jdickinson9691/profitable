import type { TierColor } from "./tierColor.ts";

// Per-Resource Quantity Caps (planet-ownership.md's colonist gate amendment
// -- the gate itself is binary/colonized-or-not; this adds a gradient on
// top of it). Max units of a given resource a planet offers per reset
// cycle, by the planet's own tier -- same "better = more" pattern
// RESOURCE_SUBSET_PERCENTAGE already uses for subset size.
export interface ResourceQuantityCapByTier {
  tier: TierColor;
  cap: number;
}
