import type { CombatEncounter } from "./combatEncounter.ts";
import type { Ship } from "./ship.ts";
import type { CrewMember } from "./crewMember.ts";
import type { Voyage } from "./voyage.ts";

// Combat GDD §2.5/§3, Agent 20's own contract: `resolveCombatChoice(...):
// CombatResolution` is named but never defined -- same category of gap as
// PurchaseShipResult/PerformScanResult before it. Not a discriminated
// union: every choice (attack or flee) produces exactly this shape, the
// fields simply differ in what's populated -- `updatedCrewMember` and
// `retreatVoyage` are both `null` on a win (GDD §2.5: "no further
// action"); on lose/flee, `retreatVoyage` is always set, but
// `updatedCrewMember` stays `null` too if the player happens to own no
// crew at all (this agent's contract: "if none owned, skip this step
// entirely" -- a retreat still happens, there's just no one to bench).
export interface CombatResolution {
  combatEncounter: CombatEncounter;
  updatedShip: Ship;
  updatedCrewMember: CrewMember | null;
  retreatVoyage: Voyage | null;
}
