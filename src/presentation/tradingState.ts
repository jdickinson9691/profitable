import { content, saveSystem } from "./gameState.ts";
import { startingPlanet } from "./galaxyState.ts";
import { loadTradingContent } from "../trading/loadTradingContent.ts";
import type { LoadedTradingContent } from "../trading/loadTradingContent.ts";
import { createListing } from "../trading/createListing.ts";
import type { Listing } from "../data/types/listing.ts";
import type { PlanetMarketState } from "../data/types/planetMarketState.ts";
import type { Wallet } from "../data/types/wallet.ts";
import type { QualityRoll } from "../data/types/quality.ts";
import tradingBasePrices from "../../content/tradingBasePrices.json" with { type: "json" };
import planetMarketPreferences from "../../content/planetMarketPreferences.json" with { type: "json" };

// Agent 13's own cross-scene state, same pattern gameState.ts/galaxyState.ts
// already established -- a full multi-planet market simulation is Agent
// 15's (Integration's) job; this is just enough real state for Agent 13's
// own required playtest (browse/list/purchase on the one discovered
// planet, see a derived global price). All persistence goes through
// SaveSystem exclusively, per the browser-API isolation mandate.

export const PLAYER_ID = "player-1";
// Listings not created by the real player, so a single-player session has
// something purchasable -- buying your own listing is correctly rejected
// by purchaseListing()'s self-trade prevention, so the player needs a
// counterparty to demonstrate a purchase against.
const SEED_MARKET_PLAYER_ID = "seed-market";

const STARTING_CREDITS = 500;
const WALLET_SAVE_KEY = "profitable:wallet";
const LISTINGS_SAVE_KEY = "profitable:listings";
const MARKET_STATES_SAVE_KEY = "profitable:marketStates";
const LISTING_QUALITIES_SAVE_KEY = "profitable:listingQualities";

let cachedTradingContent: LoadedTradingContent | null = null;
export function getTradingContent(): LoadedTradingContent {
  if (!cachedTradingContent) {
    cachedTradingContent = loadTradingContent({ tradingBasePrices, planetMarketPreferences });
  }
  return cachedTradingContent;
}

// The preference entry (sells-cheap/buys-at-premium, per Phase 3 GDD §2.9)
// for the discovered planet's own Planet Type -- display-only flavor for
// TradeMapScene's static labeling; live drift (currentPrice vs basePrice)
// is the actual source of truth for what's cheap/premium right now.
export function getStartingPlanetPreference() {
  return getTradingContent().planetMarketPreferences.find(
    (pref) => pref.planetType === startingPlanet.planetType,
  );
}

function loadOrCreateWallet(): Wallet {
  const stored = saveSystem.load(WALLET_SAVE_KEY) as Wallet | null;
  if (stored) return stored;
  const wallet: Wallet = { playerId: PLAYER_ID, credits: STARTING_CREDITS };
  saveSystem.save(WALLET_SAVE_KEY, wallet);
  return wallet;
}

function loadOrCreateMarketStates(): PlanetMarketState[] {
  const stored = saveSystem.load(MARKET_STATES_SAVE_KEY) as PlanetMarketState[] | null;
  if (stored) return stored;
  const states: PlanetMarketState[] = getTradingContent().tradingBasePrices.map((entry) => ({
    planetId: startingPlanet.id,
    itemId: entry.itemId,
    currentPrice: entry.basePrice,
    basePrice: entry.basePrice,
  }));
  saveSystem.save(MARKET_STATES_SAVE_KEY, states);
  return states;
}

// Listing (Agent 1's type) only carries a derived marketTier, not the
// item's real 5-quality QualityRoll -- by design, per listing.ts's own
// comment: "the underlying item instance keeps its real 5-quality data
// elsewhere." This is that "elsewhere": a side-table from listing id to
// the real qualities of what's listed, so a buyer receives the item's
// actual rolled qualities (CLAUDE.md §3.1: qualities persist at every
// tier, never relabeled into a derived stat), not a fabricated stand-in.
let listingQualities: Record<string, QualityRoll> = loadOrCreateListingQualities();

function loadOrCreateListingQualities(): Record<string, QualityRoll> {
  return (saveSystem.load(LISTING_QUALITIES_SAVE_KEY) as Record<string, QualityRoll> | null) ?? {};
}

export function getListingQualities(listingId: string): QualityRoll | undefined {
  return listingQualities[listingId];
}

export function setListingQualities(listingId: string, qualities: QualityRoll): void {
  listingQualities = { ...listingQualities, [listingId]: qualities };
  saveSystem.save(LISTING_QUALITIES_SAVE_KEY, listingQualities);
}

function createSeedListings(): Listing[] {
  const listings: Listing[] = [];
  const now = Date.now();
  const sampleQualities = { purity: 55, density: 55, potency: 55, durability: 55, rarity: 55 };

  const igneousOre = content.resources.find((r) => r.id === "igneous-ore");
  if (igneousOre) {
    const listing = createListing(
      { resource: igneousOre, quantity: 20, qualities: sampleQualities },
      20,
      6,
      { planetId: startingPlanet.id },
      SEED_MARKET_PLAYER_ID,
      "seed-listing-igneous-ore",
      now,
    );
    listings.push(listing);
    setListingQualities(listing.id, sampleQualities);
  }

  const radiantAlloyBar = content.resources.find((r) => r.id === "radiant-alloy-bar");
  if (radiantAlloyBar) {
    const listing = createListing(
      { resource: radiantAlloyBar, quantity: 5, qualities: sampleQualities },
      5,
      38,
      "global",
      SEED_MARKET_PLAYER_ID,
      "seed-listing-radiant-alloy-bar",
      now,
    );
    listings.push(listing);
    setListingQualities(listing.id, sampleQualities);
  }

  return listings;
}

function loadOrCreateListings(): Listing[] {
  const stored = saveSystem.load(LISTINGS_SAVE_KEY) as Listing[] | null;
  if (stored) return stored;
  const listings = createSeedListings();
  saveSystem.save(LISTINGS_SAVE_KEY, listings);
  return listings;
}

let wallet: Wallet = loadOrCreateWallet();
let marketStates: PlanetMarketState[] = loadOrCreateMarketStates();
let listings: Listing[] = loadOrCreateListings();

export function getWallet(): Wallet {
  return wallet;
}

export function setWallet(next: Wallet): void {
  wallet = next;
  saveSystem.save(WALLET_SAVE_KEY, wallet);
}

export function getMarketStates(): PlanetMarketState[] {
  return marketStates;
}

export function setMarketStates(next: PlanetMarketState[]): void {
  marketStates = next;
  saveSystem.save(MARKET_STATES_SAVE_KEY, marketStates);
}

export function getMarketState(planetId: string, itemId: string): PlanetMarketState | undefined {
  return marketStates.find((state) => state.planetId === planetId && state.itemId === itemId);
}

export function replaceMarketState(next: PlanetMarketState): void {
  setMarketStates(marketStates.map((state) =>
    state.planetId === next.planetId && state.itemId === next.itemId ? next : state,
  ));
}

export function getListings(): Listing[] {
  return listings;
}

export function setListings(next: Listing[]): void {
  listings = next;
  saveSystem.save(LISTINGS_SAVE_KEY, listings);
}

export function replaceListing(next: Listing): void {
  setListings(
    listings
      .map((listing) => (listing.id === next.id ? next : listing))
      .filter((listing) => listing.quantity > 0),
  );
}

export function addListing(next: Listing): void {
  setListings([...listings, next]);
}
