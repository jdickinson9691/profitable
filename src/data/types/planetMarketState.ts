// Phase 3 GDD §2.6 -- one planet's live price state for one item.
// `currentPrice` moves via baseline drift/recovery; `basePrice` is the
// floor/ceiling reference point and the value currentPrice drifts back
// toward over time when untraded.
export interface PlanetMarketState {
  planetId: string;
  itemId: string;
  currentPrice: number;
  basePrice: number;
}
