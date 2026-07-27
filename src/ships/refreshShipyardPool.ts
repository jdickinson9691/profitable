import type { ShipyardPool } from "../data/types/shipyardPool.ts";
import type { ShipCandidate } from "../data/types/shipCandidate.ts";
import type { QualityRoll } from "../data/types/quality.ts";
import type { RandomFn } from "../data/types/random.ts";
import { getTierColor } from "../simulation/tierColor.ts";
import { createSeededRandom, generateRandomSeed } from "../galaxy/seededRandom.ts";
import { SHIPYARD_POOL_SIZE_PER_PLANET } from "../data/constants/shipsAndTravelConfig.ts";

// Phase 5 GDD §2.2. Reuses getTierColor() for the ship's target tier
// roll, same pattern as Agent 8's rollPlanetTier()/Agent 16's
// rollCandidateTier() -- never reimplements breakpoint logic.
function rollShipTargetValue(random: RandomFn): number {
  return Math.floor(random() * 100) + 1;
}

// "Components generated to match the resulting tier" (Agent 20's own
// contract wording): every quality on every one of the 4 components is
// set to the exact same rolled value, so each component's own tier
// (via getTierColor) and the ship's derived aggregate tier both land
// exactly on the target -- deterministic and simple, no ambiguity about
// which component should be "better" than another for a freshly-rolled
// candidate.
function generateMatchingQualities(value: number): QualityRoll {
  return { purity: value, density: value, potency: value, durability: value, rarity: value };
}

export function refreshShipyardPool(planetId: string, seed?: string, now: number = Date.now()): ShipyardPool {
  // Reuses Agent 8's existing generateRandomSeed(), same reasoning as
  // Agent 16's refreshCrewPool(): a timestamp-only fallback can collide
  // on two rapid successive calls sharing the same Date.now() millisecond.
  const poolSeed = seed ?? generateRandomSeed();
  const random = createSeededRandom(`${poolSeed}:shipyard-pool`);

  const availableShips: ShipCandidate[] = [];
  for (let i = 0; i < SHIPYARD_POOL_SIZE_PER_PLANET; i++) {
    const targetValue = rollShipTargetValue(random);
    const tier = getTierColor(targetValue);
    const qualities = generateMatchingQualities(targetValue);

    availableShips.push({
      id: `ship-candidate-${poolSeed}-${i}`,
      name: `Ship-${poolSeed}-${i}`,
      tier,
      components: {
        weapon: { id: `ship-candidate-${poolSeed}-${i}-weapon`, category: "weapon", qualities, tier },
        engine: { id: `ship-candidate-${poolSeed}-${i}-engine`, category: "engine", qualities, tier },
        shield: { id: `ship-candidate-${poolSeed}-${i}-shield`, category: "shield", qualities, tier },
        cargoHold: { id: `ship-candidate-${poolSeed}-${i}-cargoHold`, category: "cargoHold", qualities, tier },
      },
    });
  }

  return { planetId, availableShips, lastRefreshedAt: now };
}
