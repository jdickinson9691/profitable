import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { audioManager, setAudioEnabled } from "../gameState.ts";
import { resetOnboarding } from "../onboardingState.ts";

// Alpha Section 4 (docs/profitable-alpha-uiux-onboarding-plan.md §2):
// "Minimum for alpha: audio on/off toggle, wired to the existing
// AudioManager... a 'reset onboarding' option." Both are real settings,
// not stubs -- setAudioEnabled() actually mutes/unmutes AudioManager (and
// persists via SaveSystem), and resetOnboarding() actually clears the same
// completion flag OnboardingOverlay reads.
export class SettingsScene extends Phaser.Scene {
  private statusText?: Phaser.GameObjects.Text;
  private pendingMessage = "";

  constructor() {
    super(SCENE_KEYS.settings);
  }

  create(): void {
    this.redraw();
  }

  private setStatus(message: string): void {
    this.pendingMessage = message;
    this.statusText?.setText(message);
  }

  private redraw(): void {
    this.children.removeAll();
    renderNav(this, SCENE_KEYS.settings);

    this.add.text(16, 64, "Settings", { fontFamily: "monospace", fontSize: "24px", color: "#ffffff" });

    const audioLabel = audioManager.isEnabled() ? "Audio: ON" : "Audio: OFF";
    const audioBtn = this.add.text(16, 110, `> ${audioLabel} (click to toggle)`, {
      fontFamily: "monospace",
      fontSize: "16px",
      color: audioManager.isEnabled() ? "#4caf50" : "#888888",
    });
    audioBtn.setInteractive({ useHandCursor: true });
    audioBtn.on("pointerdown", () => {
      setAudioEnabled(!audioManager.isEnabled());
      this.setStatus(audioManager.isEnabled() ? "Audio enabled." : "Audio disabled.");
      this.redraw();
    });

    const resetBtn = this.add.text(16, 150, "> Reset Onboarding", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#2196f3",
    });
    resetBtn.setInteractive({ useHandCursor: true });
    resetBtn.on("pointerdown", () => {
      resetOnboarding();
      this.setStatus("Onboarding reset -- the tooltip walkthrough will show again on your next visit to Gather.");
    });

    this.statusText = this.add.text(16, 200, this.pendingMessage, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cccccc",
    });
  }
}
