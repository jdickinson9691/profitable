import type { Recipe } from "../../src/data/types/recipe.ts";

// GDD §3.4 / CLAUDE.md §4: 1x Radiant Alloy Bar (durability 60+
// recommended) + 1x Hydrogen Gas -> 1x Ion-Forged Hull Plate. Matched
// positionally: inputs[0] against this slot 0, inputs[1] against slot 1.
export const ionForgedHullPlateRecipe: Recipe = {
  id: "ion-forged-hull-plate",
  name: "Ion-Forged Hull Plate",
  inputs: [
    { category: "refined-metal", quantity: 1, thresholdQuality: "durability", thresholdValue: 60 },
    { category: "gas", quantity: 1 },
  ],
  outputResourceId: "ion-forged-hull-plate",
  outputQuantity: 1,
};
