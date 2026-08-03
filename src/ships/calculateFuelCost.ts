import type { Planet } from "../data/types/planet.ts";
import { FUEL_COST_PER_DISTANCE_UNIT } from "../data/constants/shipsAndTravelConfig.ts";
import { calculateDistance } from "./calculateDistance.ts";

// Ship Fuel (profitable-design-questions.md). Same directory/shape as
// calculateTravelTime.ts. Pure, no Ship parameter -- fuel cost is
// deliberately not tier-modified, unlike travel time (see the design
// entry: tier's fuel-relevant effect is capacity, not efficiency).
export function calculateFuelCost(origin: Planet, destination: Planet): number {
  if (!origin.position || !destination.position) {
    // Same "structurally required, not a normal rejection" throw
    // calculateTravelTime() already uses for the identical precondition.
    throw new Error("calculateFuelCost: both planets must have a generated position");
  }
  return calculateDistance(origin.position, destination.position) * FUEL_COST_PER_DISTANCE_UNIT;
}
