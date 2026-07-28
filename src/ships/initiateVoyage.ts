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
//
// Combat GDD §2.6/§3: `isRetreat` is a new, optional trailing parameter --
// additive only, every pre-Combat call site keeps compiling and behaving
// identically without passing it. Set on the returned Voyage only when
// true, never as an explicit `false` -- matching Voyage.isRetreat's own
// "missing means false, never a distinct state" convention exactly, and
// keeping every ordinary (non-retreat) voyage's shape byte-for-byte
// unchanged from the pre-Combat amendment.
export function initiateVoyage(
  ship: Ship,
  originPlanet: Planet,
  destinationPlanet: Planet,
  cargo: VoyageCargoItem[],
  currentTime: number,
  id: string,
  isRetreat?: boolean,
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
    ...(isRetreat ? { isRetreat: true as const } : {}),
  };
}
