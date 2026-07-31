import Phaser from "phaser";
import { isStepSeen, markStepSeen, skipAllOnboarding } from "../onboardingState.ts";
import type { OnboardingStepKey } from "../onboardingState.ts";

const OVERLAY_X = 16;
const OVERLAY_Y = 58;
const OVERLAY_WIDTH = 768;
// Kept deliberately short (58-106) -- every one of the 7 host scenes puts
// its own first real, interactive content at y=112 or later (recipe/item
// lists, action buttons), so this band only ever covers each scene's own
// title/subtitle line, never anything the tip is actually pointing at.
const OVERLAY_HEIGHT = 48;

// Alpha Section 4 onboarding tooltip walkthrough
// (docs/profitable-alpha-uiux-onboarding-plan.md §1). Every one of the 7
// relevant scenes calls this once, at the very end of its own
// create()/redraw() -- after all of the scene's own normal content, so
// Phaser's call-order z-stacking always puts this overlay on top. Draws
// nothing at all once markStepSeen()/skipAllOnboarding() has been called
// for this step (the common case for a returning player, or any step
// after the first visit). `redrawScene` is called after a dismiss/skip so
// the host scene tears down and rebuilds without this overlay -- same
// "call the owning scene's own redraw after a state change" responsibility
// every action button in this codebase already takes.
export function renderOnboardingStep(
  scene: Phaser.Scene,
  step: OnboardingStepKey,
  message: string,
  redrawScene: () => void,
): void {
  if (isStepSeen(step)) return;

  const bg = scene.add.rectangle(OVERLAY_X, OVERLAY_Y, OVERLAY_WIDTH, OVERLAY_HEIGHT, 0x1a2744, 1);
  bg.setOrigin(0, 0);
  bg.setStrokeStyle(2, 0xffd700);

  scene.add.text(OVERLAY_X + 12, OVERLAY_Y + 4, `Tip: ${message}`, {
    fontFamily: "monospace",
    fontSize: "12px",
    color: "#ffffff",
    wordWrap: { width: OVERLAY_WIDTH - 24 },
  });

  const gotItBtn = scene.add.text(OVERLAY_X + 12, OVERLAY_Y + OVERLAY_HEIGHT - 16, "> Got it", {
    fontFamily: "monospace",
    fontSize: "12px",
    color: "#4caf50",
  });
  gotItBtn.setInteractive({ useHandCursor: true });
  gotItBtn.on("pointerdown", () => {
    markStepSeen(step);
    redrawScene();
  });

  const skipBtn = scene.add.text(OVERLAY_X + 110, OVERLAY_Y + OVERLAY_HEIGHT - 16, "> Skip Tour", {
    fontFamily: "monospace",
    fontSize: "12px",
    color: "#ff8844",
  });
  skipBtn.setInteractive({ useHandCursor: true });
  skipBtn.on("pointerdown", () => {
    skipAllOnboarding();
    redrawScene();
  });
}
