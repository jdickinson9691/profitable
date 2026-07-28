import type { PlanetPosition } from "../data/types/planet.ts";

// Shared Euclidean distance helper, extracted out of calculateTravelTime()
// specifically for the Scanner/Probe amendment's own instruction not to
// duplicate this formula a second time (`performScan()` needs the exact
// same distance math). 2D only -- no z axis, same constraint
// calculateTravelTime() already documented (Phase 5 GDD §2.7).
export function calculateDistance(a: PlanetPosition, b: PlanetPosition): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}
