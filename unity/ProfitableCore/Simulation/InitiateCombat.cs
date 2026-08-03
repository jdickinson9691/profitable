using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/ships/initiateCombat.ts. Shared by both trigger points (the
// travel-window roll, inside ResolveEncounters; and the arrival check,
// inside ResolveArrival) -- the only randomness that happens at
// detection time is this one 1-100 roll mapped through the shared tier
// breakpoint table; the variance-adjusted combat value that actually
// decides win/lose isn't rolled until ResolveCombatChoice, fresh, at
// resolution time.
public static class CombatInitiator
{
    public static CombatEncounter InitiateCombat(string id, string voyageId, CombatTriggerContext triggerContext, int? windowIndex, RandomFn random)
    {
        var threatRoll = (int)Math.Floor(random() * 100) + 1;
        return new CombatEncounter
        {
            Id = id,
            VoyageId = voyageId,
            TriggerContext = triggerContext,
            OpponentThreatTier = TierColorResolver.GetTierColor(threatRoll),
            Status = CombatStatus.Pending,
            Outcome = null,
            WindowIndex = windowIndex,
        };
    }
}
