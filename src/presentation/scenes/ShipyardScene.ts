import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { startingPlanet } from "../galaxyState.ts";
import { getWallet, setWallet, PLAYER_ID } from "../tradingState.ts";
import { getShipyardPool, setShipyardPool, getShipRoster, addShip } from "../shipsState.ts";
import { purchaseShip } from "../../ships/purchaseShip.ts";
import { SHIP_PURCHASE_COST_BY_TIER } from "../../data/constants/shipsAndTravelConfig.ts";
import type { ShipCandidate } from "../../data/types/shipCandidate.ts";

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

    this.add.text(16, 64, `Shipyard — ${startingPlanet.name}`, {
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
    y = this.renderPool(y);
    y += 12;
    y = this.renderRoster(y);

    this.statusText = this.add.text(16, 470, this.pendingMessage, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cccccc",
    });
  }

  private renderPool(startY: number): number {
    let y = startY;
    this.add.text(16, y, "Ships for sale:", { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" });
    y += 24;

    const pool = getShipyardPool();
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
      buyBtn.on("pointerdown", () => this.onPurchase(candidate));
      y += 22;
    }
    return y;
  }

  private renderRoster(startY: number): number {
    let y = startY;
    this.add.text(16, y, "Your ships:", { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" });
    y += 24;

    const roster = getShipRoster();
    if (roster.length === 0) {
      this.add.text(16, y, "(no ships owned yet)", { fontFamily: "monospace", fontSize: "14px", color: "#888888" });
      return y + 22;
    }

    for (const ship of roster) {
      const atHome = ship.currentPlanetId === startingPlanet.id;
      const label = `${ship.name} — ${ship.tier} tier — at ${atHome ? startingPlanet.name : ship.currentPlanetId}`;
      this.add.text(16, y, label, { fontFamily: "monospace", fontSize: "14px", color: "#cccccc" });
      y += 20;
    }
    return y;
  }

  private onPurchase(candidate: ShipCandidate): void {
    const result = purchaseShip(candidate, getShipyardPool(), getWallet(), PLAYER_ID);
    if (!result.purchased) {
      this.setStatus(`Purchase failed: ${result.reason}`);
      return;
    }
    setShipyardPool(result.updatedPool);
    setWallet(result.updatedWallet);
    addShip(result.ship);
    this.setStatus(`Purchased ${result.ship.name} (${result.ship.tier} tier).`);
    this.redraw();
  }
}
