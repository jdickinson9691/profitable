import type { ResourceInstance } from "../data/types/resourceInstance.ts";
import type { QualityMap, QualityRoll } from "../data/types/quality.ts";
import type { TierColor } from "../data/types/tierColor.ts";
import type { RefineResult } from "../data/types/refineResult.ts";
import type { RandomFn } from "../data/types/random.ts";
import { QUALITIES } from "../data/types/quality.ts";
import { getTierVariance } from "./tierVariance.ts";
import { getRefundChance } from "./refundChance.ts";
import { getTierColor } from "./tierColor.ts";

// Straight average of each quality dimension across inputs, weighted by
// quantity only (never toward best/worst). A quality is excluded from its
// own average on any input where it's null, and is null in the result only
// if it's null on every input (GDD §3.2 step 5) -- never treated as 0.
export function computeBaseAverages(inputs: ResourceInstance[]): QualityMap {
  const averages = {} as QualityMap;
  for (const quality of QUALITIES) {
    let weightedSum = 0;
    let totalQuantity = 0;
    for (const input of inputs) {
      const value = input.qualities[quality];
      if (value === null) continue;
      weightedSum += value * input.quantity;
      totalQuantity += input.quantity;
    }
    averages[quality] = totalQuantity > 0 ? weightedSum / totalQuantity : null;
  }
  return averages;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function refine(
  inputs: ResourceInstance[],
  refinerTier: TierColor,
  random: RandomFn = Math.random,
): RefineResult {
  const baseAverages = computeBaseAverages(inputs);
  const variance = getTierVariance(refinerTier);

  // One shared roll applied proportionally to every quality dimension --
  // this refining action came out uniformly a bit lucky or unlucky, rather
  // than each stat rolling independently.
  const varianceRoll = variance.negative + random() * (variance.positive - variance.negative);

  const qualities = {} as QualityRoll;
  for (const quality of QUALITIES) {
    const base = baseAverages[quality];
    qualities[quality] =
      base === null ? null : clamp(Math.round(base * (1 + varianceRoll)), 1, 100);
  }

  // Refined items display each quality's own tier individually (GDD §3.1),
  // so there's no single "output tier" to key refund chance off of. This
  // reuses the GDD's own straight-average stub as a proxy, applied here to
  // the 5 final values rather than to display.
  const finalValues = QUALITIES.map((quality) => qualities[quality]).filter(
    (value): value is number => value !== null,
  );
  const outputAverage = finalValues.reduce((sum, value) => sum + value, 0) / finalValues.length;
  const outputTier = getTierColor(outputAverage);

  const refund = getRefundChance(outputTier);
  const totalConsumedUnits = inputs.reduce((sum, input) => sum + input.quantity, 0);
  let refundUnits = 0;
  for (let i = 0; i < totalConsumedUnits; i++) {
    if (random() < refund.chance) {
      refundUnits += 1;
      if (refund.secondaryUnitChance !== undefined && random() < refund.secondaryUnitChance) {
        refundUnits += 1;
      }
    }
  }

  return { qualities, outputTier, refundUnits };
}
