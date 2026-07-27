import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { content } from "../gameState.ts";
import { galaxy, startingPlanet } from "../galaxyState.ts";
import { getMarketStates, getStartingPlanetPreference } from "../tradingState.ts";
import type { Planet } from "../../data/types/planet.ts";

// Agent 13 (Trading Presentation): the trade map screen (Phase 3 GDD §2.9).
// Read-only display -- it renders what baseline drift/seasons/emergencies
// have already produced in PlanetMarketState, never computes pricing
// itself. "Sells cheap"/"buys at a premium" is judged live from
// currentPrice vs. basePrice (the actual current market state, which
// MarketScene's trades move), not from Agent 14's static seed data --
// that seed is shown separately, labeled as the planet's *typical*
// leaning, per its own contract note that it's a day-one seed only.
const STEADY_BAND = 0.05;

function classify(currentPrice: number, basePrice: number): "sells cheap" | "buys at a premium" | "steady" {
  if (currentPrice < basePrice * (1 - STEADY_BAND)) return "sells cheap";
  if (currentPrice > basePrice * (1 + STEADY_BAND)) return "buys at a premium";
  return "steady";
}

export class TradeMapScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.tradeMap);
  }

  create(): void {
    renderNav(this, SCENE_KEYS.tradeMap);

    this.add.text(16, 64, "Trade Map", { fontFamily: "monospace", fontSize: "22px", color: "#ffffff" });

    const discoveredPlanets = galaxy.planets.filter(
      (planet) => planet.id === startingPlanet.id || planet.discovered,
    );

    let y = 100;
    for (const planet of discoveredPlanets) {
      y = this.renderPlanet(planet, y);
      y += 16;
    }
  }

  private renderPlanet(planet: Planet, startY: number): number {
    let y = startY;
    this.add.text(16, y, `${planet.name} (${planet.planetType ?? "?"}, ${planet.tier ?? "?"} tier)`, {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffd700",
    });
    y += 24;

    const states = getMarketStates().filter((state) => state.planetId === planet.id);
    if (states.length === 0) {
      this.add.text(16, y, "(no market activity tracked)", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#888888",
      });
      return y + 22;
    }

    for (const state of states) {
      const resource = content.resources.find((r) => r.id === state.itemId);
      const status = classify(state.currentPrice, state.basePrice);
      const line = `${resource?.name ?? state.itemId}: ${status} (now ${state.currentPrice.toFixed(2)}cr, base ${state.basePrice}cr)`;
      this.add.text(32, y, line, { fontFamily: "monospace", fontSize: "14px", color: "#cccccc" });
      y += 20;
    }

    if (planet.id === startingPlanet.id) {
      const preference = getStartingPlanetPreference();
      if (preference) {
        const sells = preference.sellsCheap.map((id) => content.resources.find((r) => r.id === id)?.name ?? id);
        const buys = preference.buysAtPremium.map((id) => content.resources.find((r) => r.id === id)?.name ?? id);
        this.add.text(32, y, `Typically sells cheap: ${sells.join(", ") || "(none)"}`, {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#666666",
        });
        y += 18;
        this.add.text(32, y, `Typically buys at a premium: ${buys.join(", ") || "(none)"}`, {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#666666",
        });
        y += 18;
      }
    }

    return y;
  }
}
