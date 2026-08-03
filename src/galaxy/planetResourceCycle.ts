import type { Resource } from "../data/types/resource.ts";
import type { Planet } from "../data/types/planet.ts";
import type { PlanetType } from "../data/types/planetType.ts";
import type { TierColor } from "../data/types/tierColor.ts";
import type { QualityRoll } from "../data/types/quality.ts";
import type { RandomFn } from "../data/types/random.ts";
import { QUALITIES } from "../data/types/quality.ts";
import {
  PLANET_RESOURCE_RESET_INTERVAL_HOURS,
  TUTORIAL_GUARANTEED_RESOURCE_IDS,
  TUTORIAL_GUARANTEE_QUALITY_CLAMP,
} from "../data/constants/planetResourceCycle.ts";
import { MINIMUM_COLONISTS_TO_PRODUCE } from "../data/constants/planetOwnership.ts";
import { createSeededRandom } from "./seededRandom.ts";
import { getEligibleResources, computeSubsetCount, selectResourceSubset } from "./resourceSubset.ts";
import { rollQualityOnPlanet } from "./rollQualityOnPlanet.ts";
import { computeAggregateTier } from "../simulation/aggregateTier.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

// Planet Resource Generation (profitable-design-questions.md). Reuses
// getCurrentSeason()'s exact technique (src/trading/season.ts): a seeded
// phase offset derived from the planet's own id (so planets don't all
// reset in lockstep), floor-divided into a cycle index. Zero persisted
// state -- a pure function of (planetId, now), same "always live, never
// stale" property galaxy.md already guarantees extended to one more layer.
export function getPlanetResourceCycleIndex(planetId: string, now: number): number {
  const random = createSeededRandom(`${planetId}:resource-cycle-phase`);
  const offsetHours = Math.floor(random() * PLANET_RESOURCE_RESET_INTERVAL_HOURS);
  const offsetMs = offsetHours * MS_PER_HOUR;
  const intervalMs = PLANET_RESOURCE_RESET_INTERVAL_HOURS * MS_PER_HOUR;
  return Math.floor((now + offsetMs) / intervalMs);
}

export interface ResourcesForCycle {
  producibleResourceIds: string[];
  specialtyResourceId: string | null;
  resourceQualities: Record<string, QualityRoll>;
}

// Factors the existing subset-selection logic (generatePlanet.ts) plus the
// new fixed-quality-rolling step out into one shared, cycle-parameterized
// function -- generatePlanet() calls this with cycleIndex 0 for a planet's
// initial snapshot, and getCurrentPlanetResources() (below) calls it again
// with whatever cycle is currently live. One implementation either way,
// never two copies of the same formula. Tier, type, and position are NOT
// re-rolled here -- rolled once on the base seed stream by generatePlanet()
// and passed in, permanent for the planet's whole lifetime.
export function generateResourcesForCycle(
  seed: string,
  tier: TierColor,
  planetType: PlanetType,
  resources: Resource[],
  cycleIndex: number,
): ResourcesForCycle {
  const random = createSeededRandom(`${seed}:resources:${cycleIndex}`);
  const eligibleResources = getEligibleResources(planetType, resources);
  if (eligibleResources.length === 0) {
    throw new Error(`no eligible resources for planet type ${planetType} in the given catalog`);
  }
  const count = computeSubsetCount(tier, eligibleResources.length);
  const { producibleResourceIds, specialtyResourceId } = selectResourceSubset(
    eligibleResources,
    tier,
    count,
    random,
  );

  const resourceQualities: Record<string, QualityRoll> = {};
  for (const id of producibleResourceIds) {
    const resource = resources.find((entry) => entry.id === id);
    if (!resource) continue;
    resourceQualities[id] = rollQualityOnPlanet(resource, { tier, specialtyResourceId }, random);
  }

  return { producibleResourceIds, specialtyResourceId, resourceQualities };
}

