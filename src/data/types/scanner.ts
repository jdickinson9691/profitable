import type { TierColor } from "./tierColor.ts";

// Scanner/Probe GDD §2.1/§3 -- a standalone item, deliberately outside
// ComponentCategory/ShipComponent -- owning a scanner has zero effect on
// deriveShipTier()'s component-tier averaging. Represents an already-
// purchased scanner, hence the required ownerId; an unpurchased pool entry
// is ScannerCandidate instead (see scannerCandidate.ts for why, mirroring
// the existing ShipCandidate/CrewCandidate precedent).
export interface Scanner {
  id: string;
  tier: TierColor;
  ownerId: string;
}
