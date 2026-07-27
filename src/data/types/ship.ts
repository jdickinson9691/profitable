import type { ShipComponent } from "./shipComponent.ts";
import type { TierColor } from "./tierColor.ts";

// Phase 5 GDD §2.1/§2.3 -- a ship's tier is derived (straight average of
// installed component tiers, via deriveShipTier() -- Agent 20's job, never
// reimplemented here), not an independent stat. All 4 slots may be null --
// a ship under construction/purchased-bare is still a valid Ship record;
// deriveShipTier()'s handling of that case is Agent 20's documented
// responsibility, not this type's.
export interface Ship {
  id: string;
  name: string;
  ownerId: string;
  tier: TierColor;
  components: {
    weapon: ShipComponent | null;
    engine: ShipComponent | null;
    shield: ShipComponent | null;
    cargoHold: ShipComponent | null;
  };
}
