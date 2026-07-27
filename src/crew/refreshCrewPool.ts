import type { PlanetCrewPool } from "../data/types/planetCrewPool.ts";
import type { CrewCandidate } from "../data/types/crewCandidate.ts";
import type { RandomFn } from "../data/types/random.ts";
import { getTierColor } from "../simulation/tierColor.ts";
import { createSeededRandom, generateRandomSeed } from "../galaxy/seededRandom.ts";
import { CREW_POOL_SIZE_PER_PLANET } from "../data/constants/crewConfig.ts";

// Phase 4 GDD §2.3. Reuses getTierColor() for the tier roll, same pattern
// as Agent 8's rollPlanetTier() -- never reimplements breakpoint logic.
function rollCandidateTier(random: RandomFn): ReturnType<typeof getTierColor> {
  const roll = Math.floor(random() * 100) + 1;
  return getTierColor(roll);
}

// A tier 6-7 candidate's profession is rolled, but the actual profession
// taxonomy is an explicitly open design question (see profession.ts) --
// this produces a clearly-labeled placeholder identifier, not invented
// lore/content, matching the same restraint Agent 1's amendment applied
// to BACKGROUND_IDLE_OUTPUT_RATE.
const PLACEHOLDER_PROFESSION_COUNT = 3;
function rollPlaceholderProfession(random: RandomFn): string {
  const index = Math.floor(random() * PLACEHOLDER_PROFESSION_COUNT) + 1;
  return `unspecified-profession-${index}`;
}

// Tier 6-7 in the numbered sense (Grey=1 ... Gold=7): Orange and Gold.

// Deterministic given a seed, same pattern as generateGalaxy()/
// generatePlanet(). `now` is injectable (defaults to Date.now()) for the
// same reason createListing()'s `now` is -- lastRefreshedAt needs a real
// timestamp, and nothing about determinism requires hiding it from tests.
export function refreshCrewPool(planetId: string, seed?: string, now: number = Date.now()): PlanetCrewPool {
  // Reuses Agent 8's existing generateRandomSeed() rather than a
  // timestamp-only fallback, which can collide on two rapid successive
  // calls sharing the same Date.now() millisecond.
  const poolSeed = seed ?? generateRandomSeed();
  const random = createSeededRandom(`${poolSeed}:crew-pool`);

  const availableHires: CrewCandidate[] = [];
  for (let i = 0; i < CREW_POOL_SIZE_PER_PLANET; i++) {
    const tier = rollCandidateTier(random);
    const isSpecializedTier = tier === "Orange" || tier === "Gold";
    const profession = isSpecializedTier ? rollPlaceholderProfession(random) : null;
    availableHires.push({
      id: `crew-candidate-${poolSeed}-${i}`,
      tier,
      profession,
    });
  }

  return { planetId, availableHires, lastRefreshedAt: now };
}
