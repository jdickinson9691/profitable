import type { TierColor } from "./tierColor.ts";

// Phase 3 GDD §2.1/§2.8 -- 'global' or a specific planet's market.
export type MarketLocation = "global" | { planetId: string };

// Phase 3 GDD §2.3 -- a direct fixed-price listing (no order book/bidding).
// Timestamps are epoch milliseconds (`number`), matching this codebase's
// existing `Date.now()` convention (src/galaxy/seededRandom.ts) rather than
// introducing a new date/time type.
export interface Listing {
  id: string;
  itemId: string;
  quantity: number;
  pricePerUnit: number;
  // Derived per §2.4 (straight-average-to-tier), for display/stacking only
  // -- the underlying item instance keeps its real 5-quality data elsewhere.
  marketTier: TierColor;
  location: MarketLocation;
  // §2.11 trade attribution -- self-trade prevention keys off this.
  createdByPlayerId: string;
  createdAt: number;
  expiresAt: number;
}
