import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { ScrollableContent, STATUS_TEXT_Y } from "./scrollableContent.ts";
import { content, getInventory, setInventory } from "../gameState.ts";
import { getCurrentPlanet } from "../currentPlanet.ts";
import { removeBatchAt } from "../inventory.ts";
import {
  PLAYER_ID,
  getWallet,
  setWallet,
  getListings,
  addListing,
  replaceListing,
  getMarketState,
  replaceMarketState,
  getListingQualities,
  setListingQualities,
} from "../tradingState.ts";
import { createListing } from "../../trading/createListing.ts";
import { purchaseListing } from "../../trading/purchaseListing.ts";
import { sellToMarket } from "../../trading/sellToMarket.ts";
import { renderOnboardingStep } from "./onboardingOverlay.ts";
import type { PurchaseSucceeded } from "../../data/types/purchaseResult.ts";
import type { Listing } from "../../data/types/listing.ts";
import type { Planet } from "../../data/types/planet.ts";

// Agent 13 (Trading Presentation): the planet-local market screen. Every
// number shown is sourced directly from Agent 11's actual function
// outputs -- this scene formats and dispatches, never recomputes pricing/
// fee/drift math itself (Phase 3 GDD §4.2 Must-NOT-Do).
export class MarketScene extends Phaser.Scene {
  private statusText?: Phaser.GameObjects.Text;
  // Bug fix (found during Agent 19's Phase 4 integration playtest,
  // Agent 13's own scope): every action handler set statusText then
  // immediately called redraw(), which unconditionally recreates a blank
  // statusText at its own end -- wiping the message before it was ever
  // visible. Tracking the pending message separately survives the
  // children.removeAll()/recreate cycle in redraw().
  private pendingMessage = "";
  private scroll?: ScrollableContent;

  constructor() {
    super(SCENE_KEYS.market);
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
    renderNav(this, SCENE_KEYS.market);

    // Scrollable content (bug fix: "Sell from inventory" grows with the
    // player's own inventory, "Active listings" with every player's
    // listings at this planet -- both unbounded. A fixed-y status text
    // used to sit directly on top of whichever of these grew tall enough
    // to reach it; see scrollableContent.ts's own comment for the full
    // story. Routing everything but the nav bar and status text through
    // this scroll container fixes the collision at its root rather than
    // just nudging one coordinate.
    this.scroll ??= new ScrollableContent(this);
    this.scroll.attachWheelInput();
    this.scroll.begin();

    // Planet-aware fix: reads wherever the player's ship currently is
    // (previously hardcoded to startingPlanet, so buying/selling never
    // reflected travel). Computed once per redraw() and threaded through
    // to buy()/sell() below, rather than re-read from inside them, so a
    // single redraw() always acts on one consistent planet.
    const planet = getCurrentPlanet();

    this.scroll.addText(16, 64, `Market — ${planet.name}`, {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#ffffff",
    });
    this.scroll.addText(16, 90, `Credits: ${getWallet().credits}`, {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffd700",
    });

    let y = 120;
    this.scroll.addText(16, y, "Active listings:", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });
    y += 24;

    const planetListings = getListings().filter(
      (listing) =>
        listing.location !== "global" &&
        listing.location.planetId === planet.id &&
        listing.quantity > 0,
    );

    if (planetListings.length === 0) {
      this.scroll.addText(16, y, "(none)", { fontFamily: "monospace", fontSize: "14px", color: "#888888" });
      y += 24;
    }

    for (const listing of planetListings) {
      const resource = content.resources.find((r) => r.id === listing.itemId);
      const label = `${resource?.name ?? listing.itemId} x${listing.quantity} @ ${listing.pricePerUnit}cr (${listing.marketTier}) — seller: ${listing.createdByPlayerId}`;
      this.scroll.addText(16, y, label, { fontFamily: "monospace", fontSize: "14px", color: "#cccccc" });

      const buyOne = this.scroll.addText(560, y, "> Buy 1", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#4caf50",
      });
      buyOne.setInteractive({ useHandCursor: true });
      buyOne.on("pointerdown", () => this.buy(listing, 1, planet));

      if (listing.quantity > 1) {
        const buyAll = this.scroll.addText(650, y, "> Buy All", {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#4caf50",
        });
        buyAll.setInteractive({ useHandCursor: true });
        buyAll.on("pointerdown", () => this.buy(listing, listing.quantity, planet));
      }

