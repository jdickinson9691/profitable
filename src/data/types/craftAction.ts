import type { ResourceInstance } from "./resourceInstance.ts";
import type { Recipe } from "./recipe.ts";
import type { TierColor } from "./tierColor.ts";

// Necessary completion: Agent 16's contract passes a "craftAction" to
// assignToCraft()/resolveBackgroundCrafting() but never defines its shape.
// Bundles everything craft() needs besides the crafter's own tier (which
// comes from the CrewMember doing the work, not from this action): the
// consumed inputs, which recipe, and which schematic. `id` is what
// CrewMember.assignedCraftId points at once assigned.
export interface CraftAction {
  id: string;
  inputs: ResourceInstance[];
  recipe: Recipe;
  schematicTier: TierColor;
}
