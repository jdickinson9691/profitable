import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { content } from "../gameState.ts";
import { galaxy, startingPlanet, getDiscoveredPlanets, markPlanetDiscovered } from "../galaxyState.ts";
import { getMarketStates, getStartingPlanetPreference } from "../tradingState.ts";
import { getShipRoster, replaceShip, getVoyages, addVoyage, removeVoyage } from "../shipsState.ts";
import { calculateTravelTime } from "../../ships/calculateTravelTime.ts";
import { initiateVoyage } from "../../ships/initiateVoyage.ts";
import { resolveArrival } from "../../ships/resolveArrival.ts";
import { getSeasonalEffect, getSeasonalPriceMultiplier } from "../../trading/season.ts";
import { getActiveEmergency, getEmergencyPriceMultiplier } from "../../trading/emergency.ts";
import type { Planet } from "../../data/types/planet.ts";
import type { Ship } from "../../data/types/ship.ts";
import type { Voyage } from "../../data/types/voyage.ts";

// Agent 13 (Trading Presentation): the trade map screen (Phase 3 GDD §2.9).
// Read-only display -- it renders what baseline drift/seasons/emergencies
// have already produced in PlanetMarketState, never computes pricing
// itself. "Sells cheap"/"buys at a premium" is judged live from
// currentPrice vs. basePrice (the actual current market state, which
// MarketScene's trades move), not from Agent 14's static seed data --
// that seed is shown separately, labeled as the planet's *typical*
// leaning, per its own contract note that it's a day-one seed only.
const STEADY_BAND = 0.05;
const MS_PER_HOUR = 60 * 60 * 1000;

// Bug fix (Galactic Map Agent 25/26 verification, item 3 of
// profitable-map-gdd.md Section 7): this screen's content -- planets,
// their market lines, season/emergency flavor, and the travel section --
// already overflowed the 500px-tall canvas at the smallest real session
// state (live-measured), with no way to reach what was cut off. Everything
// between the fixed nav bar and the fixed status line now renders inside a
// scrollable, mask-clipped container instead of directly on the scene, and
// mouse-wheel input moves it within [0, maxScrollY].
const VIEWPORT_TOP = 64;
const VIEWPORT_BOTTOM = 455;

function classify(currentPrice: number, basePrice: number): "sells cheap" | "buys at a premium" | "steady" {
  if (currentPrice < basePrice * (1 - STEADY_BAND)) return "sells cheap";
  if (currentPrice > basePrice * (1 + STEADY_BAND)) return "buys at a premium";
  return "steady";
}

// Phase 5 (Agent 22): extends this SAME map screen with a travel layer,
// per the GDD's own "same map, extended, not a second screen" requirement
// -- never a new TravelScene. No encounter mechanic is displayed or
// implied anywhere below (out of scope, deferred per
// docs/profitable-design-questions.md's "Travel" section).
export class TradeMapScene extends Phaser.Scene {
  private statusText?: Phaser.GameObjects.Text;
  // Same pendingMessage/setStatus() bug-fix pattern already applied to
  // MarketScene/GlobalMarketScene/CrewScene.
  private pendingMessage = "";

  private contentContainer?: Phaser.GameObjects.Container;
  private maskShape?: Phaser.GameObjects.Graphics;
  private scrollY = 0;
  private maxScrollY = 0;

  constructor() {
    super(SCENE_KEYS.tradeMap);
  }

