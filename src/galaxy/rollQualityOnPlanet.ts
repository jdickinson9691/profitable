import type { Resource } from "../data/types/resource.ts";
import type { Planet } from "../data/types/planet.ts";
import type { QualityRoll } from "../data/types/quality.ts";
import type { RandomFn } from "../data/types/random.ts";
import { QUALITIES } from "../data/types/quality.ts";
import { QUALITY_MIN, QUALITY_MAX } from "../data/constants/quality.ts";
import { PLANET_TIER_MODIFIER, SPECIALTY_QUALITY_MODIFIER } from "../data/constants/planetTierModifier.ts";
import { rollQuality } from "../simulation/rollQuality.ts";
import { clamp } from "../simulation/clamp.ts";

// Phase 2 GDD §2.2/2.5/2.6 -- the gathering integration point. Wraps the
// *existing* rollQuality() rather than modifying it or duplicating its
// logic ("not baked into rollQuality() as a hidden side effect" per this
// agent's own contract): rolls normally, then adds the planet's tier
// modifier (and specialty bonus, if this resource is the planet's
// specialty) to each applicable dimension, clamping back to 1-100 -- GDD's
// own wording: "rolls 1-100 as normal, then this modifier is added before
// the final clamp." A planet with no `tier` (pre-Phase-2 content, e.g.
// Delta Rigelus) applies no modifier at all, so this is safe to call on
// any planet.
// Planet Resource Generation amendment: narrowed from the full Planet type
// to just the two fields this function has ever actually read -- lets
// generateResourcesForCycle() (planetResourceCycle.ts) call this during
// cycle-based generation, before a full Planet object exists to pass, with
// no dummy id/name/producibleResourceIds fields needed. Any existing caller
// passing a full Planet still satisfies this narrower shape unchanged.
export function rollQualityOnPlanet(
  resource: Resource,
  planet: Pick<Planet, "tier" | "specialtyResourceId">,
  random: RandomFn = Math.random,
): QualityRoll {
  const baseRoll = rollQuality(resource, random);

  const tierModifier = planet.tier
    ? (PLANET_TIER_MODIFIER.find((entry) => entry.tier === planet.tier)?.qualityRollModifier ?? 0)
    : 0;
  const specialtyModifier = resource.id === planet.specialtyResourceId ? SPECIALTY_QUALITY_MODIFIER : 0;
  const totalModifier = tierModifier + specialtyModifier;

  if (totalModifier === 0) {
    return baseRoll;
  }

  const modified = {} as QualityRoll;
  for (const quality of QUALITIES) {
    const value = baseRoll[quality];
    modified[quality] = value === null ? null : clamp(value + totalModifier, QUALITY_MIN, QUALITY_MAX);
  }
  return modified;
}
