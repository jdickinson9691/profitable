import type { Resource } from "../data/types/resource.ts";
import type { PlanetType } from "../data/types/planetType.ts";
import type { TierColor } from "../data/types/tierColor.ts";
import type { RandomFn } from "../data/types/random.ts";
import { PLANET_TYPE_ELIGIBILITY } from "../data/constants/planetTypeEligibility.ts";
import { RESOURCE_SUBSET_PERCENTAGE } from "../data/constants/resourceSubsetPercentage.ts";

// Extracted from generatePlanet.ts (Planet Resource Generation amendment):
// both generatePlanet() (cycle 0) and generateResourcesForCycle.ts's
// generateResourcesForCycle() (any cycle) need these three functions, and
// generatePlanet() now calls INTO generateResourcesForCycle() rather than
// duplicating its own copy of subset selection -- keeping these three in
// generatePlanet.ts itself would have made that a circular import
// (generatePlanet.ts -> planetResourceCycle.ts -> generatePlanet.ts).
// Re-exported from generatePlanet.ts unchanged, so no existing import path
// (including the original Phase 2 test suite) needed to change.

// Reconciles the GDD's broad category vocabulary ("Solid"/"Gas"/"Crystal")
// against Resource.category, which stays a free-form string per the MVP's
// Resource type (e.g. "radioactive crystal", "refined-metal"). Matched via
// case-insensitive substring rather than exact equality -- this correctly
// includes raw resources like "radioactive crystal" (containing its broad
// category as a substring).
//
// Bug fix (found auditing the alpha playtest seed's starting planet, whose
// producible list turned out to include Master Crystal Array -- a tier-3
// CRAFTED item -- as if it were gatherable raw produce): the substring
// match alone is not sufficient to exclude refined/crafted outputs.
// content/README.md's own convention sets a refined/crafted resource's
// `category` to its own id (so recipe-input category resolution never
// collides with a second resource) -- and once Alpha's content roster grew
// past the original 2 refined/crafted items, some of those self-referential
// id-as-category strings started accidentally CONTAINING a broad category
// substring (e.g. "master-crystal-array" contains "crystal";
// "polished-crystal-lattice" contains "crystal"; "fusion-gas-mix" contains
// "gas"). The original version of this comment claimed the substring match
// "correctly excludes the 2 refined/crafted outputs" -- true only for the
// 2 non-colliding names that existed at the time, not a real invariant;
// the real content roster falsifies it (confirmed: 3 non-raw resources
// leak through across the 4 planet types). Explicitly requiring itemTier
// 1 (content/README.md's own "raw=1, refined=2, first-order-crafted=3"
// pipeline-depth rule; missing itemTier defaults to 1, same convention
// createListing.ts's tradeableResources filter already uses) closes this
// regardless of what any future resource happens to be named.
export function getEligibleResources(planetType: PlanetType, resources: Resource[]): Resource[] {
  const eligibility = PLANET_TYPE_ELIGIBILITY.find((entry) => entry.planetType === planetType);
  if (!eligibility) {
    throw new RangeError(`no eligibility entry for planet type ${planetType}`);
  }
  const categories = eligibility.eligibleCategories.map((category) => category.toLowerCase());
  return resources.filter((resource) => {
    if ((resource.itemTier ?? 1) !== 1) return false;
    const resourceCategory = resource.category.toLowerCase();
    return categories.some((category) => resourceCategory.includes(category));
  });
}

// Phase 2 GDD §2.4 -- count = max(1, ceil(percentage * eligible_count)).
export function computeSubsetCount(tier: TierColor, eligibleCount: number): number {
  const entry = RESOURCE_SUBSET_PERCENTAGE.find((candidate) => candidate.tier === tier);
  if (!entry) {
    throw new RangeError(`no resource subset percentage for tier ${tier}`);
  }
  return Math.max(1, Math.ceil(entry.percentage * eligibleCount));
}

export interface ResourceSubsetSelection {
  producibleResourceIds: string[];
  specialtyResourceId: string | null;
}

// Phase 2 GDD §2.5 -- the reserved-slot rule: for White-tier-or-higher
// planets, the specialty is selected FIRST and occupies one of the `count`
// slots (never inflating it); the remaining count-1 slots are filled by a
// uniform draw from the eligible pool minus the specialty. Grey-tier
// planets never get a specialty and fill all `count` slots normally.
export function selectResourceSubset(
  eligibleResources: Resource[],
  tier: TierColor,
  count: number,
  random: RandomFn,
): ResourceSubsetSelection {
  const pool = [...eligibleResources];
  const chosen: Resource[] = [];
  let specialtyResourceId: string | null = null;

  if (tier !== "Grey" && pool.length > 0) {
    const specialtyIndex = Math.floor(random() * pool.length);
    const [specialty] = pool.splice(specialtyIndex, 1);
    specialtyResourceId = specialty!.id;
    chosen.push(specialty!);
  }

  const remainingSlots = count - chosen.length;
  for (let i = 0; i < remainingSlots && pool.length > 0; i++) {
    const index = Math.floor(random() * pool.length);
    const [picked] = pool.splice(index, 1);
    chosen.push(picked!);
  }

  return {
    producibleResourceIds: chosen.map((resource) => resource.id),
    specialtyResourceId,
  };
}
