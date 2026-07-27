import type { Ship } from "./ship.ts";
import type { VoyageCargoItem } from "./voyage.ts";

// Necessary completion: Agent 20's contract names `resolveArrival(...):
// ArrivalResult` but never defines it. Reports the delivered ship
// (currentPlanetId updated to the destination) and the delivered cargo --
// it does NOT itself activate any Phase 3 Listing for in-transit sale
// cargo, since Agent 20 must never touch Agent 11's trading logic. The
// caller (Presentation/Integration) is responsible for turning delivered
// cargo into a real Listing via Agent 11's own createListing().
export interface ArrivalResolved {
  resolved: true;
  updatedShip: Ship;
  destinationPlanetId: string;
  cargo: VoyageCargoItem[];
}

export interface ArrivalNotYetDue {
  resolved: false;
  reason: string;
}

export type ArrivalResult = ArrivalResolved | ArrivalNotYetDue;
