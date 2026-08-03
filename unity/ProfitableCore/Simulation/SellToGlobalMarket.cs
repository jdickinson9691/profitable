using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/trading/sellToGlobalMarket.ts. Trading Counterparty
// global-market sibling of SellToMarket -- the same self-trade dead end
// exists here too (PurchaseListing's rejection applies identically to
// PlanetMarketLocation listings... and equally to global ones).
//
// Deliberately drifts no PlanetMarketState. GetGlobalPrice() is a derived
// value (max/min across every planet currently trading the item, not an
// independent number) -- there is no single planet's state that "owns" a
// global sale. Reaching into whichever planet happened to supply the
// reference price would make a global sale silently affect that one
// planet's own economy, which nothing about global trading is supposed to
// do.
public static class SellToGlobalMarketSimulation
{
    public static SellToGlobalMarketResult SellToGlobalMarket(
        ResourceInstance itemInstance,
        int quantity,
        IReadOnlyList<PlanetMarketState> marketStates,
        Wallet wallet,
        string sellerPlayerId)
    {
        _ = sellerPlayerId;

        if (quantity <= 0)
        {
            throw new InvalidOperationException("SellToGlobalMarket: quantity must be positive");
        }

        var itemTier = itemInstance.Resource.ItemTier;
        if (itemTier is not null && itemTier > TradingConfig.GlobalListableMaxItemTier)
        {
            throw new InvalidOperationException(
                $"SellToGlobalMarket: item tier {itemTier} exceeds the global-listable ceiling of " +
                $"{TradingConfig.GlobalListableMaxItemTier} -- tiers 6-7 are sell-restricted to planet markets");
        }

        // Propagated, not caught -- GetGlobalPrice() already throws when
        // no planet currently trades the item, the correct failure mode
        // here too.
        var sellPrice = GlobalPrice.GetGlobalPrice(itemInstance.Resource.Id, TradeDirection.Sell, marketStates);

        var totalValue = quantity * sellPrice;
        var feeDeducted = totalValue * TradingConfig.TransactionFeePercent;
        var proceedsToSeller = totalValue - feeDeducted;

        var updatedWallet = new Wallet { PlayerId = wallet.PlayerId, Credits = wallet.Credits + proceedsToSeller };

        return new SellToGlobalMarketResult
        {
            QuantitySold = quantity,
            TotalValue = totalValue,
            FeeDeducted = feeDeducted,
            ProceedsToSeller = proceedsToSeller,
            UpdatedWallet = updatedWallet,
        };
    }
}
