using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/trading/createListing.ts. Named ListingFactory (not
// "CreateListing", which C# reserves poorly as a static-class name next to
// a same-named method) -- CreateListing() is the one public method.
public static class ListingFactory
{
    // Id is caller-supplied (this module has no identity-generation scheme
    // of its own, matching Refiner/Crafter's own pure-function mandate --
    // no hidden state, no implicit ID counter). nowMs mirrors
    // Refiner/Crafter's own injectable-input pattern (there, an injectable
    // RandomFn; here, an injectable clock) for deterministic tests.
    public static Listing CreateListing(
        ResourceInstance itemInstance,
        int quantity,
        double pricePerUnit,
        MarketLocation location,
        string playerId,
        string id,
        long nowMs)
    {
        var itemTier = itemInstance.Resource.ItemTier;
        // ItemTier is optional (pre-Phase-3 resources never set it) --
        // null is treated as "not tier-restricted" since there's no
        // declared tier to enforce a restriction against.
        if (location.IsGlobal && itemTier is not null && itemTier > TradingConfig.GlobalListableMaxItemTier)
        {
            throw new InvalidOperationException(
                $"CreateListing: item tier {itemTier} exceeds the global-listable ceiling of " +
                $"{TradingConfig.GlobalListableMaxItemTier} -- tiers 6-7 are sell-restricted to planet markets");
        }

        var marketTier = AggregateTierResolver.ComputeAggregateTier(itemInstance.Qualities);
        if (marketTier is null)
        {
            throw new InvalidOperationException(
                "CreateListing: cannot derive a marketTier -- every quality dimension is null for this item");
        }

        return new Listing
        {
            Id = id,
            ItemId = itemInstance.Resource.Id,
            Quantity = quantity,
            PricePerUnit = pricePerUnit,
            MarketTier = marketTier.Value,
            Location = location,
            CreatedByPlayerId = playerId,
            CreatedAt = nowMs,
            ExpiresAt = nowMs + (long)(TradingConfig.ListingExpiryHours * 60 * 60 * 1000),
        };
    }
}
