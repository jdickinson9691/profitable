import type { Wallet } from "./wallet.ts";

// Agent 11 amendment (Trading Counterparty). Deliberately no
// updatedMarketState field at all (not even null) -- global price is a
// derived value with no PlanetMarketState of its own to update, unlike
// SellToMarketResult's planetary counterpart. See sellToGlobalMarket.ts's
// own comment for why drifting the planet that happened to supply the
// derived price would be wrong.
export interface SellToGlobalMarketResult {
  quantitySold: number;
  totalValue: number;
  feeDeducted: number;
  proceedsToSeller: number;
  updatedWallet: Wallet;
}
