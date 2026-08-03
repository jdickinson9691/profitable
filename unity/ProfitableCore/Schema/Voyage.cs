namespace Profitable.Core.Schema;

// Ports src/data/types/voyage.ts. ArrivesAt is computed once, at
// initiation (CalculateTravelTime at departure time) -- never recomputed
// mid-voyage even if the ship's tier changes afterward.
public class VoyageCargoItem
{
    public string ItemId { get; set; } = string.Empty;
    public int Quantity { get; set; }
}

public class Voyage
{
    public string Id { get; set; } = string.Empty;
    public string ShipId { get; set; } = string.Empty;
    public string OriginPlanetId { get; set; } = string.Empty;
    public string DestinationPlanetId { get; set; } = string.Empty;
    public long DepartedAt { get; set; }

    // Double, not long -- unlike every other epoch-ms timestamp in this
    // codebase (Listing.ExpiresAt, CrewMember.LastPaidAt), this one is
    // DERIVED from a floating-point calculation
    // (DepartedAt + CalculateTravelTime(...), itself distance * several
    // tunable multipliers), so it is genuinely fractional in real use --
    // matching the TypeScript source's own plain `number` type exactly.
    // Truncating to an integer here would silently diverge from the real
    // TypeScript output by a fraction of a millisecond on every voyage,
    // failing parity for a reason that would be very hard to spot later.
    public double ArrivesAt { get; set; }
    public List<VoyageCargoItem> Cargo { get; set; } = new();

    // Both nullable/optional in the TypeScript source for backward
    // compatibility with pre-amendment persisted data -- this port has no
    // persisted save data to be compatible with, but keeps the same
    // nullable shape rather than inventing a required-field discrepancy
    // from the source for no reason.
    public List<EncounterResult>? Encounters { get; set; }
    public bool? IsRetreat { get; set; }
}
