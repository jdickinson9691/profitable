import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { getCurrentPlanet } from "../currentPlanet.ts";
import { getWallet, setWallet, PLAYER_ID } from "../tradingState.ts";
import {
  getShipyardPool,
  setShipyardPool,
  getShipRoster,
  addShip,
  getScannerPool,
  setScannerPool,
  getOwnedScanners,
  addScanner,
} from "../shipsState.ts";
import { purchaseShip } from "../../ships/purchaseShip.ts";
import { purchaseScanner } from "../../ships/purchaseScanner.ts";
import { SHIP_PURCHASE_COST_BY_TIER, SCANNER_PURCHASE_COST_BY_TIER } from "../../data/constants/shipsAndTravelConfig.ts";
import { TIER_COLOR_BREAKPOINTS } from "../../data/constants/tierColor.ts";
import type { ShipCandidate } from "../../data/types/shipCandidate.ts";
import type { ScannerCandidate } from "../../data/types/scannerCandidate.ts";
import type { Scanner } from "../../data/types/scanner.ts";
import type { TierColor } from "../../data/types/tierColor.ts";
import type { Planet } from "../../data/types/planet.ts";

// Grey..Gold, read off the shared breakpoint table rather than a locally
// invented ordering -- a pure tier-*name* comparison for the "which owned
// scanner is in use" label, unrelated to and never touching the actual
// radius/distance math (that stays exclusively inside performScan()).
const TIER_ORDER: readonly TierColor[] = TIER_COLOR_BREAKPOINTS.map((breakpoint) => breakpoint.tier);

function highestOwnedScannerTier(owned: readonly Scanner[]): TierColor {
  return owned.reduce(
    (best, scanner) => (TIER_ORDER.indexOf(scanner.tier) > TIER_ORDER.indexOf(best) ? scanner.tier : best),
    owned[0]!.tier,
  );
}

// Agent 22 (Ships & Travel Presentation), Phase 5 GDD §2.2. Every number
// shown is sourced directly from Agent 20's actual function outputs --
// same discipline as CrewScene/MarketScene, this scene formats and
// dispatches, never recomputes purchase math itself.
export class ShipyardScene extends Phaser.Scene {
  private statusText?: Phaser.GameObjects.Text;
  // Same pendingMessage/setStatus() bug-fix pattern already applied to
  // MarketScene/GlobalMarketScene/CrewScene (see those files' own comment)
  // -- avoided here from the start rather than discovered later.
  private pendingMessage = "";

