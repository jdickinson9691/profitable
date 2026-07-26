import type { Quality, QualityRoll } from "../data/types/quality.ts";
import type { TierColor } from "../data/types/tierColor.ts";
import type { RefineResult } from "../data/types/refineResult.ts";
import type { CraftResult } from "../data/types/craftResult.ts";
import { QUALITIES } from "../data/types/quality.ts";
import { getTierColor } from "../simulation/tierColor.ts";

// Pure "what should this show" helpers, kept separate from any Phaser
// object so they're directly unit-testable (no canvas/renderer needed).
// Every displayed number/tier here is sourced from Agent 2's actual output
// -- these functions only format, never recompute the quality math.

// Presentation-only visual mapping (Agent 1 defines the 7 tier *names* and
// breakpoints, not display colors) -- roughly conventional MMO loot-rarity
// colors.
export const TIER_COLOR_HEX: Record<TierColor, number> = {
  Grey: 0x9e9e9e,
  White: 0xffffff,
  Green: 0x4caf50,
  Blue: 0x2196f3,
  Purple: 0x9c27b0,
  Orange: 0xff9800,
  Gold: 0xffd700,
};

export interface QualityDisplayRow {
  quality: Quality;
  value: number | null;
  tier: TierColor | null;
}

export function formatQualityRoll(roll: QualityRoll): QualityDisplayRow[] {
  return QUALITIES.map((quality) => {
    const value = roll[quality];
    return { quality, value, tier: value === null ? null : getTierColor(value) };
  });
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function formatQualityLabel(row: QualityDisplayRow): string {
  if (row.value === null) {
    return `${capitalize(row.quality)}: N/A`;
  }
  return `${capitalize(row.quality)}: ${row.value} (${row.tier})`;
}

export function describeRefineResult(result: RefineResult): string {
  if (result.refundUnits === 0) {
    return `Output tier: ${result.outputTier}`;
  }
  const unitWord = result.refundUnits === 1 ? "unit" : "units";
  return `Output tier: ${result.outputTier} (+${result.refundUnits} refunded ${unitWord})`;
}

// GDD SS3.1: tiers 3-7 (crafted items) aggregate the 5 qualities into one
// overall display tier -- "exact aggregation formula is post-MVP, stub
// with a straight average for now." That stub is a display concern (used
// "at-a-glance," per the GDD), so it lives here rather than in Agent 2 --
// but it calls the real getTierColor() rather than reimplementing any
// breakpoint logic itself.
export function computeAggregateTier(qualities: QualityRoll): TierColor | null {
  const values = QUALITIES.map((quality) => qualities[quality]).filter(
    (value): value is number => value !== null,
  );
  if (values.length === 0) return null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return getTierColor(average);
}

export function describeCraftResult(result: CraftResult): string {
  if (!result.accepted) {
    return `Craft rejected: ${result.reason}`;
  }
  const tier = computeAggregateTier(result.qualities);
  return `Crafted! Aggregate tier: ${tier ?? "N/A"}`;
}