// Starting-planet tutorial guarantee. Direct, closed-form override -- never
// a retry-until-valid loop (this codebase has never used one). Reapplied
// every cycle, including every reset: idempotent, never a one-time
// bootstrap that could drift away after a reset. Takes its own random
// stream (a separate seed suffix, below) rather than continuing
// generateResourcesForCycle()'s already-closed-over one -- the same
// "independent seeded stream per concern" pattern galaxy.md's
// position-vs-index streams and season.ts's phase-vs-effect streams
// already use, not a new discipline invented here.
function applyTutorialGuarantee(
  base: ResourcesForCycle,
  resources: Resource[],
  tier: TierColor,
  random: RandomFn,
): ResourcesForCycle {
  let producibleResourceIds = base.producibleResourceIds;
  const resourceQualities = { ...base.resourceQualities };

  for (const guaranteedId of TUTORIAL_GUARANTEED_RESOURCE_IDS) {
    const resource = resources.find((entry) => entry.id === guaranteedId);
    if (!resource) continue; // not in the catalog at all -- nothing to guarantee

    if (!producibleResourceIds.includes(guaranteedId)) {
      // Bypasses the normal subset draw for just this slot -- added on top
      // of whatever the natural roll produced, never displacing another
      // resource to make room.
      producibleResourceIds = [...producibleResourceIds, guaranteedId];
      resourceQualities[guaranteedId] = rollQualityOnPlanet(
        resource,
        { tier, specialtyResourceId: base.specialtyResourceId },
        random,
      );
    }

    const roll = resourceQualities[guaranteedId]!;
    const aggregateTier = computeAggregateTier(roll);
    if (aggregateTier !== "Grey" && aggregateTier !== "White") {
      const clamped = {} as QualityRoll;
      for (const quality of QUALITIES) {
        clamped[quality] = roll[quality] === null ? null : TUTORIAL_GUARANTEE_QUALITY_CLAMP;
      }
      resourceQualities[guaranteedId] = clamped;
    }
  }

  return { producibleResourceIds, specialtyResourceId: base.specialtyResourceId, resourceQualities };
}

// The live read path every gameplay caller switches to using INSTEAD OF
// reading planet.producibleResourceIds/specialtyResourceId/resourceQualities
// directly -- those fields on a cached Planet object remain the cycle-0
// snapshot only, useful for "as originally generated," but no longer the
// authoritative "what can be mined right now" answer once a planet has
// lived past its first reset interval.
//
// Necessary completion: the design entry's own signature named only
// (planet, now, isStartingPlanet?) -- structurally incomplete, since
// regenerating a cycle's resource subset needs the resource catalog to
// resolve ids into real Resource objects, the same "resources" parameter
// generatePlanet()/generateResourcesForCycle() already require. Added here
// as a required parameter, the same class of necessary completion as the
// MVP's loadContent()/RefiningRecipe additions.
//
// Colonist-Driven Production (planet-ownership.md): the first check, before
// anything else runs. planet.colonistCount is undefined for a raw,
// unmerged Planet (never merged with planetOwnershipState) -- treated as 0,
// same as an explicit 0, so an unmerged Planet always reads as ungatherable
// rather than silently bypassing the gate. Callers MUST pass a merged
// Planet (mergePlanetOwnership()) for a colonized planet to correctly read
// as productive.
export function getCurrentPlanetResources(
  planet: Planet,
  resources: Resource[],
  now: number,
  isStartingPlanet = false,
): ResourcesForCycle {
  if ((planet.colonistCount ?? 0) < MINIMUM_COLONISTS_TO_PRODUCE) {
    return { producibleResourceIds: [], specialtyResourceId: null, resourceQualities: {} };
  }

  if (!planet.tier || !planet.planetType) {
    throw new Error(`getCurrentPlanetResources: planet ${planet.id} is missing tier/planetType`);
  }

  const cycleIndex = getPlanetResourceCycleIndex(planet.id, now);
  const base = generateResourcesForCycle(planet.id, planet.tier, planet.planetType, resources, cycleIndex);

  if (!isStartingPlanet) {
    return base;
  }

  const random = createSeededRandom(`${planet.id}:resources:${cycleIndex}:tutorial-guarantee`);
  return applyTutorialGuarantee(base, resources, planet.tier, random);
}
