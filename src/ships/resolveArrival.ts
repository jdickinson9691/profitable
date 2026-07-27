import type { Voyage } from "../data/types/voyage.ts";
import type { Ship } from "../data/types/ship.ts";
import type { ArrivalResult } from "../data/types/arrivalResult.ts";

// Phase 5 GDD §2.8/§3. Necessary completion: takes the actual Voyage and
// Ship objects directly rather than a voyageId into an implicit store,
// same pure-function reasoning as every other necessary completion in
// this project. Only resolves once currentTime >= voyage.arrivesAt --
// never allows early resolution (Agent 20's own contract, explicitly).
// Does not itself activate any Phase 3 Listing for in-transit sale cargo
// -- see arrivalResult.ts's own comment on why that boundary matters.
export function resolveArrival(voyage: Voyage, ship: Ship, currentTime: number): ArrivalResult {
  if (currentTime < voyage.arrivesAt) {
    return { resolved: false, reason: `voyage has not yet arrived (arrives at ${voyage.arrivesAt})` };
  }

  const updatedShip: Ship = { ...ship, currentPlanetId: voyage.destinationPlanetId };

  return {
    resolved: true,
    updatedShip,
    destinationPlanetId: voyage.destinationPlanetId,
    cargo: voyage.cargo,
  };
}
