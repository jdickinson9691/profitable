import type { PlanetMarketState } from "../data/types/planetMarketState.ts";
import type { TradeDirection } from "../data/types/tradeDirection.ts";
import { GLOBAL_MARKET_MARKUP_PERCENT, GLOBAL_MARKET_DISCOUNT_PERCENT } from "../data/constants/tradingConfig.ts";

// Phase 3 GDD §2.7. Necessary completion: the contract's
// `getGlobalPrice(itemId, direction)` signature has no way to reach live
// planet prices as a pure function (no implicit global store) -- takes the
// live PlanetMarketState collection explicitly instead, same as every
// other pure function in this codebase (refine/craft take their inputs
// directly, never an ID into a hidden registry). Callers must pass the
// actual current states at call time; this function itself does no
// caching, which is what makes §2.7's "global never beats planet price"
// guarantee hold structurally rather than by convention.
//
// "Currently selling"/"currently buying" (the contract's wording) both
// resolve to the same thing in this simplified single-price-per-planet-item
// model: any planet with an active PlanetMarketState entry for the item.
// There's no separate bid/ask per planet -- currentPrice is that planet's
// one going rate, and "sells cheap"/"buys at a premium" (GDD §2.9) is a
// display judgement (currentPrice vs. basePrice), not a structural split.
export function getGlobalPrice(
  itemId: string,
  direction: TradeDirection,
  marketStates: PlanetMarketState[],
): number {
  const prices = marketStates.filter((state) => state.itemId === itemId).map((state) => state.currentPrice);

  if (prices.length === 0) {
    throw new Error(`getGlobalPrice: no planet currently trades item "${itemId}"`);
  }

  if (direction === "buy") {
    return Math.min(...prices) * (1 + GLOBAL_MARKET_MARKUP_PERCENT);
  }
  return Math.max(...prices) * (1 - GLOBAL_MARKET_DISCOUNT_PERCENT);
}
