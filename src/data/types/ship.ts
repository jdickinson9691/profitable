import type { ShipComponent } from "./shipComponent.ts";
import type { TierColor } from "./tierColor.ts";

// Phase 5 GDD §2.1/§2.3 -- a ship's tier is derived (straight average of
// installed component tiers, via deriveShipTier() -- Agent 20's job, never
// reimplemented here), not an independent stat. All 4 slots may be null --
// a ship under construction/purchased-bare is still a valid Ship record;
// deriveShipTier()'s handling of that case is Agent 20's documented
// responsibility, not this type's.
//
// currentPlanetId is a necessary completion, found while implementing
// Agent 20: resolveArrival() must "deliver the ship... to the destination
// planet" (its own contract's wording), but nothing on Ship recorded where
// a ship currently is -- without this field a voyage would have nothing
// to update on arrival, and a second voyage would have no way to know
// its own origin. Set at purchase time (to the shipyard planet's id) and
// updated only by resolveArrival() on a successful arrival -- never
// mutated mid-voyage; the Voyage record itself is what represents
// "currently in transit."
// Ship Fuel amendment (profitable-design-questions.md). Required, not
// optional -- same precedent currentPlanetId itself set (added required,
// fixtures updated) rather than Voyage.encounters/isRetreat's backward-
// compatible-optional pattern, since every Ship going forward gets these
// via purchaseShip()/assembleShip(), not retrofitted onto old save data
// silently. fuelCapacity is derived from tier (deriveFuelCapacity(),
// recomputed by assembleShip() on every component change, same moment
// tier itself recomputes) -- never set directly.
export interface Ship {
  id: string;
  name: string;
  ownerId: string;
  tier: TierColor;
  currentPlanetId: string;
  fuelCapacity: number;
  currentFuel: number;
  components: {
    weapon: ShipComponent | null;
    engine: ShipComponent | null;
    shield: ShipComponent | null;
    cargoHold: ShipComponent | null;
  };
  // Ship Crew Roles amendment (resolveComponentRepair()). Optional, unlike
  // fuelCapacity/currentFuel's required-field precedent -- missing means
  // "never repaired/no tracked history," which resolveComponentRepair()
  // reads as zero elapsed time on its first call for a given ship, never
  // a free retroactive catch-up. Mutated only by resolveComponentRepair()
  // itself, same "own field, own writer" pattern currentFuel follows for
  // initiateVoyage()/refuelShip().
  lastRepairedAt?: number;
}
