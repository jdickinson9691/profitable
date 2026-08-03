namespace Profitable.Core.Schema;

// Ports src/data/types/combatEncounter.ts. Deliberately NOT a variant of
// EncounterResult -- CombatEncounter instead carries its own pending ->
// resolved lifecycle: OpponentThreatTier is rolled once, immediately, at
// detection time; Status/Outcome only change later, via an explicit
// ResolveCombatChoice call -- never automatically.
public enum CombatTriggerContext
{
    Travel,
    Arrival,
}

public enum CombatStatus
{
    Pending,
    Resolved,
}

public enum CombatOutcome
{
    Win,
    Lose,
    Flee,
}

public class CombatEncounter
{
    public string Id { get; set; } = string.Empty;
    public string VoyageId { get; set; } = string.Empty;
    public CombatTriggerContext TriggerContext { get; set; }
    public TierColor OpponentThreatTier { get; set; }
    public CombatStatus Status { get; set; }

    // Null while pending -- only ever set by ResolveCombatChoice.
    public CombatOutcome? Outcome { get; set; }

    // Null for an arrival-triggered encounter -- there is no travel
    // window to index into.
    public int? WindowIndex { get; set; }
}
