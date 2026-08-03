using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/crew/resolveBackgroundCrafting.ts. Elapsed time is always
// derived from currentTime - LastCheckedAt -- never trusts a caller-
// supplied duration, which is the entire point of storing LastCheckedAt.
public static class ResolveBackgroundCraftingSimulation
{
    private const double MsPerHour = 60 * 60 * 1000;

    // The TypeScript source's `backgroundRate: number | null =
    // BACKGROUND_IDLE_OUTPUT_RATE` default is evaluated PER CALL (a live
    // JS default-argument read), so an omitted argument always uses
    // whatever the config currently holds -- including a future value if
    // it changes at runtime. C# default parameter values are baked in at
    // compile time, so they can't read a mutable static property live;
    // this overload is the translation of that live-default behavior
    // instead. Passing an explicit `null` (not omitting the argument)
    // still means "no background output configured for this call" --
    // callers that want that must call the other overload directly.
    public static BackgroundResult ResolveBackgroundCrafting(
        CrewMember crewMember,
        CraftAction craftAction,
        long currentTimeMs,
        RandomFn? random = null,
        double maxUnits = double.PositiveInfinity)
        => ResolveBackgroundCrafting(crewMember, craftAction, currentTimeMs, CrewConfig.BackgroundIdleOutputRate, random, maxUnits);

    // `maxUnits` is the real-inventory availability cap, pre-resolved by
    // the caller -- same "core function never touches Inventory directly,
    // caller passes in what's available" boundary this project's own
    // BuildCitadel-equivalent reasoning already established. Defaults to
    // unbounded so a caller with no inventory constraint to apply is
    // unaffected.
    public static BackgroundResult ResolveBackgroundCrafting(
        CrewMember crewMember,
        CraftAction craftAction,
        long currentTimeMs,
        double? backgroundRate,
        RandomFn? random,
        double maxUnits)
    {
        var updatedCrewMember = new CrewMember
        {
            Id = crewMember.Id,
            HiredByPlayerId = crewMember.HiredByPlayerId,
            Tier = crewMember.Tier,
            Profession = crewMember.Profession,
            Status = crewMember.Status,
            AssignedCraftId = crewMember.AssignedCraftId,
            HiredAt = crewMember.HiredAt,
            LastCheckedAt = currentTimeMs,
            WageAmount = crewMember.WageAmount,
            LastPaidAt = crewMember.LastPaidAt,
            UnavailableUntil = crewMember.UnavailableUntil,
            ShipRole = crewMember.ShipRole,
            AssignedShipId = crewMember.AssignedShipId,
        };

        if (backgroundRate is null)
        {
            return new BackgroundRateUnavailable
            {
                Reason = "no background/idle output rate configured for this call",
                UpdatedCrewMember = updatedCrewMember,
            };
        }

        var rawElapsedHours = (currentTimeMs - crewMember.LastCheckedAt) / MsPerHour;
        var cappedElapsedHours = Math.Min(Math.Max(rawElapsedHours, 0), CrewConfig.ElapsedTimeCapHours);
        var unitsCompleted = (int)Math.Min(Math.Floor(cappedElapsedHours * backgroundRate.Value), maxUnits);

        var results = new List<CraftResult>();
        for (var i = 0; i < unitsCompleted; i++)
        {
            results.Add(Crafter.Craft(craftAction.Inputs, craftAction.Recipe, craftAction.SchematicTier, crewMember.Tier, random));
        }

        return new BackgroundResolved { UnitsCompleted = unitsCompleted, Results = results, UpdatedCrewMember = updatedCrewMember };
    }
}
