import type { Resource } from "../data/types/resource.ts";
import type { Planet, PlanetPosition } from "../data/types/planet.ts";
import type { PlanetType } from "../data/types/planetType.ts";
import type { TierColor } from "../data/types/tierColor.ts";
import type { RandomFn } from "../data/types/random.ts";
import { PLANET_TYPE_ELIGIBILITY } from "../data/constants/planetTypeEligibility.ts";
import { RESOURCE_SUBSET_PERCENTAGE } from "../data/constants/resourceSubsetPercentage.ts";
import { getTierColor } from "../simulation/tierColor.ts";
import { createSeededRandom } from "./seededRandom.ts";

const PLANET_TYPES: readonly PlanetType[] = ["Terrestrial", "SuperEarth", "Neptunian", "GasGiant"];

// Phase 2 GDD §2.1 -- random 1-100 through the *existing* tier breakpoint
// table via getTierColor(), never reimplemented.
export function rollPlanetTier(random: RandomFn): TierColor {
  const roll = Math.floor(random() * 100) + 1;
  return getTierColor(roll);
}

// Phase 2 GDD §2.3 -- "exact distribution isn't specified... uniform
// random is the default unless told otherwise" (Agent 8's own contract).
export function choosePlanetType(random: RandomFn): PlanetType {
  const index = Math.floor(random() * PLANET_TYPES.length);
  return PLANET_TYPES[index]!;
}

// Reconciles the GDD's broad category vocabulary ("Solid"/"Gas"/"Crystal")
// against Resource.category, which stays a free-form string per the MVP's
// Resource type (e.g. "radioactive crystal", "refined-metal"). Matched via
// case-insensitive substring rather than exact equality -- this correctly
// includes the 3 raw MVP resources (solid/gas/"radioactive crystal", each
// containing its broad category as a substring) and correctly excludes the
// 2 refined/crafted outputs (which aren't planetary produce regardless).
// A deliberate resolution of a genuine vocabulary gap, not an assumption.
export function getEligibleResources(planetType: PlanetType, resources: Resource[]): Resource[] {
  const eligibility = PLANET_TYPE_ELIGIBILITY.find((entry) => entry.planetType === planetType);
  if (!eligibility) {
    throw new RangeError(`no eligibility entry for planet type ${planetType}`);
  }
  const categories = eligibility.eligibleCategories.map((category) => category.toLowerCase());
  return resources.filter((resource) => {
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

// Phase 2 GDD §2.1-2.9. `resources` is the full resource catalog -- not
// part of Agent 8's originally-specified signature, added because the
// subset-selection algorithm has no way to know which resources exist
// otherwise (the same kind of necessary completion as the MVP's
// loadContent()/RefiningRecipe additions).
export function generatePlanet(
  seed: string,
  position: PlanetPosition,
  resources: Resource[],
): Planet {
  const random = createSeededRandom(seed);

  const tier = rollPlanetTier(random);
  const planetType = choosePlanetType(random);
  const eligibleResources = getEligibleResources(planetType, resources);
  if (eligibleResources.length === 0) {
    // GDD §2.4's max(1, ...) floor is only a real guarantee if every
    // Planet Type has at least one eligible resource in the catalog to
    // begin with -- that's a content/catalog invariant the design assumes,
    // not something the formula itself can enforce. Failing loudly here
    // beats silently producing an empty producibleResourceIds that would
    // later fail planet.schema.json's minItems: 1 downstream.
    throw new Error(`no eligible resources for planet type ${planetType} in the given catalog`);
  }
  const count = computeSubsetCount(tier, eligibleResources.length);
  const { producibleResourceIds, specialtyResourceId } = selectResourceSubset(
    eligibleResources,
    tier,
    count,
    random,
  );

  return {
    id: `planet-${seed}`,
    name: `Planet-${seed}`, // real name generation deferred per GDD §2.8
    planetType,
    tier,
    position,
    producibleResourceIds,
    specialtyResourceId,
    discovered: false, // starting-planet override is Agent 10's job
  };
}
