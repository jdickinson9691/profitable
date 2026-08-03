namespace Profitable.Core.Schema;

// Ports src/data/types/arrivalResult.ts's ArrivalResult = ArrivalResolved
// | ArrivalNotYetDue discriminated union. Does NOT itself activate any
// Listing for in-transit sale cargo -- the caller (Presentation/
// Integration) is responsible for turning delivered cargo into a real
// Listing via ListingFactory.CreateListing.
public abstract class ArrivalResult
{
    public abstract bool Resolved { get; }
}

public sealed class ArrivalResolved : ArrivalResult
{
    public override bool Resolved => true;
    public Ship UpdatedShip { get; init; } = new();
    public string DestinationPlanetId { get; init; } = string.Empty;
    public List<VoyageCargoItem> Cargo { get; init; } = new();

    // Always present, empty by default -- populated only when a caller
    // opts into encounter resolution at all.
    public List<EncounterResult> Encounters { get; init; } = new();
    public List<CombatEncounter> PendingCombats { get; init; } = new();
}

public sealed class ArrivalNotYetDue : ArrivalResult
{
    public override bool Resolved => false;
    public string Reason { get; init; } = string.Empty;
}
