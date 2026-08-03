// Planet Resource Generation (profitable-design-questions.md). Originated
// default, tunable -- same status as every other new numeric table in this
// project. A planet's producible resources/specialty/qualities re-roll once
// per this many hours, phase-offset per planet (planetResourceCycle.ts) so
// planets don't all reset in lockstep.
export let PLANET_RESOURCE_RESET_INTERVAL_HOURS = 168;
export function setPlanetResourceResetIntervalHours(value: number): void {
  PLANET_RESOURCE_RESET_INTERVAL_HOURS = value;
}

// The starting-planet tutorial guarantee's 3 fixed resources -- the exact
// MVP tutorial chain (A1/A2 refining/crafting) needs, named directly rather
// than derived from any formula. Structural, not a balance knob -- plain
// const, not exposed on the debug/tuning panel.
export const TUTORIAL_GUARANTEED_RESOURCE_IDS: readonly string[] = [
  "igneous-ore",
  "autunite-crystal",
  "hydrogen-gas",
];

// The clamp value every dimension of a guaranteed resource is capped to
// when it would otherwise aggregate above White -- White's own ceiling
// (src/data/constants/tierColor.ts), chosen so the clamped result always
// lands exactly at White, never accidentally into Green. Structural, not a
// balance knob -- plain const.
export const TUTORIAL_GUARANTEE_QUALITY_CLAMP = 60;
