import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { ScrollableContent, VIEWPORT_TOP, STATUS_TEXT_Y } from "./scrollableContent.ts";
import { content } from "../gameState.ts";
import { galaxy, startingPlanet, getDiscoveredPlanets, markPlanetDiscovered } from "../galaxyState.ts";
import { getMarketStates, getStartingPlanetPreference } from "../tradingState.ts";
import {
  getShipRoster,
  replaceShip,
  getVoyages,
  addVoyage,
  removeVoyage,
  getOwnedScanners,
  getPendingCombats,
  addPendingCombat,
  removePendingCombat,
} from "../shipsState.ts";
import { getCrewRoster, replaceCrewMember } from "../crewState.ts";
import { calculateTravelTime } from "../../ships/calculateTravelTime.ts";
import { initiateVoyage } from "../../ships/initiateVoyage.ts";
import { resolveArrival } from "../../ships/resolveArrival.ts";
import { performScan } from "../../ships/performScan.ts";
import { resolveCombatChoice } from "../../ships/resolveCombatChoice.ts";
import { getSeasonalEffect, getSeasonalPriceMultiplier } from "../../trading/season.ts";
import { getActiveEmergency, getEmergencyPriceMultiplier } from "../../trading/emergency.ts";
import { describeEncounter, describePendingCombat, describeCombatResolution } from "../display.ts";
import { consumeForcedEncounterType } from "../debugState.ts";
import { buildForcedEncounterRandom } from "../debugForcedRandom.ts";
import { renderOnboardingStep } from "./onboardingOverlay.ts";
import type { Planet } from "../../data/types/planet.ts";
import type { Ship } from "../../data/types/ship.ts";
import type { Voyage } from "../../data/types/voyage.ts";
import type { PendingCombat } from "../shipsState.ts";

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
// ScrollableContent viewport instead of directly on the scene, and
// mouse-wheel input moves it within [0, maxScrollY].
//
// Ported from this scene's original GameObject.setMask(GeometryMask)
// implementation (see scrollableContent.ts's own header comment for the
// full story): that mask silently no-ops under Phaser 4's WebGL renderer,
// so this scene's clipping was never actually active under normal play --
// only updateScrollInteractivity()'s separate, mask-independent input
// gating was ever real. Now uses the same camera-viewport approach as
// MarketScene/GlobalMarketScene/CrewScene/ShipyardScene/ShipAssemblyScene.

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
  private scroll?: ScrollableContent;

  constructor() {
    super(SCENE_KEYS.tradeMap);
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
    renderNav(this, SCENE_KEYS.tradeMap);

    this.scroll ??= new ScrollableContent(this);
    this.scroll.attachWheelInput();
    this.scroll.begin();

    this.scroll.addText(16, VIEWPORT_TOP, "Trade Map", { fontFamily: "monospace", fontSize: "22px", color: "#ffffff" });

    const discoveredPlanets = getDiscoveredPlanets();

    let y = VIEWPORT_TOP + 36;
    for (const planet of discoveredPlanets) {
      y = this.renderPlanet(planet, y);
      y += 16;
    }

    y = this.renderTravel(discoveredPlanets, y);

    this.statusText = this.add.text(16, STATUS_TEXT_Y, this.pendingMessage, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cccccc",
    });

    renderOnboardingStep(
      this,
      "TradeMap",
      "Explore -- most of the galaxy is still undiscovered. Scroll down to Travel and initiate a voyage to a nearby planet.",
      () => this.redraw(),
    );

    // Must be the true last step -- see finish()'s own comment for why
    // ordering matters here.
    this.scroll.finish(y);
  }

  private renderPlanet(planet: Planet, startY: number): number {
    let y = startY;
    this.scroll!.addText(16, y, `${planet.name} (${planet.planetType ?? "?"}, ${planet.tier ?? "?"} tier)`, {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffd700",
    });
    y += 24;

    const states = getMarketStates().filter((state) => state.planetId === planet.id);
    if (states.length === 0) {
      this.scroll!.addText(16, y, "(no market activity tracked)", {
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
      this.scroll!.addText(
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
      this.scroll!.addText(
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
      this.scroll!.addText(32, y, line, { fontFamily: "monospace", fontSize: "14px", color: "#cccccc" });
      y += 20;
    }

    if (planet.id === startingPlanet.id) {
      const preference = getStartingPlanetPreference();
      if (preference) {
        const sells = preference.sellsCheap.map((id) => content.resources.find((r) => r.id === id)?.name ?? id);
        const buys = preference.buysAtPremium.map((id) => content.resources.find((r) => r.id === id)?.name ?? id);
        this.scroll!.addText(32, y, `Typically sells cheap: ${sells.join(", ") || "(none)"}`, {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#666666",
        });
        y += 18;
        this.scroll!.addText(32, y, `Typically buys at a premium: ${buys.join(", ") || "(none)"}`, {
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
    this.scroll!.addText(16, y, "Travel:", { fontFamily: "monospace", fontSize: "18px", color: "#ffffff" });
    y += 24;

    const ship = getShipRoster()[0];
    if (!ship) {
      this.scroll!.addText(16, y, "(no ship owned yet -- purchase one at the Shipyard)", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#888888",
      });
      return y + 22;
    }

    // Prefer the already-discovered, discovered:true-normalized copy (see
    // galaxyState.ts's getDiscoveredPlanets() note) over the raw
    // galaxy.planets entry -- performScan() (Scanner/Probe amendment) needs
    // a real, trustworthy Planet.discovered on whatever planet the ship is
    // currently docked at. Falls back to the raw entry only if the ship
    // somehow sits at a planet not in discoveredPlanets, which shouldn't
    // happen (a ship only ever arrives via a voyage to an already-discovered
    // destination) but keeps this lookup total either way.
    const originPlanet =
      discoveredPlanets.find((planet) => planet.id === ship.currentPlanetId) ??
      galaxy.planets.find((planet) => planet.id === ship.currentPlanetId);
    this.scroll!.addText(16, y, `${ship.name} (${ship.tier} tier) — currently at ${originPlanet?.name ?? ship.currentPlanetId}`, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cccccc",
    });
    y += 22;

    // Combat amendment: shown first, before the voyage list -- the one
    // genuinely interactive prompt in this entire encounter system, so it
    // shouldn't be buried below routine travel info.
    const shipPendingCombats = getPendingCombats().filter((pending) => pending.voyage.shipId === ship.id);
    for (const pending of shipPendingCombats) {
      y = this.renderPendingCombat(ship, pending, y);
    }

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
    // ship hasn't actually reached yet. The same "not en route" condition
    // gates the Scan action -- a ship mid-voyage isn't docked anywhere.
    //
    // Combat amendment: a pending combat blocks new voyages/scans the same
    // way -- resolving it (lose or flee) can add a retreat voyage via
    // addVoyage() directly, bypassing this same check; allowing a second,
    // unrelated voyage to start first would let two voyages exist for one
    // ship at once, an invariant nothing else in this file expects.
    const hasUnresolvedVoyage = shipVoyages.length > 0;
    const hasPendingCombat = shipPendingCombats.length > 0;
    if (!hasUnresolvedVoyage && !hasPendingCombat && originPlanet) {
      y = this.renderScan(ship, originPlanet, y);
      for (const destination of discoveredPlanets.filter((planet) => planet.id !== originPlanet.id)) {
        y = this.renderDestination(ship, originPlanet, destination, y);
      }
    }

    return y;
  }

  // Scanner/Probe amendment (§2.3): a manual, docked-only action -- shown
  // only from within renderTravel()'s own "ship is docked, not en route"
  // branch above, never triggered automatically. Never displays or implies
  // any connection to Travel Encounters or map staleness (neither exists,
  // per the GDD's own guardrails) -- this section only ever talks about
  // scanning.
  private renderScan(ship: Ship, dockedPlanet: Planet, startY: number): number {
    let y = startY;
    const owned = getOwnedScanners();

    if (owned.length === 0) {
      this.scroll!.addText(16, y, "(no scanner owned -- purchase one at the Shipyard to scan for nearby planets)", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#888888",
      });
      return y + 20;
    }

    // Which tier is actually "in use" (highest owned, per Agent 20's own
    // rule) is shown at the Shipyard's own scanner roster display -- not
    // recomputed here, so this line only lists ownership.
    const label = `Scanners owned: ${owned.map((scanner) => scanner.tier).join(", ")}`;
    this.scroll!.addText(16, y, label, { fontFamily: "monospace", fontSize: "13px", color: "#cccccc" });

    const scanBtn = this.scroll!.addText(500, y, "> Scan", { fontFamily: "monospace", fontSize: "13px", color: "#4caf50" });
    scanBtn.setInteractive({ useHandCursor: true });
    scanBtn.on("pointerdown", () => this.onScan(ship, dockedPlanet));
    y += 20;
    return y;
  }

  private onScan(ship: Ship, dockedPlanet: Planet): void {
    // allPlanets must reflect real discovery state, not galaxy.planets'
    // permanently-false baked-in field (see galaxyState.ts's own note) --
    // otherwise performScan() would report already-discovered planets as
    // "newly discovered." Reuses getDiscoveredPlanets()'s own
    // already-normalized objects rather than re-stamping `discovered: true`
    // a second time here.
    const discovered = getDiscoveredPlanets();
    const discoveredIds = new Set(discovered.map((planet) => planet.id));
    const undiscovered = galaxy.planets.filter((planet) => !discoveredIds.has(planet.id));
    const allPlanets = [...discovered, ...undiscovered];

    const result = performScan(ship, dockedPlanet, getOwnedScanners(), allPlanets);
    if (!result.scanned) {
      this.setStatus(`Scan failed: ${result.reason}`);
      return;
    }

    // markPlanetDiscovered() is the same persisted side-table
    // resolveArrival()'s own discovery-by-travel path already writes
    // through -- performScan() itself never touches it (Core stays out of
    // presentation-layer persistence, same boundary as cargo/Listing).
    for (const planet of result.newlyDiscovered) {
      markPlanetDiscovered(planet.id);
    }

    this.setStatus(
      result.newlyDiscovered.length > 0
        ? `Scan complete — newly discovered: ${result.newlyDiscovered.map((planet) => planet.name).join(", ")}`
        : "Scan complete — no new planets found within range.",
    );
    this.redraw();
  }

  // Combat GDD §2.3 amendment: the one deliberate exception to "every
  // encounter resolves automatically." Presents exactly Attack/Flee, no
  // other choice, no preview of the outcome (describePendingCombat() only
  // ever shows what initiateCombat() actually rolled at detection --
  // opponentThreatTier -- never a hint at win/lose odds).
  private renderPendingCombat(ship: Ship, pending: PendingCombat, startY: number): number {
    let y = startY;
    this.scroll!.addText(32, y, describePendingCombat(pending.encounter), {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#ff5555",
    });
    y += 20;

    const attackBtn = this.scroll!.addText(360, y, "> Attack", { fontFamily: "monospace", fontSize: "13px", color: "#ff8844" });
    attackBtn.setInteractive({ useHandCursor: true });
    attackBtn.on("pointerdown", () => this.onCombatChoice(ship, pending, "attack"));

    const fleeBtn = this.scroll!.addText(460, y, "> Flee", { fontFamily: "monospace", fontSize: "13px", color: "#4caf50" });
    fleeBtn.setInteractive({ useHandCursor: true });
    fleeBtn.on("pointerdown", () => this.onCombatChoice(ship, pending, "flee"));
    y += 20;
    return y;
  }

  private onCombatChoice(ship: Ship, pending: PendingCombat, choice: "attack" | "flee"): void {
    const { voyage, encounter } = pending;
    // Necessary completion, same resolution as every other Agent 20/22
    // boundary in this file: resolveCombatChoice() needs the real Planet
    // objects, not bare ids. `originPlanet` is the *original* voyage's
    // origin (the retreat destination, per Combat GDD §2.5's "last safe
    // planet"); `currentPlanet` is where the ship sits right now --
    // already the original voyage's destination, since resolveArrival()
    // completed that delivery before this combat ever became visible here.
    const originPlanet = galaxy.planets.find((planet) => planet.id === voyage.originPlanetId);
    const currentPlanet = galaxy.planets.find((planet) => planet.id === ship.currentPlanetId);
    if (!originPlanet || !currentPlanet) {
      this.setStatus("Cannot resolve combat: origin or current planet not found.");
      return;
    }

    const result = resolveCombatChoice(
      encounter,
      choice,
      voyage,
      ship,
      originPlanet,
      currentPlanet,
      getCrewRoster(),
      Date.now(),
      `retreat-${voyage.id}-${Date.now()}`,
    );

    removePendingCombat(encounter.id);
    replaceShip(result.updatedShip);
    if (result.updatedCrewMember) {
      replaceCrewMember(result.updatedCrewMember);
    }
    if (result.retreatVoyage) {
      // Combat GDD §2.6/Agent 22's own contract: "the resulting retreat
      // voyage should be visible in the same voyage-tracking UI as any
      // normal voyage" -- addVoyage() is the exact same call
      // onInitiateVoyage() already uses, no special-cased rendering path.
      addVoyage(result.retreatVoyage);
    }

    this.setStatus(describeCombatResolution(result));
    this.redraw();
  }

  private renderVoyage(ship: Ship, voyage: Voyage, startY: number): number {
    let y = startY;
    const destination = galaxy.planets.find((planet) => planet.id === voyage.destinationPlanetId);
    const remainingMs = voyage.arrivesAt - Date.now();

    if (remainingMs > 0) {
      const label = `En route to ${destination?.name ?? voyage.destinationPlanetId} — arrives in ${(remainingMs / MS_PER_HOUR).toFixed(2)}h`;
      this.scroll!.addText(32, y, label, { fontFamily: "monospace", fontSize: "13px", color: "#cccccc" });
      y += 20;
      return y;
    }

    const label = `Arrived at ${destination?.name ?? voyage.destinationPlanetId} — ready to resolve`;
    this.scroll!.addText(32, y, label, { fontFamily: "monospace", fontSize: "13px", color: "#cccccc" });
    const resolveBtn = this.scroll!.addText(500, y, "> Resolve Arrival", {
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
    this.scroll!.addText(32, y, label, { fontFamily: "monospace", fontSize: "13px", color: "#cccccc" });

    const goBtn = this.scroll!.addText(300, y, "> Initiate Voyage", {
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
    // Travel Encounters (Non-Combat) amendment: passing destinationPlanet/
    // resources is what actually opts this call into encounter resolution
    // -- resolveArrival()'s own contract keeps both optional so every
    // pre-amendment call site (none left in this file now, but the
    // function signature itself) stays unaffected when they're omitted.
    const destinationPlanet = galaxy.planets.find((planet) => planet.id === voyage.destinationPlanetId);

    // Alpha Section 4 debug panel "force encounter" shortcut: a one-shot
    // request (debugState.ts) consumed here, on the very next resolution,
    // then cleared -- never affects a second arrival by accident. Passed
    // into resolveArrival()'s existing, already-optional `random`
    // parameter; when no request is pending this is `undefined`, which
    // resolveArrival() itself defaults to real Math.random(), identical to
    // every non-debug call.
    const forcedType = consumeForcedEncounterType();
    const random = forcedType ? buildForcedEncounterRandom(forcedType) : undefined;

    const result = resolveArrival(voyage, ship, Date.now(), destinationPlanet, content.resources, random);
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

    // Encounter summary -- sourced entirely from `result.encounters`, per
    // this amendment's own contract ("no re-computation"). No section at
    // all when the voyage had none, not a padded "nothing happened" line.
    const lines = [`${ship.name} arrived at its destination.`];
    for (const encounter of result.encounters) {
      const resourceName =
        encounter.type === "discovery" ? content.resources.find((r) => r.id === encounter.outcome.resourceId)?.name : undefined;
      lines.push(describeEncounter(encounter, resourceName));
    }

    // Combat amendment: a pending combat never resolves here -- it's
    // stored (paired with this now-about-to-be-discarded `voyage` snapshot,
    // per shipsState.ts's own PendingCombat note) for the player to act on
    // via the Attack/Flee prompt renderPendingCombat() adds to the travel
    // section, not resolved or previewed as a side effect of arrival.
    for (const combatEncounter of result.pendingCombats) {
      addPendingCombat({ encounter: combatEncounter, voyage });
      lines.push(describePendingCombat(combatEncounter));
    }

    this.setStatus(lines.join("\n"));
    this.redraw();
  }
}
