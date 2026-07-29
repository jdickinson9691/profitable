import type { QualityRoll } from "../data/types/quality.ts";
import type { TierColor } from "../data/types/tierColor.ts";
import { QUALITIES } from "../data/types/quality.ts";
import { getTierColor } from "./tierColor.ts";

// GDD §3.1: tiers 3-7 (crafted items) aggregate the 5 qualities into one
// overall tier via a straight average -- originally shipped as a "post-MVP,
// stub for now" placeholder, formally locked 2026-07-29 during alpha
// content authoring (profitable-design-questions.md's Resources & 5
// Qualities section) with no formula change, since this is the same
// straight-average-to-tier formula ship tier and market listing tier
// already reused from this function. Originally implemented only in
// src/presentation/display.ts (a display concern, per the GDD's own
// wording); moved here for Phase 3 because Listing.marketTier (GDD §2.4)
// needs the identical formula and src/trading (Agent 11) must not import
// from src/presentation -- trading core is simulation-tier, presentation
// depends on it, never the reverse. display.ts re-exports this rather than
// keeping its own copy, so existing callers/tests are unaffected.
export function computeAggregateTier(qualities: QualityRoll): TierColor | null {
  const values = QUALITIES.map((quality) => qualities[quality]).filter(
    (value): value is number => value !== null,
  );
  if (values.length === 0) return null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return getTierColor(average);
}
