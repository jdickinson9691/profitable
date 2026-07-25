import type { ResourceInstance } from "../data/types/resourceInstance.ts";
import type { Recipe } from "../data/types/recipe.ts";
import type { QualityRoll } from "../data/types/quality.ts";
import type { TierColor } from "../data/types/tierColor.ts";
import type { CraftResult } from "../data/types/craftResult.ts";
import type { RandomFn } from "../data/types/random.ts";
import { QUALITIES } from "../data/types/quality.ts";
import { computeBaseAverages } from "./refine.ts";
import { getTierVariance } from "./tierVariance.ts";
import { getSchematicTierContribution } from "./schematicTier.ts";
import { getPenaltyMultiplier } from "./penaltyCurve.ts";
import { COMBINED_CEILING_CAP } from "../data/constants/schematicTier.ts";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function craft(
  inputs: ResourceInstance[],
  recipe: Recipe,
  schematicTier: TierColor,
  crafterTier: TierColor,
  random: RandomFn = Math.random,
): CraftResult {
  const baseAverages = computeBaseAverages(inputs);
  const crafterVariance = getTierVariance(crafterTier);
  const schematic = getSchematicTierContribution(schematicTier);

  const combinedCeilingRaise = Math.min(
    crafterVariance.positive + schematic.ceilingRaise,
    COMBINED_CEILING_CAP,
  );

  // The ceiling is a true cap, not just a new center -- schematic's
  // narrowing widens the crafter's already-narrow downside back toward
  // zero (never past it), so the roll only ever pulls DOWN from the
  // raised ceiling.
  const combinedNegative = Math.min(
    crafterVariance.negative + Math.abs(schematic.varianceNarrowing),
    0,
  );

  // One shared roll (mirroring refine()) applied proportionally across all
  // 5 dimensions.
  const rollFraction = combinedNegative + random() * (0 - combinedNegative);

  const preThreshold = {} as QualityRoll;
  for (const quality of QUALITIES) {
    const base = baseAverages[quality];
    if (base === null) {
      preThreshold[quality] = null;
      continue;
    }
    const raisedCeiling = base * (1 + combinedCeilingRaise);
    preThreshold[quality] = raisedCeiling * (1 + rollFraction);
  }

  // Threshold penalty, applied LAST -- recipe input slots are matched
  // positionally against `inputs`. A quality that's null/N/A on the
  // matching input is excluded from the threshold check entirely (never
  // an automatic failure or a 0). Across multiple thresholded slots, the
  // single worst (largest) points-below-threshold governs the penalty.
  let worstPointsBelow = 0;
  for (let i = 0; i < recipe.inputs.length; i++) {
    const slot = recipe.inputs[i];
    if (slot.thresholdQuality === undefined || slot.thresholdValue === undefined) continue;
    const value = inputs[i]?.qualities[slot.thresholdQuality];
    if (value === null || value === undefined) continue;
    const pointsBelow = Math.max(slot.thresholdValue - value, 0);
    if (pointsBelow > worstPointsBelow) worstPointsBelow = pointsBelow;
  }

  if (worstPointsBelow > 40) {
    return {
      accepted: false,
      reason: `an input is ${worstPointsBelow} points below its recipe threshold (41+ is rejected)`,
    };
  }

  const effectivePointsBelow = worstPointsBelow * (1 - schematic.penaltyForgiveness);
  const multiplier = getPenaltyMultiplier(effectivePointsBelow);

  const qualities = {} as QualityRoll;
  for (const quality of QUALITIES) {
    const value = preThreshold[quality];
    qualities[quality] = value === null ? null : clamp(Math.round(value * multiplier), 1, 100);
  }

  return { accepted: true, qualities };
}
