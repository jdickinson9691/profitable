import type { Quality, QualityRoll } from "../data/types/quality.ts";
import type { TierColor } from "../data/types/tierColor.ts";
import type { RefineResult } from "../data/types/refineResult.ts";
import type { CraftResult } from "../data/types/craftResult.ts";
import type { EncounterResult } from "../data/types/encounter.ts";
import type { CombatEncounter } from "../data/types/combatEncounter.ts";
import type { CombatResolution } from "../data/types/combatResolution.ts";
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
//
// Alpha Section 4 tier-color legibility pass: WCAG contrast ratio checked
// for all 7 against this game's #111111 canvas background. Purple was the
// one failure -- the original Material "Purple 500" (0x9c27b0) measures
// 2.99:1, well under WCAG AA's 4.5:1 minimum for normal text, i.e.
// genuinely hard to read for every player, not just a colorblindness
// concern. Replaced with Material "Purple 300" (0xba68c8, same official
// Material palette family as every other tier color here), which measures
// 5.31:1. Every other tier already clears 4.5:1 (Grey 7.05, White 18.88,
// Green 6.79, Blue 6.04, Orange 8.76, Gold 13.46) -- no other change
// needed. Colorblind-safe differentiation is handled separately: the only
// place this map ever renders as a real color fill (tierSelector.ts) always
// draws the tier's full name as the colored text itself, never a bare color
// swatch -- already stronger insurance than a short letter code would add.
export const TIER_COLOR_HEX: Record<TierColor, number> = {
  Grey: 0x9e9e9e,
  White: 0xffffff,
  Green: 0x4caf50,
  Blue: 0x2196f3,
  Purple: 0xba68c8,
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

// Combat GDD §2.2/§2.3/§2.5 amendment (Agent 22). Sourced entirely from
// CombatEncounter/CombatResolution -- same "format, never recompute"
// discipline as describeEncounter() above. Deliberately does not reveal
// win/lose odds or any hint of the outcome -- the pending prompt only
// ever shows what was actually rolled at detection (opponentThreatTier),
// never a preview of the resolution.
export function describePendingCombat(encounter: CombatEncounter): string {
  return `Hostile ship encountered! Opponent threat tier: ${encounter.opponentThreatTier}.`;
}

export function describeCombatResolution(resolution: CombatResolution): string {
  const { combatEncounter, updatedShip, updatedCrewMember } = resolution;

  if (combatEncounter.outcome === "win") {
    return "Combat won! Your ship continues on, undamaged.";
  }
  if (combatEncounter.outcome === "flee") {
    return "Fled the encounter -- redirected back to the last safe planet.";
  }

  // "lose" -- weapon/crew notes are omitted entirely when there's nothing
  // to report (no weapon installed, or no crew member was affected),
  // rather than a padded "no damage" line for something that structurally
  // couldn't happen (same "no section for nothing that occurred"
  // precedent as describeEncounter()'s own callers).
  const weapon = updatedShip.components.weapon;
  const weaponNote = weapon ? ` Weapon now ${weapon.tier} tier.` : "";
  const crewNote = updatedCrewMember ? ` A ${updatedCrewMember.tier} crew member is unavailable for a while.` : "";
  return `Combat lost! Redirected back to the last safe planet.${weaponNote}${crewNote}`;
}
