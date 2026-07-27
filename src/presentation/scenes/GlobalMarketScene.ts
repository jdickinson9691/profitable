import Phaser from "phaser";
import { SCENE_KEYS, renderNav } from "./nav.ts";
import { content, getInventory, setInventory } from "../gameState.ts";
import { removeBatchAt } from "../inventory.ts";
import {
  PLAYER_ID,
  getWallet,
  setWallet,
  getListings,
  addListing,
  replaceListing,
  getMarketStates,
  getListingQualities,
  setListingQualities,
} from "../tradingState.ts";
import { createListing } from "../../trading/createListing.ts";
import { purchaseListing } from "../../trading/purchaseListing.ts";
import { getGlobalPrice } from "../../trading/globalPrice.ts";
import { GLOBAL_LISTABLE_MAX_ITEM_TIER } from "../../data/constants/tradingConfig.ts";
import type { PurchaseSucceeded } from "../../data/types/purchaseResult.ts";
import type { Listing } from "../../data/types/listing.ts";

// Agent 13 (Trading Presentation): the global market screen (Phase 3 GDD
// §2.1/§2.7). Derived buy/sell prices come straight from
// getGlobalPrice() -- never recomputed here. Tier 1-5 sell / tier 1-7 buy
// is enforced at the UI level (this file) as defense in depth, on top of
// createListing()'s own hard rejection (Agent 11) -- the "> List Globally"
// action simply isn't offered for a tier 6-7 item, rather than being
// offered and failing.
export class GlobalMarketScene extends Phaser.Scene {
  private statusText?: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.globalMarket);
  }

  create(): void {
    this.redraw();
  }

  private canListGlobally(itemTier: number | undefined): boolean {
    return itemTier === undefined || itemTier <= GLOBAL_LISTABLE_MAX_ITEM_TIER;
  }

  private redraw(): void {
    this.children.removeAll();
    renderNav(this, SCENE_KEYS.globalMarket);

    this.add.text(16, 64, "Global Market", { fontFamily: "monospace", fontSize: "22px", color: "#ffffff" });
    this.add.text(16, 90, `Credits: ${getWallet().credits}`, {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffd700",
    });

    let y = 120;
    this.add.text(16, y, "Derived global prices:", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });
    y += 24;

    const marketStates = getMarketStates();
    for (const resource of content.resources) {
      let line: string;
      try {
        const buy = getGlobalPrice(resource.id, "buy", marketStates);
        const sell = getGlobalPrice(resource.id, "sell", marketStates);
        line = `${resource.name}: buy ${buy.toFixed(2)}cr / sell ${sell.toFixed(2)}cr`;
      } catch {
        line = `${resource.name}: not currently traded anywhere`;
      }
      this.add.text(16, y, line, { fontFamily: "monospace", fontSize: "14px", color: "#cccccc" });
      y += 20;
    }

    y += 12;
    this.add.text(16, y, "Active global listings:", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });
    y += 24;

    const globalListings = getListings().filter((listing) => listing.location === "global" && listing.quantity > 0);
    if (globalListings.length === 0) {
      this.add.text(16, y, "(none)", { fontFamily: "monospace", fontSize: "14px", color: "#888888" });
      y += 24;
    }

    for (const listing of globalListings) {
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
    this.add.text(16, y, "List globally from inventory:", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffffff",
    });
    y += 24;

    const inventory = getInventory();
    let anyListable = false;
    inventory.forEach((batch, index) => {
      const resource = content.resources.find((r) => r.id === batch.resourceId);
      if (!resource || !this.canListGlobally(resource.itemTier)) return;
      anyListable = true;

      const label = `${resource.name} x${batch.quantity} — list globally @ 10cr/unit`;
      const button = this.add.text(16, y, `> ${label}`, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#2196f3",
      });
      button.setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => this.sell(index, 10));
      y += 22;
    });
    if (!anyListable) {
      this.add.text(16, y, "(nothing eligible -- tier 6-7 items are planet-market only)", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#888888",
      });
    }

    this.statusText = this.add.text(16, 440, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#cccccc",
    });
  }

  private buy(listing: Listing, quantity: number): void {
    const result = purchaseListing(listing, quantity, PLAYER_ID, null);

    if (!result.success) {
      this.statusText?.setText(`Purchase failed: ${result.reason}`);
      return;
    }

    const succeeded = result as PurchaseSucceeded;
    setWallet({ ...getWallet(), credits: getWallet().credits - succeeded.totalPaid });
    replaceListing(succeeded.updatedListing);

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

    // UI-level guard mirrors createListing()'s own tier check (Agent 11)
    // -- this button is only ever rendered for an eligible item (see
    // redraw()), so this call should never actually throw in practice.
    const listing = createListing(
      { resource, quantity: batch.quantity, qualities: batch.qualities },
      batch.quantity,
      pricePerUnit,
      "global",
      PLAYER_ID,
      `listing-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );

    addListing(listing);
    setListingQualities(listing.id, batch.qualities);
    setInventory(removeBatchAt(inventory, inventoryIndex));

    this.statusText?.setText(`Listed ${batch.quantity}x ${resource.name} globally @ ${pricePerUnit}cr/unit`);
    this.redraw();
  }
}
