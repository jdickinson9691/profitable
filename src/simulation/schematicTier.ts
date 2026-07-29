import type { TierColor } from "../data/types/tierColor.ts";
import type { SchematicTierContribution } from "../data/types/schematicTier.ts";
import type { Schematic } from "../data/types/schematicEntity.ts";
import { SCHEMATIC_TIER_CONTRIBUTION } from "../data/constants/schematicTier.ts";

export function getSchematicTierContribution(tier: TierColor): SchematicTierContribution {
  const entry = SCHEMATIC_TIER_CONTRIBUTION.find((candidate) => candidate.tier === tier);
  if (!entry) {
    throw new RangeError(`no schematic tier contribution for tier ${tier}`);
  }
  return entry;
}

// Gap found during the alpha content roster's craftability spot-check:
// craft() requires a schematicTier input (agent-02-simulation-core.md),
// but the 5 known-by-default recipes (docs/profitable-alpha-content-roster.md
// §5) deliberately have no Schematic entity in content/schematics.json at
// all -- there was no documented answer for what schematicTier to pass in
// that case. Locked (2026-07-29, profitable-design-questions.md's
// Crafting & Recipes/Schematics section): no owned schematic resolves to
// Grey. This requires no new logic, only this one-line resolution step --
// Grey's own row in SCHEMATIC_TIER_CONTRIBUTION is already "+0% ceiling
// raise, -0% variance narrowing, 0% penalty forgiveness," so "no
// schematic" and "an owned Grey-tier schematic" are already mechanically
// identical outcomes. Not an error state and not a separate bonus-free
// code path -- the existing Grey row applies as-is.
export function resolveSchematicTier(schematic: Schematic | undefined | null): TierColor {
  return schematic?.tier ?? "Grey";
}
