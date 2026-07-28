import type { ScannerPool } from "../data/types/scannerPool.ts";
import type { ScannerCandidate } from "../data/types/scannerCandidate.ts";
import type { RandomFn } from "../data/types/random.ts";
import { getTierColor } from "../simulation/tierColor.ts";
import { createSeededRandom, generateRandomSeed } from "../galaxy/seededRandom.ts";
import { SCANNER_POOL_SIZE_PER_PLANET } from "../data/constants/shipsAndTravelConfig.ts";

// Scanner/Probe GDD §2.2. Mirrors refreshShipyardPool()'s structure
// closely, per Agent 20's own contract wording ("this should look and
// behave like a sibling function, not a divergent one-off") -- simpler
// than the ship version only because a Scanner has no components to
// generate matching qualities for.
function rollScannerTargetValue(random: RandomFn): number {
  return Math.floor(random() * 100) + 1;
}

export function refreshScannerPool(planetId: string, seed?: string, now: number = Date.now()): ScannerPool {
  // Same reasoning as refreshShipyardPool()/refreshCrewPool(): a
  // timestamp-only fallback can collide on two rapid successive calls
  // sharing the same Date.now() millisecond.
  const poolSeed = seed ?? generateRandomSeed();
  const random = createSeededRandom(`${poolSeed}:scanner-pool`);

  const availableScanners: ScannerCandidate[] = [];
  for (let i = 0; i < SCANNER_POOL_SIZE_PER_PLANET; i++) {
    const targetValue = rollScannerTargetValue(random);
    const tier = getTierColor(targetValue);
    availableScanners.push({ id: `scanner-candidate-${poolSeed}-${i}`, tier });
  }

  return { planetId, availableScanners, lastRefreshedAt: now };
}
