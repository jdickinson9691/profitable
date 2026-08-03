namespace Profitable.Core.Schema;

// Ports src/data/types/listing.ts's MarketLocation = "global" | { planetId:
// string } union. Modeled as a small sealed class hierarchy, the same
// idiom this port already uses for CraftResult/PurchaseResult -- preserves
// the TypeScript union's "you must check which case you have before
// reading case-specific data" property rather than a single class with a
// nullable PlanetId field.
public abstract class MarketLocation
{
    public abstract bool IsGlobal { get; }
}

public sealed class GlobalMarketLocation : MarketLocation
{
    public override bool IsGlobal => true;

    // Stateless -- every global location is interchangeable, so one
    // shared instance avoids allocating a new object at every call site
    // that means "global."
    public static readonly GlobalMarketLocation Instance = new();
}

public sealed class PlanetMarketLocation : MarketLocation
{
    public override bool IsGlobal => false;
    public string PlanetId { get; init; } = string.Empty;
}
