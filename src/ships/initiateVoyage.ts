import type { Planet } from "../data/types/planet.ts";
import type { Ship } from "../data/types/ship.ts";
import type { Voyage, VoyageCargoItem } from "../data/types/voyage.ts";
import { calculateTravelTime } from "./calculateTravelTime.ts";

// Phase 5 GDD §2.8/§3. Necessary completion: takes the actual Ship and
// Planet objects directly rather than bare id strings into an implicit
// store, same pure-function reasoning as every other necessary
// completion in this project. `arrivesAt` is computed once here, at
// departure time, and never recomputed -- a later change to the ship's
// tier (e.g. swapping a component mid-voyage) must not retroactively
// change an already-initiated voyage's arrival time (Agent 20's own
// contract, explicitly).
export function initiateVoyage(
  ship: Ship,
  originPlanet: Planet,
  destinationPlanet: Planet,
  cargo: VoyageCargoItem[],
  currentTime: number,
  id: string,
): Voyage {
  const travelTimeMs = calculateTravelTime(originPlanet, destinationPlanet, ship);

  return {
    id,
    shipId: ship.id,
    originPlanetId: originPlanet.id,
    destinationPlanetId: destinationPlanet.id,
    departedAt: currentTime,
    arrivesAt: currentTime + travelTimeMs,
    cargo,
  };
}
