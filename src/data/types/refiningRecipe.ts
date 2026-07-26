// Not one of Agent 1's originally-listed 6 types, but Agent 6's contract
// requires a "refining recipe config" and nothing else covers that shape.
// refine() itself takes no recipe parameter (it just averages whatever
// ResourceInstance[] it's given) -- this type exists purely for
// content/presentation purposes: which specific resources combine, in what
// quantities, into what output.
export interface RefiningRecipeInput {
  resourceId: string;
  quantity: number;
}

export interface RefiningRecipe {
  id: string;
  name: string;
  inputs: RefiningRecipeInput[];
  outputResourceId: string;
  outputQuantity: number;
}
