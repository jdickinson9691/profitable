import type { Planet } from "../data/types/planet.ts";
import type { Ship } from "../data/types/ship.ts";
import type { Voyage, VoyageCargoItem } from "../data/types/voyage.ts";
import type { CrewMember } from "../data/types/crewMember.ts";
import type { InitiateVoyageResult } from "../data/types/initiateVoyageResult.ts";
import { calculateTravelTime } from "./calculateTravelTime.ts";
import { calculateFuelCost } from "./calculateFuelCost.ts";
import { CARGO_HOLD_CAPACITY_BY_TIER } from "../data/constants/shipsAndTravelConfig.ts";

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
//
// Ship Fuel / Cargo Hold Capacity amendment: two new precondition checks,
// both hard rejections (throw, same pattern as assembleShip()'s
// category-mismatch check), run before arrivesAt is computed -- neither
// touches it. **Both are skipped entirely for a retreat voyage
// (isRetreat === true).** A forced retreat must never fail for fuel or
// cargo reasons -- the same "never strand the player" reasoning
// resolveEncounters() already applies (isRetreat voyages are also
// encounter-free) and Combat's own design used to keep arrivesAt locked.
// A ship that departed with exactly enough fuel for a one-way trip could
// easily have none left for a compulsory return leg; cargo was already
// validated on the original outbound voyage and is carried back
// unchanged (encounters-combat.md: "cargo is never forfeited"), so
// re-checking it here would be redundant even if it weren't skipped.
// Return shape changed from a bare Voyage to { voyage, updatedShip } --
// fuel deduction is a real state change the caller must persist, the
// same "return what changed" discipline every other core function in
// this codebase already follows (purchaseListing, sellToMarket,
// refuelShip). A retreat voyage's updatedShip is unchanged from the
// input ship, since retreat consumes no fuel.
//
// Ship Crew Roles amendment: `pilot` is a new, optional trailing
// parameter, forwarded as-is into calculateTravelTime() -- this
// function does not resolve which crew member is assigned Pilot
// itself, the caller does (same division of responsibility as every
// other necessary-completion function in this file).
export function initiateVoyage(
  ship: Ship,
  originPlanet: Planet,
  destinationPlanet: Planet,
  cargo: VoyageCargoItem[],
  currentTime: number,
  id: string,
  isRetreat?: boolean,
  pilot?: CrewMember | null,
): InitiateVoyageResult {
  let updatedShip = ship;

  if (!isRetreat) {
    const fuelCost = calculateFuelCost(originPlanet, destinationPlanet);
    if (ship.currentFuel < fuelCost) {
      throw new Error(
        `initiateVoyage: insufficient fuel: need ${fuelCost}, have ${ship.currentFuel}`,
      );
    }

    const cargoQuantity = cargo.reduce((sum, item) => sum + item.quantity, 0);
    const cargoHoldTier = ship.components.cargoHold?.tier ?? "Grey";
    const cargoCapacity = CARGO_HOLD_CAPACITY_BY_TIER.find((e) => e.tier === cargoHoldTier)?.capacity;
    if (cargoCapacity === undefined) {
      throw new RangeError(`no cargo hold capacity defined for tier ${cargoHoldTier}`);
    }
    if (cargoQuantity > cargoCapacity) {
      throw new Error(
        `initiateVoyage: cargo quantity ${cargoQuantity} exceeds cargo hold capacity ${cargoCapacity}`,
      );
    }

    updatedShip = { ...ship, currentFuel: ship.currentFuel - fuelCost };
  }

  const travelTimeMs = calculateTravelTime(originPlanet, destinationPlanet, ship, pilot ?? null);

  const voyage: Voyage = {
    id,
    shipId: ship.id,
    originPlanetId: originPlanet.id,
    destinationPlanetId: destinationPlanet.id,
    departedAt: currentTime,
    arrivesAt: currentTime + travelTimeMs,
    cargo,
    ...(isRetreat ? { isRetreat: true as const } : {}),
  };

  return { voyage, updatedShip };
}
