import type { TierColor } from "../data/types/tierColor.ts";
import type { SchematicTierContribution } from "../data/types/schematicTier.ts";
import { SCHEMATIC_TIER_CONTRIBUTION } from "../data/constants/schematicTier.ts";

export function getSchematicTierContribution(tier: TierColor): SchematicTierContribution {
  const entry = SCHEMATIC_TIER_CONTRIBUTION.find((candidate) => candidate.tier === tier);
  if (!entry) {
    throw new RangeError(`no schematic tier contribution for tier ${tier}`);
  }
  return entry;
}
