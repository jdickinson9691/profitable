using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/trading/expireListings.ts. Takes the active listings array
// explicitly (same pure-function reasoning as PurchaseListing/GlobalPrice)
// rather than reading some implicit store.
public static class ExpireListingsSimulation
{
    public static ListingExpiryResult ExpireListings(IReadOnlyList<Listing> listings, long currentTimeMs)
    {
        var expired = new List<Listing>();
        var returned = new List<ReturnAction>();

        foreach (var listing in listings)
        {
            if (listing.ExpiresAt > currentTimeMs) continue;
            expired.Add(listing);

            // A listing that already sold out (quantity 0) has nothing to return.
            if (listing.Quantity == 0) continue;

            if (listing.Location.IsGlobal)
            {
                returned.Add(new ReturnAction
                {
                    ItemId = listing.ItemId,
                    Quantity = listing.Quantity,
                    PlayerId = listing.CreatedByPlayerId,
                    Destination = ReturnDestination.Inventory,
                });
            }
            else
            {
                var planetId = ((PlanetMarketLocation)listing.Location).PlanetId;
                returned.Add(new ReturnAction
                {
                    ItemId = listing.ItemId,
                    Quantity = listing.Quantity,
                    PlayerId = listing.CreatedByPlayerId,
                    Destination = ReturnDestination.PlanetPickup,
                    PlanetId = planetId,
                });
            }
        }

        return new ListingExpiryResult { Expired = expired, Returned = returned };
    }
}
