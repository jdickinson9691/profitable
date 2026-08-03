namespace Profitable.Core.Schema;

// Ports src/data/types/crewMember.ts. Timestamps are epoch-ms (long),
// matching every other ported time value in this project.
public enum CrewStatus
{
    Idle,
    Active,
}

public class CrewMember
{
    public string Id { get; set; } = string.Empty;
    public string HiredByPlayerId { get; set; } = string.Empty;
    public TierColor Tier { get; set; }

    // Null for tiers 1-5 (general/unspecialized); set and locked at hire
    // time for tiers 6-7 -- never reassigned after hiring.
    public string? Profession { get; set; }

    public CrewStatus Status { get; set; }
    public string? AssignedCraftId { get; set; }
    public long HiredAt { get; set; }

    // For background/idle catch-up resolution -- elapsed time is always
    // derived as currentTime - LastCheckedAt, never caller-supplied.
    public long LastCheckedAt { get; set; }
    public double WageAmount { get; set; }

    // Used to detect unpaid-upkeep attrition -- a grace period is
    // measured from this timestamp, not from HiredAt.
    public long LastPaidAt { get; set; }

    // Combat amendment (Sub-Phase F, not yet ported) -- nullable and
    // defaults to null so pre-Combat data still validates unchanged, same
    // backward-compatibility shape the TypeScript source's own comment
    // documents. Set to a future epoch-ms timestamp only by a combat
    // loss, cleared back to null once that time passes.
    public long? UnavailableUntil { get; set; }

    // Ship Crew Roles amendment (Sub-Phase D, not yet ported) -- same
    // backward-compatibility shape as UnavailableUntil. A ship-role
    // assignment is independent of Status/AssignedCraftId.
    public ShipCrewRole? ShipRole { get; set; }
    public string? AssignedShipId { get; set; }
}
