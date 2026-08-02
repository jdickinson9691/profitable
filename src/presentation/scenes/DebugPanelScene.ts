import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { ScrollableContent, VIEWPORT_TOP, STATUS_TEXT_Y } from "./scrollableContent.ts";
import { TUNING_SECTIONS, resetAllTuningToDefaults } from "../debugTuningRegistry.ts";
import type { TuningRow } from "../debugTuningRegistry.ts";
import { setForcedEncounterType } from "../debugState.ts";
import type { EncounterType } from "../../data/types/encounter.ts";
import { seedPlaytestSave } from "../devSeed.ts";
import { getWallet, setWallet } from "../tradingState.ts";
import { getShipRoster, setShipRoster } from "../shipsState.ts";

// Alpha Section 4 (docs/profitable-alpha-uiux-onboarding-plan.md §2):
// "A simple, ugly-is-fine panel exposing the tunable values... for live
// adjustment during a play session." Only ever registered/reachable behind
// isDebugModeEnabled() -- see main.ts (scene registration) and nav.ts
// (the nav entry) for the two gates. Presentation-layer only: every value
// this scene touches is a debugTuningRegistry.ts row's get()/set(), which
// themselves reach into the same data/constants files every simulation
// function already reads -- no formula/logic is duplicated or reimplemented
// here.
//
// Ported from this scene's original GameObject.setMask(GeometryMask)
// implementation onto ScrollableContent (see that file's own header
// comment): the mask silently no-ops under Phaser 4's WebGL renderer, so
// this panel's clipping was never actually active under normal play. Same
// camera-viewport approach as every other scrollable scene now.
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
  private scroll?: ScrollableContent;

  constructor() {
    super(SCENE_KEYS.debugPanel);
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
    renderNav(this, SCENE_KEYS.debugPanel);

    this.scroll ??= new ScrollableContent(this);
    this.scroll.attachWheelInput();
    this.scroll.begin();

    this.scroll.addText(16, VIEWPORT_TOP, "Debug / Tuning Panel (debug build only)", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#ff5555",
    });

    let y = VIEWPORT_TOP + 30;
    y = this.renderPlaytestSetupSection(y);
    y += 8;
    y = this.renderActiveShipSection(y);
    y += 8;
    y = this.renderForceEncounterSection(y);
    y += 8;

    const resetBtn = this.scroll.addText(16, y, "> Reset all tuning to alpha defaults", {
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

    this.statusText = this.add.text(16, STATUS_TEXT_Y, this.pendingMessage, {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#cccccc",
    });

    // Must be the true last step -- see finish()'s own comment for why
    // ordering matters here.
    this.scroll.finish(y);
  }

  // docs/profitable-alpha-playtest.md's step 1 request: "very simple to
  // get what is needed to complete the playtest" -- previously
  // seedPlaytestSave() was only reachable via a devtools console command
  // (`__seedPlaytestSave()`, main.ts), which meant leaving the game to
  // open devtools every time a fresh playtest state was needed. A button
  // here calls the exact same function; no new seeding logic. The credit
  // top-up is a separate, additive action (never claws back credits, same
  // as seedWallet()'s own idempotent floor) -- covers scenarios like B3
  // (crew capacity's full 4-tier cost curve, 7500cr total) that the base
  // seeded wallet deliberately doesn't front, so ordinary trading
  // scenarios (B1) aren't made trivial by default.
  private renderPlaytestSetupSection(startY: number): number {
    let y = startY;
    this.scroll!.addText(16, y, "Playtest setup:", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffffff",
    });
    y += 20;

    const seedBtn = this.scroll!.addText(16, y, "[ Re-seed playtest save ]", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#4caf50",
    });
    seedBtn.setInteractive({ useHandCursor: true });
    seedBtn.on("pointerdown", () => {
      seedPlaytestSave();
      this.setStatus("Playtest save (state) seeded/topped up: ship, crew, inventory, discovered planets, scanners.");
      this.redraw();
    });

    const creditsBtn = this.scroll!.addText(280, y, "[ Add 5000 credits ]", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#4caf50",
    });
    creditsBtn.setInteractive({ useHandCursor: true });
    creditsBtn.on("pointerdown", () => {
      const wallet = getWallet();
      setWallet({ ...wallet, credits: wallet.credits + 5000 });
      this.setStatus(`Added 5000 credits (new balance: ${wallet.credits + 5000}cr).`);
      this.redraw();
    });
    y += 22;
    return y;
  }

  // TradeMapScene.ts's Travel section only ever acts on
  // getShipRoster()[0] -- there is no ship picker anywhere in the game's
  // UI (Shipyard's "Your ships:" list is read-only; nothing else touches
  // ship order). B5 (ship tier speed payoff) and B8 (combat by ship tier)
  // both require testing the SAME route with two different owned ships,
  // which is otherwise unreachable through play alone once more than one
  // ship is owned -- found auditing debug tooling against those two
  // scenarios specifically. Reordering the roster (setShipRoster()) is
  // the same real setter every other action in this file already uses;
  // no new ship-selection concept is introduced into the simulation
  // layer, only which array slot TradeMapScene happens to read.
  private renderActiveShipSection(startY: number): number {
    let y = startY;
    const roster = getShipRoster();
    this.scroll!.addText(16, y, "Active TradeMap ship (roster[0] -- TradeMapScene always uses this one):", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffffff",
    });
    y += 20;

    if (roster.length === 0) {
      this.scroll!.addText(16, y, "(no ships owned yet)", { fontFamily: "monospace", fontSize: "13px", color: "#888888" });
      y += 22;
      return y;
    }

    for (const ship of roster) {
      const isActive = roster[0]!.id === ship.id;
      const label = isActive ? `[ACTIVE] ${ship.name} (${ship.tier})` : `${ship.name} (${ship.tier})`;
      this.scroll!.addText(16, y, label, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: isActive ? "#ffd700" : "#cccccc",
      });

      if (!isActive) {
        const btn = this.scroll!.addText(320, y, "[ Make Active ]", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#4caf50",
        });
        btn.setInteractive({ useHandCursor: true });
        btn.on("pointerdown", () => {
          const current = getShipRoster();
          const reordered = [ship, ...current.filter((candidate) => candidate.id !== ship.id)];
          setShipRoster(reordered);
          this.setStatus(`${ship.name} is now the active TradeMap ship.`);
          this.redraw();
        });
      }
      y += ROW_HEIGHT;
    }
    y += 4;
    return y;
  }

  // "Let a debug session manually trigger a combat encounter (or any
  // encounter type) on demand" -- sets a one-shot flag TradeMapScene reads
  // on its next resolveArrival() call (debugState.ts). Does not itself
  // create any CombatEncounter/EncounterResult -- that only ever happens
  // through the real resolveArrival()->resolveEncounters() path, same as a
  // natural roll.
  private renderForceEncounterSection(startY: number): number {
    let y = startY;
    this.scroll!.addText(16, y, "Force next voyage arrival to include an encounter:", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffffff",
    });
    y += 20;

    let x = 16;
    for (const { type, label } of FORCE_ENCOUNTER_TYPES) {
      const btn = this.scroll!.addText(x, y, `[ ${label} ]`, {
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
    this.scroll!.addText(16, y, title, { fontFamily: "monospace", fontSize: "16px", color: "#ffd700" });
    y += 22;

    for (const tuningRow of rows) {
      this.scroll!.addText(24, y, `${tuningRow.label}:`, { fontFamily: "monospace", fontSize: "13px", color: "#cccccc" });
      const valueText = this.scroll!.addText(400, y, this.formatValue(tuningRow), {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffffff",
      });

      const minusBtn = this.scroll!.addText(470, y, "[-]", { fontFamily: "monospace", fontSize: "13px", color: "#ff6666" });
      minusBtn.setInteractive({ useHandCursor: true });
      minusBtn.on("pointerdown", () => {
        tuningRow.set(tuningRow.get() - tuningRow.step);
        valueText.setText(this.formatValue(tuningRow));
      });

      const plusBtn = this.scroll!.addText(500, y, "[+]", { fontFamily: "monospace", fontSize: "13px", color: "#4caf50" });
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
