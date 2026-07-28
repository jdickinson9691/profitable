import type { Quality, QualityRoll } from "../data/types/quality.ts";
import type { TierColor } from "../data/types/tierColor.ts";
import type { RefineResult } from "../data/types/refineResult.ts";
import type { CraftResult } from "../data/types/craftResult.ts";
import type { EncounterResult } from "../data/types/encounter.ts";
import { QUALITIES } from "../data/types/quality.ts";
import { getTierColor } from "../simulation/tierColor.ts";
import { computeAggregateTier } from "../simulation/aggregateTier.ts";

export { computeAggregateTier };

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

export function describeCraftResult(result: CraftResult): string {
  if (!result.accepted) {
    return `Craft rejected: ${result.reason}`;
  }
  const tier = computeAggregateTier(result.qualities);
  return `Crafted! Aggregate tier: ${tier ?? "N/A"}`;
}

// Travel Encounters (Non-Combat) amendment (Agent 22). Sourced entirely
// from EncounterResult -- never recomputes an outcome, only formats it.
// `resourceName` is an optional caller-resolved display name (this module
// stays free of any content/gameState import, same as every other
// function here) -- falls back to the raw resourceId, the same
// "resolve via content.resources.find(), or fall back to the id" pattern
// already used throughout every scene in this codebase.
export function describeEncounter(encounter: EncounterResult, resourceName?: string): string {
  if (encounter.type === "tradeOpportunity") {
    return `Encountered a trader en route: +${encounter.outcome.creditsGranted} Credits`;
  }
  if (encounter.type === "discovery") {
    const tier = computeAggregateTier(encounter.outcome.qualities);
    const name = resourceName ?? encounter.outcome.resourceId;
    return `Found derelict cargo: ${name}${tier ? ` (${tier})` : ""}`;
  }
  return encounter.outcome.passed
    ? "Navigational hazard: passed"
    : `Navigational hazard: -${encounter.outcome.creditsLost} Credits`;
}