  create(): void {
    this.redraw();
    // Registered once -- children.removeAll() in redraw() clears the
    // display list, not scene-level input listeners, so this keeps working
    // across every subsequent redraw() without re-registering.
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

  // Routes through the scrollable container -- every content line in this
  // scene (title, planets, travel section) uses this instead of
  // `this.add.text` directly. Nav and the fixed status/scroll-hint lines
  // are the only things added straight to the scene, since they must stay
  // put regardless of scroll position.
  private addText(x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    const object = this.add.text(x, y, text, style);
    this.contentContainer?.add(object);
    return object;
  }

  // A GeometryMask only clips rendering, not input hit-testing -- an
  // interactive button (e.g. "> Initiate Voyage") scrolled above
  // VIEWPORT_TOP or below VIEWPORT_BOTTOM is invisible but, without this,
  // would still be clickable at its now-wrong on-screen position (which
  // could land it on top of the fixed nav bar). Toggles each interactive
  // child's own `input.enabled` based on whether it's actually inside the
  // visible viewport right now -- called after every scroll change, not
  // just on redraw().
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
    renderNav(this, SCENE_KEYS.tradeMap);

    this.contentContainer = this.add.container(0, -this.scrollY);
    this.maskShape = this.make.graphics();
    this.maskShape.fillRect(0, VIEWPORT_TOP, this.cameras.main.width, VIEWPORT_BOTTOM - VIEWPORT_TOP);
    this.contentContainer.setMask(this.maskShape.createGeometryMask());

    this.addText(16, VIEWPORT_TOP, "Trade Map", { fontFamily: "monospace", fontSize: "22px", color: "#ffffff" });

    const discoveredPlanets = getDiscoveredPlanets();

    let y = VIEWPORT_TOP + 36;
    for (const planet of discoveredPlanets) {
      y = this.renderPlanet(planet, y);
      y += 16;
    }

    y = this.renderTravel(discoveredPlanets, y);

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
      fontSize: "14px",
      color: "#cccccc",
    });
  }

  private renderPlanet(planet: Planet, startY: number): number {
    let y = startY;
    this.addText(16, y, `${planet.name} (${planet.planetType ?? "?"}, ${planet.tier ?? "?"} tier)`, {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffd700",
    });
    y += 24;

    const states = getMarketStates().filter((state) => state.planetId === planet.id);
    if (states.length === 0) {
      this.addText(16, y, "(no market activity tracked)", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#888888",
      });
      return y + 22;
    }

    // The trade map's other two data layers (Phase 3 GDD §2.9), computed
    // live -- never persisted, so they can never go stale (map GDD §2.2).
    // Both factor into each item's effective price for classification
    // only; the real, stored currentPrice (what baseline drift/trades
    // actually move) is untouched.
    const now = Date.now();
    const categories = [
      ...new Set(
        states
          .map((state) => content.resources.find((r) => r.id === state.itemId)?.category)
          .filter((category): category is string => category !== undefined),
      ),
    ];
    const seasonalEffect = getSeasonalEffect(planet.id, now, categories);
    const emergency = getActiveEmergency(planet.id, now, categories);

    if (seasonalEffect) {
      const cheapResource = content.resources.find((r) => r.category === seasonalEffect.cheapCategory);
      const premiumResource = content.resources.find((r) => r.category === seasonalEffect.premiumCategory);
      this.addText(
        32,
        y,
        `Season: ${seasonalEffect.season} (${cheapResource?.name ?? seasonalEffect.cheapCategory} cheaper, ${premiumResource?.name ?? seasonalEffect.premiumCategory} pricier)`,
        { fontFamily: "monospace", fontSize: "12px", color: "#888888" },
      );
      y += 18;
    }
    if (emergency) {
      const emergencyResource = content.resources.find((r) => r.category === emergency.category);
      const hoursLeft = ((emergency.endsAt - now) / (60 * 60 * 1000)).toFixed(1);
      this.addText(
        32,
        y,
        `⚠ Emergency: ${emergencyResource?.name ?? emergency.category} prices spiking (ends in ${hoursLeft}h)`,
        { fontFamily: "monospace", fontSize: "12px", color: "#ff8844" },
      );
      y += 18;
    }

    for (const state of states) {
      const resource = content.resources.find((r) => r.id === state.itemId);
      const seasonMultiplier = getSeasonalPriceMultiplier(resource?.category ?? "", seasonalEffect);
      const emergencyMultiplier = getEmergencyPriceMultiplier(resource?.category ?? "", emergency);
      const effectivePrice = state.currentPrice * seasonMultiplier * emergencyMultiplier;
      const status = classify(effectivePrice, state.basePrice);
      const line = `${resource?.name ?? state.itemId}: ${status} (now ${state.currentPrice.toFixed(2)}cr, base ${state.basePrice}cr)`;
      this.addText(32, y, line, { fontFamily: "monospace", fontSize: "14px", color: "#cccccc" });
      y += 20;
    }

    if (planet.id === startingPlanet.id) {
      const preference = getStartingPlanetPreference();
      if (preference) {
        const sells = preference.sellsCheap.map((id) => content.resources.find((r) => r.id === id)?.name ?? id);
        const buys = preference.buysAtPremium.map((id) => content.resources.find((r) => r.id === id)?.name ?? id);
        this.addText(32, y, `Typically sells cheap: ${sells.join(", ") || "(none)"}`, {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#666666",
        });
        y += 18;
        this.addText(32, y, `Typically buys at a premium: ${buys.join(", ") || "(none)"}`, {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#666666",
        });
        y += 18;
      }
    }

    return y;
  }

  private renderTravel(discoveredPlanets: Planet[], startY: number): number {
    let y = startY;
    this.addText(16, y, "Travel:", { fontFamily: "monospace", fontSize: "18px", color: "#ffffff" });
    y += 24;

    const ship = getShipRoster()[0];
    if (!ship) {
      this.addText(16, y, "(no ship owned yet -- purchase one at the Shipyard)", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#888888",
      });
      return y + 22;
    }

    const originPlanet = galaxy.planets.find((planet) => planet.id === ship.currentPlanetId);
    this.addText(16, y, `${ship.name} (${ship.tier} tier) — currently at ${originPlanet?.name ?? ship.currentPlanetId}`, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cccccc",
    });
    y += 22;

    const shipVoyages = getVoyages().filter((voyage) => voyage.shipId === ship.id);
    for (const voyage of shipVoyages) {
      y = this.renderVoyage(ship, voyage, y);
    }

    // Any voyage record still present means the ship hasn't been landed via
    // resolveArrival() yet -- deliberately not narrowed to
    // `arrivesAt > Date.now()`. A voyage whose arrival time has already
    // passed but hasn't been resolved must still block a second voyage:
    // the ship's currentPlanetId only updates on resolveArrival(), so
    // starting a new voyage before that would depart from a planet the
    // ship hasn't actually reached yet.
    const hasUnresolvedVoyage = shipVoyages.length > 0;
    if (!hasUnresolvedVoyage && originPlanet) {
      for (const destination of discoveredPlanets.filter((planet) => planet.id !== originPlanet.id)) {
        y = this.renderDestination(ship, originPlanet, destination, y);
      }
    }

    return y;
  }

  private renderVoyage(ship: Ship, voyage: Voyage, startY: number): number {
    let y = startY;
    const destination = galaxy.planets.find((planet) => planet.id === voyage.destinationPlanetId);
    const remainingMs = voyage.arrivesAt - Date.now();

    if (remainingMs > 0) {
      const label = `En route to ${destination?.name ?? voyage.destinationPlanetId} — arrives in ${(remainingMs / MS_PER_HOUR).toFixed(2)}h`;
      this.addText(32, y, label, { fontFamily: "monospace", fontSize: "13px", color: "#cccccc" });
      y += 20;
      return y;
    }

    const label = `Arrived at ${destination?.name ?? voyage.destinationPlanetId} — ready to resolve`;
    this.addText(32, y, label, { fontFamily: "monospace", fontSize: "13px", color: "#cccccc" });
    const resolveBtn = this.addText(500, y, "> Resolve Arrival", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#4caf50",
    });
    resolveBtn.setInteractive({ useHandCursor: true });
    resolveBtn.on("pointerdown", () => this.onResolveArrival(ship, voyage));
    y += 20;
    return y;
  }

  private renderDestination(ship: Ship, originPlanet: Planet, destination: Planet, startY: number): number {
    let y = startY;
    const travelTimeMs = calculateTravelTime(originPlanet, destination, ship);
    const label = `${destination.name}: ${(travelTimeMs / MS_PER_HOUR).toFixed(2)}h`;
    this.addText(32, y, label, { fontFamily: "monospace", fontSize: "13px", color: "#cccccc" });

    const goBtn = this.addText(300, y, "> Initiate Voyage", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#2196f3",
    });
    goBtn.setInteractive({ useHandCursor: true });
    goBtn.on("pointerdown", () => this.onInitiateVoyage(ship, originPlanet, destination));
    y += 20;
    return y;
  }

  private onInitiateVoyage(ship: Ship, originPlanet: Planet, destinationPlanet: Planet): void {
    // Empty cargo -- a real cargo-carrying voyage (the Phase 3 remote
    // tier 6-7 sale connection) is Agent 24's own required integration
    // check, exercised directly against initiateVoyage()/resolveArrival(),
    // not through a cargo-selection UI this contract never asked for.
    const voyage = initiateVoyage(ship, originPlanet, destinationPlanet, [], Date.now(), `voyage-${ship.id}-${Date.now()}`);
    addVoyage(voyage);
    this.setStatus(`${ship.name} departed for ${destinationPlanet.name}.`);
    this.redraw();
  }

  private onResolveArrival(ship: Ship, voyage: Voyage): void {
    const result = resolveArrival(voyage, ship, Date.now());
    if (!result.resolved) {
      this.setStatus(`Not yet arrived: ${result.reason}`);
      return;
    }
    replaceShip(result.updatedShip);
    removeVoyage(voyage.id);
    // The bug fix this comment marks: physical visitation (a resolved
    // Voyage) now actually extends discovery, not just the two bootstrap
    // planets -- see galaxyState.ts's markPlanetDiscovered() for the full
    // rationale.
    markPlanetDiscovered(result.destinationPlanetId);
    this.setStatus(`${ship.name} arrived at its destination.`);
    this.redraw();
  }
}
