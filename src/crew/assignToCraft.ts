import type { CrewMember } from "../data/types/crewMember.ts";
import type { CraftAction } from "../data/types/craftAction.ts";
import type { AssignResult } from "../data/types/assignResult.ts";
import type { RandomFn } from "../data/types/random.ts";
import { craft } from "../simulation/craft.ts";

// Phase 4 GDD §2.1/§2.5. Calls Agent 2's craft() using this crew member's
// tier as the crafter input -- never reimplements any part of the
// formula. "Simultaneously with the player's own craft and other crew
// members' crafts" (§2.5) just means this call carries no shared/locked
// state with any other crafter's call: craft() is already a pure,
// independent function, so nothing here serializes multiple crew members
// into a single-craft-at-a-time queue -- calling this once per crew
// member per turn *is* the simultaneity.
//
// Profession is not passed to craft() -- there is no mechanism anywhere
// in the crafting formula for a profession bonus, and no recipe-to-
// profession eligibility mapping exists either (both depend on the still-
// undecided profession taxonomy, see profession.ts). Profession's only
// current effect is informational (what a hired tier 6-7 crew member is
// labeled as); binding it to specific recipes is future work once that
// taxonomy exists, not something to invent here.
export function assignToCraft(crewMember: CrewMember, craftAction: CraftAction, random?: RandomFn): AssignResult {
  const craftResult = craft(craftAction.inputs, craftAction.recipe, craftAction.schematicTier, crewMember.tier, random);

  return {
    assigned: true,
    updatedCrewMember: { ...crewMember, status: "active", assignedCraftId: craftAction.id },
    craftResult,
  };
}
