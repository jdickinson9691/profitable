import type { ResourceQuantityCapByTier } from "../types/resourceQuantityCapByTier.ts";

// Per-Resource Quantity Caps. Adds a gradient on top of the existing binary
// colonist gate (planet-ownership.md): a colonized planet was previously
// infinitely gatherable per resource until the next reset; each producible
// resource now also carries a max-units-per-cycle cap, assigned by the
// planet's own tier (generateResourcesForCycle(), planetResourceCycle.ts).
// Exempt entirely: the starting-planet tutorial guarantee's 3 resources
// (applyTutorialGuarantee() overrides their cap to null/uncapped, matching
// its existing quality-clamp treatment -- the tutorial chain must never be
// blockable by depletion). Originated default, tunable -- same status as
// every other Section 2 alpha-tuning number, not yet feel-tuned.
export const RESOURCE_QUANTITY_CAP_BY_TIER: readonly ResourceQuantityCapByTier[] = [
  { tier: "Grey", cap: 20 },
  { tier: "White", cap: 35 },
  { tier: "Green", cap: 50 },
  { tier: "Blue", cap: 75 },
  { tier: "Purple", cap: 110 },
  { tier: "Orange", cap: 160 },
  { tier: "Gold", cap: 230 },
];
export function setResourceQuantityCapForTier(tier: ResourceQuantityCapByTier["tier"], cap: number): void {
  const entry = RESOURCE_QUANTITY_CAP_BY_TIER.find((e) => e.tier === tier);
  if (entry) entry.cap = cap;
}