  constructor() {
    super(SCENE_KEYS.shipyard);
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
    renderNav(this, SCENE_KEYS.shipyard);

    // Planet-aware fix: reads wherever the player's ship currently is
    // (previously hardcoded to startingPlanet, so the shipyard/scanner
    // pools never reflected travel). Computed once per redraw().
    const planet = getCurrentPlanet();

    this.add.text(16, 64, `Shipyard — ${planet.name}`, {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#ffffff",
    });
    this.add.text(16, 90, `Credits: ${getWallet().credits}`, {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffd700",
    });

    let y = 120;
    y = this.renderPool(y, planet);
    y += 12;
    y = this.renderRoster(y, planet);
    y += 12;
    y = this.renderScannerPool(y, planet);
    y += 12;
    y = this.renderScannerRoster(y);

    this.statusText = this.add.text(16, 470, this.pendingMessage, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cccccc",
    });
  }

  private renderPool(startY: number, planet: Planet): number {
    let y = startY;
    this.add.text(16, y, "Ships for sale:", { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" });
    y += 24;

    const pool = getShipyardPool(planet.id);
    if (pool.availableShips.length === 0) {
      this.add.text(16, y, "(none)", { fontFamily: "monospace", fontSize: "14px", color: "#888888" });
      return y + 22;
    }

    for (const candidate of pool.availableShips) {
      const cost = SHIP_PURCHASE_COST_BY_TIER.find((entry) => entry.tier === candidate.tier)?.cost ?? 0;
      const label = `${candidate.name} — ${candidate.tier} tier — ${cost}cr`;
      this.add.text(16, y, label, { fontFamily: "monospace", fontSize: "14px", color: "#cccccc" });

      const buyBtn = this.add.text(500, y, "> Purchase", { fontFamily: "monospace", fontSize: "14px", color: "#4caf50" });
      buyBtn.setInteractive({ useHandCursor: true });
      buyBtn.on("pointerdown", () => this.onPurchase(candidate, planet));
      y += 22;
    }
    return y;
  }

  private renderRoster(startY: number, planet: Planet): number {
    let y = startY;
    this.add.text(16, y, "Your ships:", { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" });
    y += 24;

    const roster = getShipRoster();
    if (roster.length === 0) {
      this.add.text(16, y, "(no ships owned yet)", { fontFamily: "monospace", fontSize: "14px", color: "#888888" });
      return y + 22;
    }

    for (const ship of roster) {
      const atHome = ship.currentPlanetId === planet.id;
      const label = `${ship.name} — ${ship.tier} tier — at ${atHome ? planet.name : ship.currentPlanetId}`;
      this.add.text(16, y, label, { fontFamily: "monospace", fontSize: "14px", color: "#cccccc" });
      y += 20;
    }
    return y;
  }

  private onPurchase(candidate: ShipCandidate, planet: Planet): void {
    const result = purchaseShip(candidate, getShipyardPool(planet.id), getWallet(), PLAYER_ID);
    if (!result.purchased) {
      this.setStatus(`Purchase failed: ${result.reason}`);
      return;
    }
    setShipyardPool(planet.id, result.updatedPool);
    setWallet(result.updatedWallet);
    addShip(result.ship);
    this.setStatus(`Purchased ${result.ship.name} (${result.ship.tier} tier).`);
    this.redraw();
  }

  // Scanner/Probe amendment (§2.2): a standalone market pool shown
  // alongside the existing shipyard listings, per the contract's own "no
  // new screen -- integrate into the existing shipyard-adjacent market UI"
  // requirement. Same format as renderPool() above.
  private renderScannerPool(startY: number, planet: Planet): number {
    let y = startY;
    this.add.text(16, y, "Scanners for sale:", { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" });
    y += 24;

    const pool = getScannerPool(planet.id);
    if (pool.availableScanners.length === 0) {
      this.add.text(16, y, "(none)", { fontFamily: "monospace", fontSize: "14px", color: "#888888" });
      return y + 22;
    }

    for (const candidate of pool.availableScanners) {
      const cost = SCANNER_PURCHASE_COST_BY_TIER.find((entry) => entry.tier === candidate.tier)?.cost ?? 0;
      const label = `${candidate.tier} tier scanner — ${cost}cr`;
      this.add.text(16, y, label, { fontFamily: "monospace", fontSize: "14px", color: "#cccccc" });

      const buyBtn = this.add.text(500, y, "> Purchase", { fontFamily: "monospace", fontSize: "14px", color: "#4caf50" });
      buyBtn.setInteractive({ useHandCursor: true });
      buyBtn.on("pointerdown", () => this.onPurchaseScanner(candidate, planet));
      y += 22;
    }
    return y;
  }

  // "Owned-scanner display" (contract's own wording): shows every owned
  // scanner's tier and, when more than one is owned, which one is actually
  // used -- makes Agent 20's "highest-tier-only, never summed" rule
  // legible rather than a hidden backend detail. Never recomputes a scan
  // radius here -- only compares tiers by name (Grey < White < ... < Gold
  // via the shared breakpoint order), which performScan() itself does too;
  // the actual radius math stays exclusively inside performScan().
  private renderScannerRoster(startY: number): number {
    let y = startY;
    this.add.text(16, y, "Your scanners:", { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" });
    y += 24;

    const owned = getOwnedScanners();
    if (owned.length === 0) {
      this.add.text(16, y, "(no scanners owned yet)", { fontFamily: "monospace", fontSize: "14px", color: "#888888" });
      return y + 22;
    }

    const highestTier = highestOwnedScannerTier(owned);
    for (const scanner of owned) {
      const inUse = scanner.tier === highestTier ? " (in use for scanning)" : "";
      this.add.text(16, y, `${scanner.tier} tier scanner${inUse}`, { fontFamily: "monospace", fontSize: "14px", color: "#cccccc" });
      y += 20;
    }
    return y;
  }

  private onPurchaseScanner(candidate: ScannerCandidate, planet: Planet): void {
    const result = purchaseScanner(candidate, getScannerPool(planet.id), getWallet(), PLAYER_ID);
    if (!result.purchased) {
      this.setStatus(`Purchase failed: ${result.reason}`);
      return;
    }
    setScannerPool(planet.id, result.updatedPool);
    setWallet(result.updatedWallet);
    addScanner(result.scanner);
    this.setStatus(`Purchased a ${result.scanner.tier} tier scanner.`);
    this.redraw();
  }
}