      y += 22;
    }

    y += 12;
    this.scroll.addText(16, y, "Sell from inventory:", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });
    y += 24;

    const inventory = getInventory();
    if (inventory.length === 0) {
      this.scroll.addText(16, y, "(nothing to sell)", { fontFamily: "monospace", fontSize: "14px", color: "#888888" });
      y += 22;
    }

    inventory.forEach((batch, index) => {
      const resource = content.resources.find((r) => r.id === batch.resourceId);
      const marketState = getMarketState(planet.id, batch.resourceId);
      const suggestedPrice = marketState ? Math.round(marketState.currentPrice) : 10;
      const label = `${resource?.name ?? batch.resourceId} x${batch.quantity} @ ${suggestedPrice}cr/unit`;
      this.scroll!.addText(16, y, label, { fontFamily: "monospace", fontSize: "14px", color: "#cccccc" });

      const listButton = this.scroll!.addText(560, y, "> List", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#2196f3",
      });
      listButton.setInteractive({ useHandCursor: true });
      listButton.on("pointerdown", () => this.sell(index, suggestedPrice, planet));

      // Trading Counterparty (profitable-design-questions.md): an instant,
      // listing-free sell alongside the existing list-and-wait action --
      // purely additive, neither replaces the other.
      if (marketState) {
        const sellNowButton = this.scroll!.addText(650, y, "> Sell Now", {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#4caf50",
        });
        sellNowButton.setInteractive({ useHandCursor: true });
        sellNowButton.on("pointerdown", () => this.sellNow(index, marketState));
      }

      y += 22;
    });

    this.statusText = this.add.text(16, STATUS_TEXT_Y, this.pendingMessage, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cccccc",
    });

    renderOnboardingStep(
      this,
      "Market",
      "Sell what you've made -- list items from your inventory below, or buy what's for sale here.",
      () => this.redraw(),
    );

    // Must be the true last step -- see finish()'s own comment for why
    // ordering matters here.
    this.scroll.finish(y);
  }

  private buy(listing: Listing, quantity: number, planet: Planet): void {
    const marketState = getMarketState(planet.id, listing.itemId) ?? null;
    const result = purchaseListing(listing, quantity, PLAYER_ID, marketState);

    if (!result.success) {
      this.setStatus(`Purchase failed: ${result.reason}`);
      return;
    }

    const succeeded = result as PurchaseSucceeded;
    setWallet({ ...getWallet(), credits: getWallet().credits - succeeded.totalPaid });
    replaceListing(succeeded.updatedListing);
    if (succeeded.updatedMarketState) {
      replaceMarketState(succeeded.updatedMarketState);
    }

    const resource = content.resources.find((r) => r.id === listing.itemId);
    const realQualities = getListingQualities(listing.id) ?? {
      purity: null,
      density: null,
      potency: null,
      durability: null,
      rarity: null,
    };
    setInventory([
      ...getInventory(),
      { resourceId: listing.itemId, quantity: succeeded.quantityPurchased, qualities: realQualities },
    ]);

    this.setStatus(
      `Bought ${succeeded.quantityPurchased}x ${resource?.name ?? listing.itemId} for ${succeeded.totalPaid}cr (fee: ${succeeded.feeDeducted}cr)`,
    );
    this.redraw();
  }

  private sell(inventoryIndex: number, pricePerUnit: number, planet: Planet): void {
    const inventory = getInventory();
    const batch = inventory[inventoryIndex];
    if (!batch) return;

    const resource = content.resources.find((r) => r.id === batch.resourceId);
    if (!resource) return;

    const listing = createListing(
      { resource, quantity: batch.quantity, qualities: batch.qualities },
      batch.quantity,
      pricePerUnit,
      { planetId: planet.id },
      PLAYER_ID,
      `listing-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );

    addListing(listing);
    setListingQualities(listing.id, batch.qualities);
    setInventory(removeBatchAt(inventory, inventoryIndex));

    this.setStatus(`Listed ${batch.quantity}x ${resource.name} @ ${pricePerUnit}cr/unit`);
    this.redraw();
  }

  private sellNow(inventoryIndex: number, marketState: ReturnType<typeof getMarketState>): void {
    const inventory = getInventory();
    const batch = inventory[inventoryIndex];
    if (!batch || !marketState) return;

    const resource = content.resources.find((r) => r.id === batch.resourceId);
    if (!resource) return;

    const result = sellToMarket(
      { resource, quantity: batch.quantity, qualities: batch.qualities },
      batch.quantity,
      marketState,
      getWallet(),
      PLAYER_ID,
    );

    setWallet(result.updatedWallet);
    replaceMarketState(result.updatedMarketState);
    setInventory(removeBatchAt(inventory, inventoryIndex));

    this.setStatus(
      `Sold ${result.quantitySold}x ${resource.name} for ${result.proceedsToSeller.toFixed(0)}cr (fee: ${result.feeDeducted.toFixed(0)}cr)`,
    );
    this.redraw();
  }
}
