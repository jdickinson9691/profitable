import type { Resource } from "./resource.ts";
import type { QualityRoll } from "./quality.ts";

// A concrete, rolled batch of a Resource -- what refine()/craft() actually
// consume. Multiple instances of the same Resource type can carry different
// rolled qualities (different gathering rolls), so quality lives per
// instance, not per Resource.
export interface ResourceInstance {
  resource: Resource;
  quantity: number;
  qualities: QualityRoll;
}
