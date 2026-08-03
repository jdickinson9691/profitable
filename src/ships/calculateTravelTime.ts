import type { Planet } from "../data/types/planet.ts";
import type { Ship } from "../data/types/ship.ts";
import type { CrewMember } from "../data/types/crewMember.ts";
import {
  DISTANCE_TO_TRAVEL_HOURS_PER_UNIT,
  SHIP_TIER_SPEED_MODIFIER,
  PILOT_SPEED_BONUS_BY_TIER,
} from "../data/constants/shipsAndTravelConfig.ts";
import { calculateDistance } from "./calculateDistance.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

// Phase 5 GDD §2.7/§2.8/§2.4. Returns milliseconds, not hours -- a
// necessary completion the GDD's own pseudocode leaves unstated: every
// timestamp in this codebase (Listing.expiresAt, CrewMember.lastPaidAt,
// Voyage.arrivesAt) is an epoch-ms number, so returning ms here keeps
// initiateVoyage()'s `arrivesAt = currentTime + calculateTravelTime(...)`
// correct with no unit conversion at the call site.
//
// Ship Crew Roles amendment: `pilot` is a new, optional trailing
// parameter -- additive only, every pre-amendment call site keeps
// compiling and behaving identically without passing it. The caller is
// trusted to have already resolved which crew member (if any) is
// actually assigned as this ship's Pilot -- same "pure functions take
// explicit data, never do hidden lookups" discipline as crafterTier in
// craft(); this function does not re-validate shipRole/assignedShipId
// itself. Stacks multiplicatively with SHIP_TIER_SPEED_MODIFIER, per
// the design entry's own "an additional travel-time multiplier,
// stacking with SHIP_TIER_SPEED_MODIFIER" wording.
export function calculateTravelTime(
  originPlanet: Planet,
  destinationPlanet: Planet,
  ship: Ship,
  pilot: CrewMember | null = null,
): number {
  if (!originPlanet.position || !destinationPlanet.position) {
    // Only Phase-2-generated planets carry a position (Planet.position is
    // optional for MVP-era backward compatibility, e.g. Delta Rigelus).
    // Travel structurally requires real coordinates on both ends -- this
    // is not a normal business rejection (unlike insufficient funds), so
    // it throws rather than returning some fabricated distance.
    throw new Error("calculateTravelTime: both planets must have a generated position");
  }

  // Euclidean, 2D only -- §2.7 forbids a z axis. Extracted to
  // calculateDistance.ts (Scanner/Probe amendment) so performScan() reuses
  // this exact formula rather than reimplementing it.
  const distance = calculateDistance(originPlanet.position, destinationPlanet.position);

  const baseTravelTimeHours = distance * DISTANCE_TO_TRAVEL_HOURS_PER_UNIT;

  const speedModifier = SHIP_TIER_SPEED_MODIFIER.find((entry) => entry.tier === ship.tier)?.travelTimeMultiplier;
  if (speedModifier === undefined) {
    throw new RangeError(`no speed modifier defined for tier ${ship.tier}`);
  }

  let pilotMultiplier = 1;
  if (pilot) {
    const bonus = PILOT_SPEED_BONUS_BY_TIER.find((entry) => entry.tier === pilot.tier)?.travelTimeMultiplier;
    if (bonus === undefined) {
      throw new RangeError(`no pilot speed bonus defined for tier ${pilot.tier}`);
    }
    pilotMultiplier = bonus;
  }

  return baseTravelTimeHours * speedModifier * pilotMultiplier * MS_PER_HOUR;
}
