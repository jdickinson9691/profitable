// Colonist-Driven Production (planet-ownership.md). Originated defaults,
// tunable -- same status as every other new numeric value this project
// introduces.
//
// Retroactive removal (2026-08-04): Citadels' CitadelLevelBenefit/
// CITADEL_LEVEL_BENEFITS/setCitadelLevelBenefit removed from this file --
// see planet-ownership.md's own retroactive note for the full account.
// The two constants below are unaffected; Colonist-Driven Production
// never depended on Citadels for anything.

export let COLONIST_TRANSPORT_COST = 15;
export function setColonistTransportCost(value: number): void {
  COLONIST_TRANSPORT_COST = value;
}

export let MINIMUM_COLONISTS_TO_PRODUCE = 5;
export function setMinimumColonistsToProduce(value: number): void {
  MINIMUM_COLONISTS_TO_PRODUCE = value;
}
