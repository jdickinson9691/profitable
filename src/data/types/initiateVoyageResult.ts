import type { Voyage } from "./voyage.ts";
import type { Ship } from "./ship.ts";

// Ship Fuel amendment: initiateVoyage() used to return a bare Voyage: fuel
// deduction is a real Ship state change the caller must persist, so the
// return shape grew to include it -- same "return what changed"
// discipline every other core function in this codebase follows.
export interface InitiateVoyageResult {
  voyage: Voyage;
  updatedShip: Ship;
}
