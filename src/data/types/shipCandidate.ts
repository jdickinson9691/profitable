import type { ShipComponent } from "./shipComponent.ts";
import type { TierColor } from "./tierColor.ts";

// Necessary correction to the Phase 5 amendment's own literal pseudocode,
// discovered while writing this amendment -- same precedent as Phase 4's
// CrewCandidate/CrewMember split (see src/data/types/crewCandidate.ts).
// ShipyardPool.availableShips was written as Ship[] in the amendment's own
// pseudocode, but an unpurchased shipyard candidate has no real ownerId
// yet -- Ship.ownerId is required and meaningless before a purchase
// transfers ownership. ShipCandidate omits only that field; name/tier/
// components are all still meaningful pre-purchase (a placeholder name,
// same "Planet-{seed}"-style scheme Agent 8 used, is assigned at roll
// time -- naming isn't a decided design point, so a placeholder unblocks
// generation the same way it did for planets).
export interface ShipCandidate {
  id: string;
  name: string;
  tier: TierColor;
  components: {
    weapon: ShipComponent | null;
    engine: ShipComponent | null;
    shield: ShipComponent | null;
    cargoHold: ShipComponent | null;
  };
}
