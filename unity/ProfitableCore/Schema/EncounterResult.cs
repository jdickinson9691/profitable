namespace Profitable.Core.Schema;

// Ports src/data/types/encounter.ts. EncounterResult is a discriminated
// union on Type, same pattern as CraftResult/ArrivalResult/
// PurchaseShipResult -- each type's outcome payload is genuinely
// different, so callers should get real type narrowing, not a cast.
//
// EncounterType now also covers Combat, since it's still one of the four
// possible outcomes of the shared weighted type-split roll -- deliberately
// NOT matched by a fourth EncounterResult variant, though: every variant
// below represents a fully resolved, synchronous outcome, a shape combat
// structurally cannot fit (it's detected, reported pending, but not
// resolved until an explicit, separate player choice -- see
// CombatEncounter for that lifecycle instead).
public enum EncounterType
{
    TradeOpportunity,
    Discovery,
    Hazard,
    Combat,
}

public abstract class EncounterResult
{
    public abstract EncounterType Type { get; }
    public int WindowIndex { get; init; }
}

public sealed class TradeOpportunityEncounterResult : EncounterResult
{
    public override EncounterType Type => EncounterType.TradeOpportunity;
    public double CreditsGranted { get; init; }
}

// The GDD's own outcome description says "the rolled Resource +
// QualityRoll," but storing a full Resource object inline would
// duplicate content data inside Voyage, which persists indefinitely --
// ResourceId follows the same id-string convention every other
// reference to a resource elsewhere in this codebase already uses
// (Listing.ItemId, VoyageCargoItem.ItemId).
public sealed class DiscoveryEncounterResult : EncounterResult
{
    public override EncounterType Type => EncounterType.Discovery;
    public string ResourceId { get; init; } = string.Empty;
    public QualityMap Qualities { get; init; } = new();
}

// CreditsLost is always present (0 when passed), not nullable -- same
// "always-present, meaningfully zero" convention as RefineResult's own
// RefundUnits, rather than a field that only exists on failure.
public sealed class HazardEncounterResult : EncounterResult
{
    public override EncounterType Type => EncounterType.Hazard;
    public bool Passed { get; init; }
    public double CreditsLost { get; init; }
}
