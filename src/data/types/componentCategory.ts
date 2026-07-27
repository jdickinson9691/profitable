// Phase 5 GDD §2.5 -- the 4 ship component categories, deliberately
// minimal for now (no 5th category speculatively added).
export type ComponentCategory = "weapon" | "engine" | "shield" | "cargoHold";

export const COMPONENT_CATEGORIES: readonly ComponentCategory[] = [
  "weapon",
  "engine",
  "shield",
  "cargoHold",
];
