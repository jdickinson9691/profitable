// Colonist-Driven Production / Citadels (planet-ownership.md). Originated
// defaults, tunable -- same status as every other new numeric value this
// project introduces.

export let COLONIST_TRANSPORT_COST = 15;
export function setColonistTransportCost(value: number): void {
  COLONIST_TRANSPORT_COST = value;
}

export let MINIMUM_COLONISTS_TO_PRODUCE = 5;
export function setMinimumColonistsToProduce(value: number): void {
  MINIMUM_COLONISTS_TO_PRODUCE = value;
}

export interface CitadelLevelBenefit {
  level: 1 | 2 | 3;
  // Credits + material cost to build TO this level FROM the previous one
  // (sequential, no skipping -- buildCitadel()'s own rule). Reuses the
  // existing "credits + crafted materials" purchase shape, not a new
  // economy -- resourceId references an existing content item, never an
  // invented one.
  constructionCost: { credits: number; material: { resourceId: string; quantity: number } | null };
  refuelDiscountPercent: number; // 0 until Level 2
  repairEnabled: boolean; // false until Level 2
}

// Level 1: docking only, no mechanical effect (see planet-ownership.md's
// own honesty note on why -- TW2002's level-1 benefit protects against an
// invasion threat this game has no model of). Level 2: refuel discount +
// repair, at a reduced rate (CITADEL_LEVEL_2_REPAIR_RATE, ship.md's
// resolveComponentRepair()). Level 3: same refuel discount, repair
// upgrades to the full rate (CITADEL_LEVEL_3_REPAIR_RATE).
//
// Repurposed from an original "cargo storage" benefit at Level 2 (found
// during the TradeWars alignment follow-up: cargo storage was designed to
// protect a remote-cargo-voyage mechanic that was itself never given a
// player-facing UI, deliberately, per the original Phase 3/5 contract --
// Voyage.cargo has no path that ever populates it and resolveArrival()
// never turns delivered cargo into a real Listing, so there was nothing
// for a storage exemption to actually protect). Repair scaling by
// investment depth fits the existing design better: it's the one Citadel
// benefit already built and player-visible (ShipStatusScene's
// > Check Repair), and every other tiered system in this project scales a
// real, already-working mechanic by depth of investment rather than
// gating a binary flag on it.
//
// Construction materials reuse existing refined content (iron-ingot) --
// not a new item, per the "reuse the shape" discipline this project
// applies to every new mechanic that needs a material cost.
export const CITADEL_LEVEL_BENEFITS: readonly CitadelLevelBenefit[] = [
  {
    level: 1,
    constructionCost: { credits: 100, material: null },
    refuelDiscountPercent: 0,
    repairEnabled: false,
  },
  {
    level: 2,
    constructionCost: { credits: 300, material: { resourceId: "iron-ingot", quantity: 5 } },
    refuelDiscountPercent: 0.25,
    repairEnabled: true,
  },
  {
    level: 3,
    constructionCost: { credits: 800, material: { resourceId: "iron-ingot", quantity: 15 } },
    refuelDiscountPercent: 0.25,
    repairEnabled: true,
  },
];
export function setCitadelLevelBenefit(level: 1 | 2 | 3, benefit: Omit<CitadelLevelBenefit, "level">): void {
  const index = CITADEL_LEVEL_BENEFITS.findIndex((entry) => entry.level === level);
  if (index === -1) return;
  (CITADEL_LEVEL_BENEFITS as CitadelLevelBenefit[])[index] = { level, ...benefit };
}
