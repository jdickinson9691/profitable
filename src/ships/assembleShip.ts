import type { Ship } from "../data/types/ship.ts";
import type { ShipComponent } from "../data/types/shipComponent.ts";
import type { ComponentCategory } from "../data/types/componentCategory.ts";
import { deriveShipTier } from "./deriveShipTier.ts";
import { deriveFuelCapacity } from "./deriveFuelCapacity.ts";

// Phase 5 GDD §2.1/§2.3. Necessary completion: takes the actual crafted
// ShipComponent directly rather than a componentId into an implicit
// store, same pure-function reasoning as every other necessary
// completion in this project. A component whose own category doesn't
// match the target slot is a caller/programming error (unlike a rejected
// hire or an insufficient-funds purchase, which are normal business
// outcomes) -- not something a returned rejection value needs to
// represent, so this throws rather than extending the return type to a
// Result union the contract never asked for.
export function assembleShip(ship: Ship, component: ShipComponent, slot: ComponentCategory): Ship {
  if (component.category !== slot) {
    throw new RangeError(`cannot install a "${component.category}" component into the "${slot}" slot`);
  }

  const updated: Ship = {
    ...ship,
    components: { ...ship.components, [slot]: component },
  };

  // Tier must never be stale relative to installed components (Agent
  // 20's own contract) -- recomputed on every assembly change, never
  // read off the previous ship.tier value.
  const tier = deriveShipTier(updated);

  // Ship Fuel amendment: fuelCapacity recomputes at the same moment tier
  // does -- never left stale (ship.md's own contract). This is also what
  // ends the starting ship's STARTING_SHIP_FUEL_CAPACITY bootstrap
  // exception: its first component change routes fuelCapacity through
  // this normal per-tier lookup instead, per that constant's own
  // "expires on first component change" rule. currentFuel is clamped
  // down if the new capacity is smaller (never lost fuel simply appears,
  // but an over-full tank relative to a shrunken capacity can't persist
  // either), left unchanged otherwise -- a bigger tank doesn't retroactively
  // refill itself.
  const fuelCapacity = deriveFuelCapacity(tier);
  const currentFuel = Math.min(updated.currentFuel, fuelCapacity);

  return { ...updated, tier, fuelCapacity, currentFuel };
}
