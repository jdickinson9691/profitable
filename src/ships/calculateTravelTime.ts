import type { Planet } from "../data/types/planet.ts";
import type { Ship } from "../data/types/ship.ts";
import {
  DISTANCE_TO_TRAVEL_HOURS_PER_UNIT,
  SHIP_TIER_SPEED_MODIFIER,
} from "../data/constants/shipsAndTravelConfig.ts";
import { calculateDistance } from "./calculateDistance.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

// Phase 5 GDD §2.7/§2.8/§2.4. Returns milliseconds, not hours -- a
// necessary completion the GDD's own pseudocode leaves unstated: every
// timestamp in this codebase (Listing.expiresAt, CrewMember.lastPaidAt,
// Voyage.arrivesAt) is an epoch-ms number, so returning ms here keeps
// initiateVoyage()'s `arrivesAt = currentTime + calculateTravelTime(...)`
// correct with no unit conversion at the call site.
export function calculateTravelTime(originPlanet: Planet, destinationPlanet: Planet, ship: Ship): number {
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

  return baseTravelTimeHours * speedModifier * MS_PER_HOUR;
}
