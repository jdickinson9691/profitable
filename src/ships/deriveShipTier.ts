import type { Ship } from "../data/types/ship.ts";
import type { ShipComponent } from "../data/types/shipComponent.ts";
import type { TierColor } from "../data/types/tierColor.ts";
import { TIER_COLOR_BREAKPOINTS } from "../data/constants/tierColor.ts";
import { getTierColor } from "../simulation/tierColor.ts";

// Phase 5 GDD §2.3. Reuses the existing tier breakpoint table's own
// min/max per tier to get a representative number for each installed
// component (the midpoint of its range), averages those numbers, then
// maps back through getTierColor() -- never reimplements breakpoint
// logic, same discipline as every other tier-derivation in this project.
function tierMidpoint(tier: TierColor): number {
  const breakpoint = TIER_COLOR_BREAKPOINTS.find((entry) => entry.tier === tier);
  if (!breakpoint) throw new RangeError(`no breakpoint defined for tier ${tier}`);
  return (breakpoint.min + breakpoint.max) / 2;
}

// Documented null-slot rule (Agent 20's contract requires one, explicit,
// not silently ambiguous): a null slot is EXCLUDED from the average --
// a ship with 1-3 components installed is rated on what it has. A ship
// with ZERO components installed has nothing to average, so it falls
// back to Grey -- an unrated/incomplete ship is treated as the lowest
// tier, consistent with the scarcity/exclusivity theme this design uses
// everywhere else (an unequipped ship is not a "neutral" ship, the way
// Green is neutral for planet tier -- it's a ship that isn't ready).
export function deriveShipTier(ship: Ship): TierColor {
  const installed = Object.values(ship.components).filter(
    (component): component is ShipComponent => component !== null,
  );
  if (installed.length === 0) return "Grey";

  const average = installed.reduce((sum, component) => sum + tierMidpoint(component.tier), 0) / installed.length;
  return getTierColor(average);
}
