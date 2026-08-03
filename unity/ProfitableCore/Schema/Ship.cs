namespace Profitable.Core.Schema;

// Ports src/data/types/ship.ts. Tier is derived (straight average of
// installed component tiers, via DeriveShipTier -- never reimplemented
// here). CurrentPlanetId is set at purchase time and updated only by
// ResolveArrival on a successful arrival -- never mutated mid-voyage; the
// Voyage record itself represents "currently in transit."
public class Ship
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public TierColor Tier { get; set; }
    public string CurrentPlanetId { get; set; } = string.Empty;

    // Derived from Tier (DeriveFuelCapacity()), recomputed by
    // AssembleShip() on every component change -- never set directly.
    public double FuelCapacity { get; set; }
    public double CurrentFuel { get; set; }

    public ShipComponentSlots Components { get; set; } = new();

    // Ship Crew Roles amendment (ResolveComponentRepair()). Missing means
    // "never repaired/no tracked history" -- read as zero elapsed time on
    // the first call for a given ship, never a free retroactive catch-up.
    public long? LastRepairedAt { get; set; }
}
