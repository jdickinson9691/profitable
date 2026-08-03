import type { Wallet } from "./wallet.ts";
import type { PlanetMarketState } from "./planetMarketState.ts";

// Agent 11 amendment (Trading Counterparty). Not a discriminated union like
// PurchaseResult -- sellToMarket() throws for its one failure mode
// (non-positive quantity) rather than returning a typed rejection, since
// selling your own inventory has no normal business-rejection case the way
// purchaseListing()'s self-trade/over-quantity checks do (those react to
// another player's independent action). Every successful call returns this
// shape directly, same as createListing() returning Listing directly.
export interface SellToMarketResult {
  quantitySold: number;
  totalValue: number;
  feeDeducted: number;
  proceedsToSeller: number;
  updatedWallet: Wallet;
  updatedMarketState: PlanetMarketState;
}
