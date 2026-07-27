import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { content, getInventory, setInventory } from "../gameState.ts";
import { startingPlanet } from "../galaxyState.ts";
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
import type { PurchaseSucceeded } from "../../data/types/purchaseResult.ts";
import type { Listing } from "../../data/types/listing.ts";

// Agent 13 (Trading Presentation): the planet-local market screen. Every
// number shown is sourced directly from Agent 11's actual function
// outputs -- this scene formats and dispatches, never recomputes pricing/
// fee/drift math itself (Phase 3 GDD §4.2 Must-NOT-Do).
export class MarketScene extends Phaser.Scene {
  private statusText?: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.market);
  }

  create(): void {
    this.redraw();
  }

  private redraw(): void {
    this.children.removeAll();
    renderNav(this, SCENE_KEYS.market);

    this.add.text(16, 64, `Market — ${startingPlanet.name}`, {
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
    this.add.text(16, y, "Active listings:", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });
    y += 24;

    const planetListings = getListings().filter(
      (listing) =>
        listing.location !== "global" &&
        listing.location.planetId === startingPlanet.id &&
        listing.quantity > 0,
    );

    if (planetListings.length === 0) {
      this.add.text(16, y, "(none)", { fontFamily: "monospace", fontSize: "14px", color: "#888888" });
      y += 24;
    }

    for (const listing of planetListings) {
      const resource = content.resources.find((r) => r.id === listing.itemId);
      const label = `${resource?.name ?? listing.itemId} x${listing.quantity} @ ${listing.pricePerUnit}cr (${listing.marketTier}) — seller: ${listing.createdByPlayerId}`;
      this.add.text(16, y, label, { fontFamily: "monospace", fontSize: "14px", color: "#cccccc" });

      const buyOne = this.add.text(560, y, "> Buy 1", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#4caf50",
      });
      buyOne.setInteractive({ useHandCursor: true });
      buyOne.on("pointerdown", () => this.buy(listing, 1));

      if (listing.quantity > 1) {
        const buyAll = this.add.text(650, y, "> Buy All", {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#4caf50",
        });
        buyAll.setInteractive({ useHandCursor: true });
        buyAll.on("pointerdown", () => this.buy(listing, listing.quantity));
      }

      y += 22;
    }

    y += 12;
    this.add.text(16, y, "Sell from inventory:", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });
    y += 24;

    const inventory = getInventory();
    if (inventory.length === 0) {
      this.add.text(16, y, "(nothing to sell)", { fontFamily: "monospace", fontSize: "14px", color: "#888888" });
    }

    inventory.forEach((batch, index) => {
      const resource = content.resources.find((r) => r.id === batch.resourceId);
      const marketState = getMarketState(startingPlanet.id, batch.resourceId);
      const suggestedPrice = marketState ? Math.round(marketState.currentPrice) : 10;
      const label = `${resource?.name ?? batch.resourceId} x${batch.quantity} — list @ ${suggestedPrice}cr/unit`;
      const button = this.add.text(16, y, `> ${label}`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#2196f3",
      });
      button.setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => this.sell(index, suggestedPrice));
      y += 22;
    });

    this.statusText = this.add.text(16, 460, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cccccc",
    });
  }

  private buy(listing: Listing, quantity: number): void {
    const marketState = getMarketState(startingPlanet.id, listing.itemId) ?? null;
    const result = purchaseListing(listing, quantity, PLAYER_ID, marketState);

    if (!result.success) {
      this.statusText?.setText(`Purchase failed: ${result.reason}`);
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

    this.statusText?.setText(
      `Bought ${succeeded.quantityPurchased}x ${resource?.name ?? listing.itemId} for ${succeeded.totalPaid}cr (fee: ${succeeded.feeDeducted}cr)`,
    );
    this.redraw();
  }

  private sell(inventoryIndex: number, pricePerUnit: number): void {
    const inventory = getInventory();
    const batch = inventory[inventoryIndex];
    if (!batch) return;

    const resource = content.resources.find((r) => r.id === batch.resourceId);
    if (!resource) return;

    const listing = createListing(
      { resource, quantity: batch.quantity, qualities: batch.qualities },
      batch.quantity,
      pricePerUnit,
      { planetId: startingPlanet.id },
      PLAYER_ID,
      `listing-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );

    addListing(listing);
    setListingQualities(listing.id, batch.qualities);
    setInventory(removeBatchAt(inventory, inventoryIndex));

    this.statusText?.setText(`Listed ${batch.quantity}x ${resource.name} @ ${pricePerUnit}cr/unit`);
    this.redraw();
  }
}
