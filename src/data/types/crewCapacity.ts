// Phase 4 GDD §2.4 -- a player's crew capacity: a small base plus
// purchasable expansion slots. Current crew count vs.
// (baseCapacity + purchasedSlots) is what hireCrew() checks against.
export interface CrewCapacity {
  playerId: string;
  baseCapacity: number;
  purchasedSlots: number;
}
