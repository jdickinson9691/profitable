import type { Resource } from "../../src/data/types/resource.ts";
import type { ResourceInstance } from "../../src/data/types/resourceInstance.ts";
import type { QualityRoll } from "../../src/data/types/quality.ts";

// Builds a ResourceInstance fixture, defaulting unspecified qualities to
// null so tests only need to spell out the dimensions they care about.
export function makeInstance(
  resource: Resource,
  quantity: number,
  qualities: Partial<QualityRoll>,
): ResourceInstance {
  return {
    resource,
    quantity,
    qualities: {
      purity: null,
      density: null,
      potency: null,
      durability: null,
      rarity: null,
      ...qualities,
    },
  };
}
