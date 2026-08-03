import type { ResourceInstance } from "../data/types/resourceInstance.ts";
import type { PlanetMarketState } from "../data/types/planetMarketState.ts";
import type { Wallet } from "../data/types/wallet.ts";
import type { SellToMarketResult } from "../data/types/sellToMarketResult.ts";
import { TRANSACTION_FEE_PERCENT } from "../data/constants/tradingConfig.ts";
import { applyDrift } from "./drift.ts";

// Trading Counterparty (profitable-design-questions.md). Fixes the verified
// single-player dead end: purchaseListing()'s self-trade rejection means a
// solo player can never buy their own listing, so every listing they create
// becomes permanently unpurchasable once the seed-market listings expire.
// This is the fix -- an instant, listing-free sell at the market's live
// price, structurally impossible to deadlock the way listings can.
//
// sellerPlayerId is accepted (not read internally) purely for future
// leaderboard/attribution use (universe.md's trading-volume metric sums
// purchaseListing() + sellToMarket()) -- this function itself doesn't
// branch on it.
export function sellToMarket(
  _itemInstance: ResourceInstance,
  quantity: number,
  marketState: PlanetMarketState,
  wallet: Wallet,
  _sellerPlayerId: string,
): SellToMarketResult {
  if (quantity <= 0) {
    throw new Error("sellToMarket: quantity must be positive");
  }

  const totalValue = quantity * marketState.currentPrice;
  const feeDeducted = totalValue * TRANSACTION_FEE_PERCENT;
  const proceedsToSeller = totalValue - feeDeducted;

  const updatedWallet: Wallet = { ...wallet, credits: wallet.credits + proceedsToSeller };
  // "sell" already means "added supply, price drops" per drift.ts's own
  // existing direction semantics (a player sold INTO this market) -- no new
  // drift logic, exactly purchaseListing()'s reuse of the same function.
  const updatedMarketState = applyDrift(marketState, quantity, "sell");

  return {
    quantitySold: quantity,
    totalValue,
    feeDeducted,
    proceedsToSeller,
    updatedWallet,
    updatedMarketState,
  };
}
