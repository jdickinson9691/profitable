import type { TierColor } from "./tierColor.ts";

// Necessary correction to the Scanner/Probe GDD's own literal pseudocode,
// same precedent as Phase 4's CrewCandidate/CrewMember split and Phase 5's
// ShipCandidate/Ship split: ScannerPool.availableScanners was written as
// Scanner[] in the GDD's own pseudocode, but an unpurchased pool entry has
// no real ownerId yet -- Scanner.ownerId is required and meaningless before
// a purchase transfers ownership. ScannerCandidate omits only that field;
// purchaseScanner() (Agent 20) is what turns one into a real Scanner.
export interface ScannerCandidate {
  id: string;
  tier: TierColor;
}
