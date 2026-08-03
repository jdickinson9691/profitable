import type { Resource } from "../data/types/resource.ts";
import type { Planet, PlanetPosition } from "../data/types/planet.ts";
import type { PlanetType } from "../data/types/planetType.ts";
import type { TierColor } from "../data/types/tierColor.ts";
import type { RandomFn } from "../data/types/random.ts";
import { getTierColor } from "../simulation/tierColor.ts";
import { createSeededRandom } from "./seededRandom.ts";
import { generateResourcesForCycle } from "./planetResourceCycle.ts";

// Planet Resource Generation amendment: getEligibleResources/
// computeSubsetCount/selectResourceSubset moved to resourceSubset.ts (both
// this file and planetResourceCycle.ts need them, and generatePlanet() now
// calls INTO generateResourcesForCycle() -- keeping them here would have
// made that a circular import). Re-exported unchanged so no existing
// import path needs to change.
export { getEligibleResources, computeSubsetCount, selectResourceSubset } from "./resourceSubset.ts";
export type { ResourceSubsetSelection } from "./resourceSubset.ts";

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

// Phase 2 GDD §2.1-2.9. `resources` is the full resource catalog -- not
// part of Agent 8's originally-specified signature, added because the
// subset-selection algorithm has no way to know which resources exist
// otherwise (the same kind of necessary completion as the MVP's
// loadContent()/RefiningRecipe additions).
//
// Planet Resource Generation amendment: resource-subset selection and the
// new fixed-quality roll both moved into generateResourcesForCycle()
// (planetResourceCycle.ts), called here with cycleIndex 0 for this
// planet's initial snapshot -- one shared implementation with the live
// reset-cycle read path, never two copies of the same formula. Tier/type
// still roll here, on the original seed stream, exactly as before; only
// the resource subset's own random draw moved to its own independently-
// seeded stream (`${id}:resources:0`), the same "separate stream per
// concern" pattern positions-vs-index generation already established --
// confirmed safe: no test or real save data depends on the exact resource
// subset a specific seed previously produced.
export function generatePlanet(
  seed: string,
  position: PlanetPosition,
  resources: Resource[],
): Planet {
  const random = createSeededRandom(seed);

  const tier = rollPlanetTier(random);
  const planetType = choosePlanetType(random);
  const id = `planet-${seed}`;

  // GDD §2.4's max(1, ...) floor is only a real guarantee if every Planet
  // Type has at least one eligible resource in the catalog to begin with --
  // generateResourcesForCycle() throws for an empty eligible pool, the same
  // "fail loudly rather than silently produce an empty producibleResourceIds"
  // behavior this function always had.
  const { producibleResourceIds, specialtyResourceId, resourceQualities } = generateResourcesForCycle(
    id,
    tier,
    planetType,
    resources,
    0,
  );

  return {
    id,
    name: `Planet-${seed}`, // real name generation deferred per GDD §2.8
    planetType,
    tier,
    position,
    producibleResourceIds,
    specialtyResourceId,
    resourceQualities,
    discovered: false, // starting-planet override is Agent 10's job
  };
}
