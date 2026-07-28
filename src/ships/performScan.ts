import type { Ship } from "../data/types/ship.ts";
import type { Planet } from "../data/types/planet.ts";
import type { Scanner } from "../data/types/scanner.ts";
import type { PerformScanResult } from "../data/types/performScanResult.ts";
import { calculateDistance } from "./calculateDistance.ts";
import { SCANNER_BASE_SCAN_RADIUS, SCANNER_TIER_RADIUS_BONUS } from "../data/constants/shipsAndTravelConfig.ts";

// Scanner/Probe GDD §2.4: "if multiple owned scanners, use only the
// highest-tier one -- do not sum bonuses." SCANNER_TIER_RADIUS_BONUS is
// strictly increasing by tier (asserted in tests/data/scannerConstants.test.ts),
// so "highest tier" and "largest radiusBonus" are the same thing -- taking
// the max bonus directly implements the highest-tier-only rule without a
// separate tier-ranking utility.
function highestOwnedRadiusBonus(ownedScanners: readonly Scanner[]): number | null {
  if (ownedScanners.length === 0) return null;

  let best = -Infinity;
  for (const scanner of ownedScanners) {
    const bonus = SCANNER_TIER_RADIUS_BONUS.find((entry) => entry.tier === scanner.tier)?.radiusBonus;
    if (bonus === undefined) throw new RangeError(`no radius bonus defined for tier ${scanner.tier}`);
    if (bonus > best) best = bonus;
  }
  return best;
}

// Scanner/Probe GDD §2.3/§2.4. Necessary completion: the GDD's own
// pseudocode names `performScan(playerId, dockedPlanetId)`, but a pure
// function can't resolve "the player," "where they're docked," or "which
// scanners they own" from bare IDs into an implicit store -- same
// resolution already applied to every other Agent 20 function
// (purchaseShip takes ShipCandidate/ShipyardPool/Wallet directly, not
// IDs). "Docked at dockedPlanet" is read off `ship.currentPlanetId`, the
// same field resolveArrival() already uses to represent "where a ship
// currently is" -- there is no separate player-location concept anywhere
// in this codebase to hang this check on instead.
export function performScan(
  ship: Ship,
  dockedPlanet: Planet,
  ownedScanners: readonly Scanner[],
  allPlanets: readonly Planet[],
): PerformScanResult {
  if (ship.currentPlanetId !== dockedPlanet.id) {
    return { scanned: false, reason: "ship is not docked at the given planet" };
  }
  if (!dockedPlanet.discovered) {
    return { scanned: false, reason: "docked planet is not yet discovered" };
  }
  if (!dockedPlanet.position) {
    // Structurally required, same as calculateTravelTime()'s equivalent
    // check -- an already-discovered planet with a real position is the
    // only planet a scan can meaningfully originate from.
    throw new Error("performScan: docked planet must have a generated position");
  }

  const radiusBonus = highestOwnedRadiusBonus(ownedScanners);
  if (radiusBonus === null) {
    // Agent 20's contract calls for a conservative default here -- the
    // "use the base radius with zero scanner owned" case is ambiguous in
    // the design doc, so this rejects rather than guessing.
    return { scanned: false, reason: "no scanner owned" };
  }

  const effectiveRadius = SCANNER_BASE_SCAN_RADIUS + radiusBonus;

  const newlyDiscovered: Planet[] = [];
  for (const planet of allPlanets) {
    if (planet.discovered) continue;
    // Planets without a generated position (e.g. MVP-era Delta Rigelus)
    // can't be measured against a radius -- skipped, not thrown, since a
    // galaxy-wide scan legitimately iterates over every planet on record,
    // unlike calculateTravelTime()'s single deliberate two-planet call.
    if (!planet.position) continue;

    const distance = calculateDistance(dockedPlanet.position, planet.position);
    if (distance <= effectiveRadius) {
      newlyDiscovered.push({ ...planet, discovered: true });
    }
  }

  return { scanned: true, newlyDiscovered };
}
