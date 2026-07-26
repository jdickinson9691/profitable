import type { Quality } from "./quality.ts";

export interface Resource {
  id: string;
  name: string;
  category: string;
  applicableQualities: Record<Quality, boolean>;
  // Phase 3 addition. The item-tier number (1-7, raw/refined/crafted per
  // CLAUDE.md §3.1) that Phase 3's global-market sell restriction keys off
  // -- distinct from TierColor, which is the quality-color tier. Optional
  // so MVP/Phase 2 content (none of which sets this) still validates
  // unchanged; see tradingConfig.ts for the valid range and the restriction
  // values that read it.
  itemTier?: number;
}
