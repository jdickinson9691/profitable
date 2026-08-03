namespace Profitable.Core.Schema;

// Ports src/data/types/shipCandidate.ts. Omits Ship.OwnerId only -- an
// unpurchased shipyard candidate has no real owner yet; name/tier/
// components are all still meaningful pre-purchase.
public class ShipCandidate
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public TierColor Tier { get; set; }
    public ShipComponentSlots Components { get; set; } = new();
}
