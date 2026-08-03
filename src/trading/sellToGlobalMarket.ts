import type { ResourceInstance } from "../data/types/resourceInstance.ts";
import type { PlanetMarketState } from "../data/types/planetMarketState.ts";
import type { Wallet } from "../data/types/wallet.ts";
import type { SellToGlobalMarketResult } from "../data/types/sellToGlobalMarketResult.ts";
import { TRANSACTION_FEE_PERCENT, GLOBAL_LISTABLE_MAX_ITEM_TIER } from "../data/constants/tradingConfig.ts";
import { getGlobalPrice } from "./globalPrice.ts";

// Trading Counterparty (profitable-design-questions.md), global-market
// sibling of sellToMarket.ts -- the same self-trade dead end exists here
// too (purchaseListing()'s rejection applies identically to
// location: "global" listings).
//
// Deliberately drifts no PlanetMarketState. getGlobalPrice() is a derived
// value (max/min across every planet currently trading the item, not an
// independent number) -- there is no single planet's state that "owns" a
// global sale. Reaching into whichever planet happened to supply the
// reference price would make a global sale silently affect that one
// planet's own economy, which nothing about global trading is supposed to
// do (galactic-market.md's own "must not give global listings their own
// drift state" rule).
export function sellToGlobalMarket(
  itemInstance: ResourceInstance,
  quantity: number,
  marketStates: PlanetMarketState[],
  wallet: Wallet,
  _sellerPlayerId: string,
): SellToGlobalMarketResult {
  if (quantity <= 0) {
    throw new Error("sellToGlobalMarket: quantity must be positive");
  }

  const itemTier = itemInstance.resource.itemTier;
  if (itemTier !== undefined && itemTier > GLOBAL_LISTABLE_MAX_ITEM_TIER) {
    throw new Error(
      `sellToGlobalMarket: item tier ${itemTier} exceeds the global-listable ceiling of ` +
        `${GLOBAL_LISTABLE_MAX_ITEM_TIER} -- tiers 6-7 are sell-restricted to planet markets`,
    );
  }

  // Propagated, not caught -- getGlobalPrice() already throws when no
  // planet currently trades the item, the correct failure mode here too.
  const sellPrice = getGlobalPrice(itemInstance.resource.id, "sell", marketStates);

  const totalValue = quantity * sellPrice;
  const feeDeducted = totalValue * TRANSACTION_FEE_PERCENT;
  const proceedsToSeller = totalValue - feeDeducted;

  const updatedWallet: Wallet = { ...wallet, credits: wallet.credits + proceedsToSeller };

  return { quantitySold: quantity, totalValue, feeDeducted, proceedsToSeller, updatedWallet };
}
