import type { Planet } from "./planet.ts";

// Necessary completion: the Scanner GDD amendment names
// `performScan(playerId, dockedPlanetId): { newlyDiscovered: Planet[] }`
// but a bare object return can't also represent this function's several
// documented rejection cases (ship not docked at the given planet, docked
// planet not yet discovered, no scanner owned) as a normal business
// outcome the caller must handle -- same CraftResult/PurchaseResult/
// HireResult/PurchaseShipResult discriminated-union precedent used
// everywhere else in this codebase.
export interface ScanSucceeded {
  scanned: true;
  newlyDiscovered: Planet[];
}

export interface ScanRejected {
  scanned: false;
  reason: string;
}

export type PerformScanResult = ScanSucceeded | ScanRejected;
