import type { ComponentCategory } from "./componentCategory.ts";

// Necessary completion, per this amendment's own testing requirement:
// "confirm the existing Recipe type is sufficient to express component
// recipes... if a gap is found, report it rather than redesigning Recipe
// unilaterally." Recipe IS sufficient, unmodified, for the input side
// (category + threshold inputs -- exactly what component recipes need,
// no change required). A real gap exists on the output side: Recipe's
// `outputResourceId` is designed to reference a Resource (looked up in
// content.resources, feeding craft()'s applicableQualities), but a
// ShipComponent is not a Resource -- it has no applicableQualities, and
// isn't tracked as an inventory batch the way MVP items are. Nothing on
// Recipe or Resource records which ComponentCategory a given recipe's
// craft() output should become.
//
// Resolved without touching Recipe: ComponentRecipe is a small link
// table, populated by Agent 23 alongside each component recipe it writes,
// mapping a recipe id to the ComponentCategory its craft() output
// represents. Agent 20's ship-assembly path reads this to know which
// slot a freshly-crafted component belongs in and to wrap craft()'s
// qualities output into a real ShipComponent record.
export interface ComponentRecipe {
  recipeId: string;
  category: ComponentCategory;
}
