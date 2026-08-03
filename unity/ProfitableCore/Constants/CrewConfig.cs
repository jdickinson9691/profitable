using Profitable.Core.Schema;

namespace Profitable.Core.Constants;

// Ports src/data/constants/crewConfig.ts. Debug/tuning-panel-adjustable
// values are mutable public static properties (scalars) or a mutable
// public static Dictionary (the two tier-keyed tables) -- same idiom
// TradingConfig established: a C# property/dictionary is already directly
// settable by any caller, so no paired SetX() method is needed the way
// the TypeScript source's live-module-binding limitation requires one.
public static class CrewConfig
{
    // A player starts with this many crew slots before any purchase.
    public static int BaseCrewCapacity { get; set; } = 2;

    // Capacity expansion cost curve: the Nth purchased slot (0-indexed by
    // CrewCapacity.PurchasedSlots) costs
    // CrewCapacityExpansionBaseCost * CrewCapacityExpansionCostMultiplier^N.
    public static double CrewCapacityExpansionBaseCost { get; set; } = 500;
    public static double CrewCapacityExpansionCostMultiplier { get; set; } = 2.0;

    // One-time hire cost by tier. A plain mutable Dictionary, not a
    // wrapper type + find-and-mutate helper -- the TypeScript source's
    // array-of-{tier,cost} shape exists only because JS has no tier-keyed
    // map literal as convenient as this; a Dictionary is the more direct
    // equivalent and is already itself mutable in place.
    public static Dictionary<TierColor, double> CrewHireCostByTier { get; } = new()
    {
        [TierColor.Grey] = 50,
        [TierColor.White] = 100,
        [TierColor.Green] = 200,
        [TierColor.Blue] = 350,
        [TierColor.Purple] = 550,
        [TierColor.Orange] = 800,
        [TierColor.Gold] = 1200,
    };

    // Recurring upkeep wage by tier, paid every WagePaymentIntervalHours.
    public static Dictionary<TierColor, double> CrewWageByTier { get; } = new()
    {
        [TierColor.Grey] = 5,
        [TierColor.White] = 10,
        [TierColor.Green] = 20,
        [TierColor.Blue] = 40,
        [TierColor.Purple] = 80,
        [TierColor.Orange] = 160,
        [TierColor.Gold] = 320,
    };

    // How often wages are due.
    public static double WagePaymentIntervalHours { get; set; } = 24;

    // How long upkeep can go unpaid before a crew member departs.
    public static double UpkeepGracePeriodHours { get; set; } = 48;

    // How many unhired candidates sit in one planet's crew pool at once.
    public static int CrewPoolSizePerPlanet { get; set; } = 3;

    // How often a planet's crew pool re-rolls its candidates.
    public static double CrewPoolRefreshIntervalHours { get; set; } = 24;

    // Documented example range is "24-48 hours max credited"; using the
    // upper bound.
    public static double ElapsedTimeCapHours { get; set; } = 48;

    // Resolved design decision: flat 50% background/idle crafting rate,
    // not tier-scaled. 0.5 units/hour is the concrete number that
    // resolves to -- at ElapsedTimeCapHours (48h), a fully-idle crew
    // member completes 24 units. Nullable: null means "no background
    // production mechanism configured for this call" (kept for a future
    // crew type this doesn't apply to), distinct from any numeric rate.
    public static double? BackgroundIdleOutputRate { get; set; } = 0.5;

    // Tier 6-7 profession taxonomy (alpha content roster), mapped
    // one-to-one to the 4 ship component categories plus general
    // (non-component) tier 6-7 crafted goods.
    public static List<string> Tier67Professions { get; set; } = new()
    {
        "Weaponsmith",
        "Engineer",
        "Shield Technician",
        "Cargo Specialist",
        "Artisan",
    };
}
