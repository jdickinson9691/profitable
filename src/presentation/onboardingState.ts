import { saveSystem } from "./gameState.ts";

// Alpha Section 4 (docs/profitable-alpha-uiux-onboarding-plan.md §1): "a
// sequenced, skippable tooltip walkthrough over the existing screens."
// The 7 steps, in the plan doc's own natural order -- but tracked as a
// per-scene "seen" set rather than a strict linear pointer, since this
// game's nav bar deliberately lets a player visit any scene in any order
// (nav.ts's own comment: "move freely... rather than being locked into one
// linear path"). A player who opens Shipyard before ever visiting Gather
// still sees Shipyard's own tip on that first visit -- each step is
// independent, not gated behind the ones before it.
export const ONBOARDING_STEPS = ["Gather", "Refine", "Craft", "Market", "TradeMap", "Shipyard", "Crew"] as const;
export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number];

const ONBOARDING_SEEN_STEPS_SAVE_KEY = "profitable:onboardingSeenSteps";

let seenSteps: Set<OnboardingStepKey> = new Set(
  (saveSystem.load(ONBOARDING_SEEN_STEPS_SAVE_KEY) as OnboardingStepKey[] | null) ?? [],
);

function persist(): void {
  saveSystem.save(ONBOARDING_SEEN_STEPS_SAVE_KEY, [...seenSteps]);
}

export function isStepSeen(step: OnboardingStepKey): boolean {
  return seenSteps.has(step);
}

// Dismissing one step's tooltip ("Got it") only ever marks that one step --
// never implies the player has seen any other step's tip too.
export function markStepSeen(step: OnboardingStepKey): void {
  if (seenSteps.has(step)) return;
  seenSteps = new Set(seenSteps).add(step);
  persist();
}

export function isOnboardingComplete(): boolean {
  return ONBOARDING_STEPS.every((step) => seenSteps.has(step));
}

// "Skip Tour" -- available on every single step's tooltip (plan doc: "must
// be skippable at every step"), marks every remaining step seen at once so
// no further tooltip appears anywhere, not just the current scene's.
export function skipAllOnboarding(): void {
  seenSteps = new Set(ONBOARDING_STEPS);
  persist();
}

// Settings screen's "reset onboarding" option (plan doc §2): "useful for
// playtesting the onboarding itself repeatedly." Re-arms every step.
export function resetOnboarding(): void {
  seenSteps = new Set();
  persist();
}
