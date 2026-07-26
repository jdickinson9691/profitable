import Phaser from "phaser";
import { TIER_VARIANCE } from "../../data/constants/tierVariance.ts";
import { TIER_COLOR_HEX } from "../display.ts";
import type { TierColor } from "../../data/types/tierColor.ts";

// Ordered list of all 7 tiers, sourced from Agent 1's own table rather
// than re-listing the names here.
const TIERS: TierColor[] = TIER_VARIANCE.map((entry) => entry.tier);

function toHexString(hex: number): string {
  return `#${hex.toString(16).padStart(6, "0")}`;
}

export function renderTierSelector(
  scene: Phaser.Scene,
  x: number,
  y: number,
  selected: TierColor,
  onSelect: (tier: TierColor) => void,
): void {
  let cursorX = x;
  for (const tier of TIERS) {
    const isSelected = tier === selected;
    const label = scene.add.text(cursorX, y, isSelected ? `[${tier}]` : tier, {
      fontFamily: "monospace",
      fontSize: "16px",
      color: toHexString(TIER_COLOR_HEX[tier]),
    });
    label.setInteractive({ useHandCursor: true });
    label.on("pointerdown", () => onSelect(tier));
    cursorX += label.width + 12;
  }
}
