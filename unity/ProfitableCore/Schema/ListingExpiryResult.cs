namespace Profitable.Core.Schema;

// Ports src/data/types/listingExpiry.ts. A planet-market listing is held
// at that planet for pickup; a global-market listing returns straight to
// the creating player's inventory.
public sealed class ReturnAction
{
    public string ItemId { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public string PlayerId { get; init; } = string.Empty;
    public ReturnDestination Destination { get; init; }

    // Present only when Destination is PlanetPickup.
    public string? PlanetId { get; init; }
}

public enum ReturnDestination
{
    PlanetPickup,
    Inventory,
}

public sealed class ListingExpiryResult
{
    public List<Listing> Expired { get; init; } = new();
    public List<ReturnAction> Returned { get; init; } = new();
}
