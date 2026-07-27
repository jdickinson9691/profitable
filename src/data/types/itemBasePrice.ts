// Necessary completion: Agent 14's contract asks for a "Base price config
// (JSON): a base Credits price for each of the MVP's five items," but
// neither the Phase 3 amendment nor Agent 11 defined a shape for it --
// PlanetMarketState.basePrice is per planet+item, not the single
// galaxy-wide reference value each planet's initial state is seeded from.
export interface ItemBasePrice {
  itemId: string;
  basePrice: number;
}
