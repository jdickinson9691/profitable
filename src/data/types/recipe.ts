import type { Quality } from "./quality.ts";

export interface RecipeInput {
  category: string;
  quantity: number;
  // Both present together, or both absent (no threshold requirement for
  // this slot).
  thresholdQuality?: Quality;
  thresholdValue?: number;
}

export interface Recipe {
  id: string;
  name: string;
  // Matched positionally against craft()'s `inputs` array.
  inputs: RecipeInput[];
  outputResourceId: string;
  outputQuantity: number;
}
