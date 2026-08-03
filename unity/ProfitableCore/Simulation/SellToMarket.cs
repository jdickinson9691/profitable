using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/trading/sellToMarket.ts. Trading Counterparty fix: the
// verified single-player dead end where PurchaseListing's self-trade
// rejection means a solo player can never buy their own listing, so every
// listing they create becomes permanently unpurchasable once the
// seed-market listings expire. This is the fix -- an instant,
// listing-free sell at the market's live price, structurally impossible
// to deadlock the way listings can.
//
// sellerPlayerId is accepted (not read internally) purely for future
// leaderboard/attribution use -- this function itself doesn't branch on
// it, matching the TypeScript source's own unused `_sellerPlayerId`
// parameter naming.
public static class SellToMarketSimulation
{
    public static SellToMarketResult SellToMarket(
        ResourceInstance itemInstance,
        int quantity,
        PlanetMarketState marketState,
        Wallet wallet,
        string sellerPlayerId)
    {
        _ = itemInstance;
        _ = sellerPlayerId;

        if (quantity <= 0)
        {
            throw new InvalidOperationException("SellToMarket: quantity must be positive");
        }

        var totalValue = quantity * marketState.CurrentPrice;
        var feeDeducted = totalValue * TradingConfig.TransactionFeePercent;
        var proceedsToSeller = totalValue - feeDeducted;

        var updatedWallet = new Wallet { PlayerId = wallet.PlayerId, Credits = wallet.Credits + proceedsToSeller };
        // "Sell" already means "added supply, price drops" per Drift's
        // own existing direction semantics (a player sold INTO this
        // market) -- no new drift logic, exactly PurchaseListing's reuse
        // of the same function.
        var updatedMarketState = Drift.ApplyDrift(marketState, quantity, TradeDirection.Sell);

        return new SellToMarketResult
        {
            QuantitySold = quantity,
            TotalValue = totalValue,
            FeeDeducted = feeDeducted,
            ProceedsToSeller = proceedsToSeller,
            UpdatedWallet = updatedWallet,
            UpdatedMarketState = updatedMarketState,
        };
    }
}
