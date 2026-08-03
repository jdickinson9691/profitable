using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/trading/purchaseListing.ts. Takes the actual Listing (and, for
// a planet listing, its PlanetMarketState) as explicit parameters rather
// than looking one up by id out of some implicit store -- same resolution
// as GlobalPrice, and consistent with every other pure function in this
// namespace. Whatever maintains the real listing/market-state store is
// responsible for the id lookup and for persisting the returned
// UpdatedListing/UpdatedMarketState.
//
// marketState is required for a planet listing (a PlanetMarketLocation)
// and must be null for a global listing -- global listings have no
// per-planet drift state to update.
public static class PurchaseListingSimulation
{
    public static PurchaseResult PurchaseListing(
        Listing listing,
        int quantityToBuy,
        string buyerPlayerId,
        PlanetMarketState? marketState)
    {
        if (buyerPlayerId == listing.CreatedByPlayerId)
        {
            return new PurchaseRejected { Reason = "a listing's creator cannot purchase their own listing" };
        }

        if (quantityToBuy <= 0)
        {
            return new PurchaseRejected { Reason = "quantityToBuy must be positive" };
        }

        if (quantityToBuy > listing.Quantity)
        {
            return new PurchaseRejected
            {
                Reason = $"requested {quantityToBuy} but the listing only has {listing.Quantity} available",
            };
        }

        var isPlanetListing = !listing.Location.IsGlobal;
        if (isPlanetListing && marketState is null)
        {
            throw new InvalidOperationException("PurchaseListing: a planet-market listing requires its PlanetMarketState");
        }
        if (!isPlanetListing && marketState is not null)
        {
            throw new InvalidOperationException("PurchaseListing: a global listing has no per-planet drift state");
        }

        var totalPaid = quantityToBuy * listing.PricePerUnit;
        var feeDeducted = totalPaid * TradingConfig.TransactionFeePercent;
        var proceedsToSeller = totalPaid - feeDeducted;

        var remainingQuantity = listing.Quantity - quantityToBuy;
        var closed = remainingQuantity == 0;
        var updatedListing = new Listing
        {
            Id = listing.Id,
            ItemId = listing.ItemId,
            Quantity = remainingQuantity,
            PricePerUnit = listing.PricePerUnit,
            MarketTier = listing.MarketTier,
            Location = listing.Location,
            CreatedByPlayerId = listing.CreatedByPlayerId,
            CreatedAt = listing.CreatedAt,
            ExpiresAt = listing.ExpiresAt,
        };

        // A purchase removes supply from the market, so it drifts the
        // price up (Buy direction) -- see Drift's own comment on
        // direction meaning.
        var updatedMarketState = marketState is null ? null : Drift.ApplyDrift(marketState, quantityToBuy, TradeDirection.Buy);

        return new PurchaseSucceeded
        {
            UpdatedListing = updatedListing,
            Closed = closed,
            QuantityPurchased = quantityToBuy,
            TotalPaid = totalPaid,
            FeeDeducted = feeDeducted,
            ProceedsToSeller = proceedsToSeller,
            UpdatedMarketState = updatedMarketState,
        };
    }
}
