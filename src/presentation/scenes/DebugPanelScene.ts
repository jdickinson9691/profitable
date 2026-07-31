import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { TUNING_SECTIONS, resetAllTuningToDefaults } from "../debugTuningRegistry.ts";
import type { TuningRow } from "../debugTuningRegistry.ts";
import { setForcedEncounterType } from "../debugState.ts";
import type { EncounterType } from "../../data/types/encounter.ts";

// Alpha Section 4 (docs/profitable-alpha-uiux-onboarding-plan.md §2):
// "A simple, ugly-is-fine panel exposing the tunable values... for live
// adjustment during a play session." Only ever registered/reachable behind
// isDebugModeEnabled() -- see main.ts (scene registration) and nav.ts
// (the nav entry) for the two gates. Presentation-layer only: every value
// this scene touches is a debugTuningRegistry.ts row's get()/set(), which
// themselves reach into the same data/constants files every simulation
// function already reads -- no formula/logic is duplicated or reimplemented
// here.
const VIEWPORT_TOP = 64;
const VIEWPORT_BOTTOM = 455;
const ROW_HEIGHT = 18;

const FORCE_ENCOUNTER_TYPES: ReadonlyArray<{ type: EncounterType; label: string }> = [
  { type: "tradeOpportunity", label: "Trade Opportunity" },
  { type: "discovery", label: "Discovery" },
  { type: "hazard", label: "Hazard" },
  { type: "combat", label: "Combat" },
];

export class DebugPanelScene extends Phaser.Scene {
  private statusText?: Phaser.GameObjects.Text;
  private pendingMessage = "";
  private contentContainer?: Phaser.GameObjects.Container;
  private maskShape?: Phaser.GameObjects.Graphics;
  private scrollY = 0;
  private maxScrollY = 0;

  constructor() {
    super(SCENE_KEYS.debugPanel);
  }

  create(): void {
    this.redraw();
    this.input.on("wheel", (_pointer: unknown, _objects: unknown, _dx: number, dy: number) => {
      if (this.maxScrollY <= 0) return;
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, this.maxScrollY);
      this.contentContainer?.setY(-this.scrollY);
      this.updateScrollInteractivity();
    });
  }

  private setStatus(message: string): void {
    this.pendingMessage = message;
    this.statusText?.setText(message);
  }

  // Same scrollable-container pattern TradeMapScene.ts already established
  // (Galactic Map Agent 25/26 verification fix) -- this panel's ~100 rows
  // overflow the fixed 800x500 canvas far more than that scene's content
  // ever did, so it needs the same fix from the start rather than
  // discovering the overflow later.
  private addText(x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    const object = this.add.text(x, y, text, style);
    this.contentContainer?.add(object);
    return object;
  }

  private updateScrollInteractivity(): void {
    const containerY = this.contentContainer?.y ?? 0;
    for (const child of this.contentContainer?.list ?? []) {
      const object = child as Phaser.GameObjects.Text;
      if (!object.input) continue;
      const worldY = object.y + containerY;
      object.input.enabled = worldY >= VIEWPORT_TOP && worldY + object.height <= VIEWPORT_BOTTOM;
    }
  }

  private redraw(): void {
    this.contentContainer?.destroy();
    this.maskShape?.destroy();
    this.children.removeAll();
    renderNav(this, SCENE_KEYS.debugPanel);

    this.contentContainer = this.add.container(0, -this.scrollY);
    this.maskShape = this.make.graphics();
    this.maskShape.fillRect(0, VIEWPORT_TOP, this.cameras.main.width, VIEWPORT_BOTTOM - VIEWPORT_TOP);
    this.contentContainer.setMask(this.maskShape.createGeometryMask());

    this.addText(16, VIEWPORT_TOP, "Debug / Tuning Panel (debug build only)", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#ff5555",
    });

    let y = VIEWPORT_TOP + 30;
    y = this.renderForceEncounterSection(y);
    y += 8;

    const resetBtn = this.addText(16, y, "> Reset all tuning to alpha defaults", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ff8844",
    });
    resetBtn.setInteractive({ useHandCursor: true });
    resetBtn.on("pointerdown", () => {
      resetAllTuningToDefaults();
      this.setStatus("All tuning values reset to alpha defaults.");
      this.redraw();
    });
    y += 26;

    for (const section of TUNING_SECTIONS) {
      y = this.renderSection(section.title, section.rows, y);
      y += 10;
    }

    this.maxScrollY = Math.max(0, y - VIEWPORT_BOTTOM);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScrollY);
    this.contentContainer.setY(-this.scrollY);
    this.updateScrollInteractivity();

    if (this.maxScrollY > 0) {
      this.add.text(16, VIEWPORT_BOTTOM + 3, "(scroll for more)", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#666666",
      });
    }

    this.statusText = this.add.text(16, 470, this.pendingMessage, {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#cccccc",
    });
  }

  // "Let a debug session manually trigger a combat encounter (or any
  // encounter type) on demand" -- sets a one-shot flag TradeMapScene reads
  // on its next resolveArrival() call (debugState.ts). Does not itself
  // create any CombatEncounter/EncounterResult -- that only ever happens
  // through the real resolveArrival()->resolveEncounters() path, same as a
  // natural roll.
  private renderForceEncounterSection(startY: number): number {
    let y = startY;
    this.addText(16, y, "Force next voyage arrival to include an encounter:", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffffff",
    });
    y += 20;

    let x = 16;
    for (const { type, label } of FORCE_ENCOUNTER_TYPES) {
      const btn = this.addText(x, y, `[ ${label} ]`, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#4caf50",
      });
      btn.setInteractive({ useHandCursor: true });
      btn.on("pointerdown", () => {
        setForcedEncounterType(type);
        this.setStatus(
          `Next resolved voyage arrival will force a "${label}" encounter. Initiate/resolve a voyage on TradeMap to trigger it.`,
        );
        this.redraw();
      });
      x += btn.width + 16;
    }
    y += 22;
    return y;
  }

  private formatValue(row: TuningRow): string {
    return row.get().toFixed(row.decimals);
  }

  private renderSection(title: string, rows: TuningRow[], startY: number): number {
    let y = startY;
    this.addText(16, y, title, { fontFamily: "monospace", fontSize: "16px", color: "#ffd700" });
    y += 22;

    for (const tuningRow of rows) {
      this.addText(24, y, `${tuningRow.label}:`, { fontFamily: "monospace", fontSize: "13px", color: "#cccccc" });
      const valueText = this.addText(400, y, this.formatValue(tuningRow), {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffffff",
      });

      const minusBtn = this.addText(470, y, "[-]", { fontFamily: "monospace", fontSize: "13px", color: "#ff6666" });
      minusBtn.setInteractive({ useHandCursor: true });
      minusBtn.on("pointerdown", () => {
        tuningRow.set(tuningRow.get() - tuningRow.step);
        valueText.setText(this.formatValue(tuningRow));
      });

      const plusBtn = this.addText(500, y, "[+]", { fontFamily: "monospace", fontSize: "13px", color: "#4caf50" });
      plusBtn.setInteractive({ useHandCursor: true });
      plusBtn.on("pointerdown", () => {
        tuningRow.set(tuningRow.get() + tuningRow.step);
        valueText.setText(this.formatValue(tuningRow));
      });

      y += ROW_HEIGHT;
    }
    return y;
  }
}
