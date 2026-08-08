using Profitable.Core.Schema;

namespace Profitable.Core.Constants;

// Ports src/data/constants/shipsAndTravelConfig.ts. Same mutable-property/
// mutable-Dictionary idiom TradingConfig/CrewConfig already established:
// a C# property or Dictionary is already directly settable, so no paired
// SetX()-style wrapper method is needed the way the TypeScript source's
// live-module-binding limitation requires one.
public sealed class HazardFailureCostBand
{
    public int MinPointsBelow { get; init; }
    public int? MaxPointsBelow { get; init; }
    public double CostMultiplier { get; set; }
}

public sealed class CrewSlotsByTierEntry
{
    public int Pilot { get; init; }
    public int CombatEngineerOrScienceOfficer { get; init; }
    public int SystemsEngineer { get; init; }
    public int Crafter { get; init; }
}

public static class ShipsAndTravelConfig
{
    // Converts raw Euclidean distance into a base travel time, in hours,
    // before the ship-tier speed modifier is applied.
    public static double DistanceToTravelHoursPerUnit { get; set; } = 0.01;

    // Ship tier's travel-time multiplier, applied on top of the base
    // distance-derived travel time. Monotonically decreasing by tier.
    public static Dictionary<TierColor, double> ShipTierSpeedModifier { get; } = new()
    {
        [TierColor.Grey] = 1.0,
        [TierColor.White] = 0.95,
        [TierColor.Green] = 0.9,
        [TierColor.Blue] = 0.82,
        [TierColor.Purple] = 0.72,
        [TierColor.Orange] = 0.6,
        [TierColor.Gold] = 0.45,
    };

    public static int ShipyardPoolSizePerPlanet { get; set; } = 3;
    public static double ShipyardPoolRefreshIntervalHours { get; set; } = 24;

    public static Dictionary<TierColor, double> ShipPurchaseCostByTier { get; } = new()
    {
        [TierColor.Grey] = 300,
        [TierColor.White] = 600,
        [TierColor.Green] = 1200,
        [TierColor.Blue] = 2200,
        [TierColor.Purple] = 3800,
        [TierColor.Orange] = 6000,
        [TierColor.Gold] = 9000,
    };

    public static double EncounterCheckWindowHours { get; set; } = 24;
    public static double EncounterTriggerChance { get; set; } = 0.2;

    // Weighted random split when a window's roll triggers an encounter.
    // Weights sum to 1.
    public static Dictionary<EncounterType, double> EncounterTypeWeights { get; } = new()
    {
        [EncounterType.TradeOpportunity] = 0.4,
        [EncounterType.Discovery] = 0.35,
        [EncounterType.Hazard] = 0.2,
        [EncounterType.Combat] = 0.05,
    };

    // Fixed declaration order used for the cumulative weighted-type roll
    // -- arbitrary but must stay stable, since it's part of what makes a
    // given random() sequence reproducible. Combat is appended at the
    // end, not interleaved, matching the TypeScript source's own ordering
    // exactly (this is what keeps a recorded random sequence landing in
    // the same bucket across languages).
    public static readonly IReadOnlyList<EncounterType> EncounterTypeOrder = new[]
    {
        EncounterType.TradeOpportunity, EncounterType.Discovery, EncounterType.Hazard, EncounterType.Combat,
    };

    // Arrival-triggered combat check chance -- a one-time check per
    // arrival, a separate probability from the travel-window roll.
    public static double ArrivalCombatCheckChance { get; set; } = 0.1;

    // Component durability damage percentage on a combat loss.
    public static double CombatComponentDurabilityDamagePercent { get; set; } = 0.15;

    // Crew unavailableUntil duration on a combat loss.
    public static double CombatCrewUnavailableDurationHours { get; set; } = 24;

    public static double EncounterTradeOpportunityMinCredits { get; set; } = 50;
    public static double EncounterTradeOpportunityMaxCredits { get; set; } = 200;

    // Hazard: roll 1-100 against this fixed pass threshold, modified
    // additively by the voyage's ship's derived tier via
    // HazardShipTierModifier (need roll + rollBonus >= HazardPassThreshold
    // to pass).
    public static double HazardPassThreshold { get; set; } = 50;

    public static Dictionary<TierColor, double> HazardShipTierModifier { get; } = new()
    {
        [TierColor.Grey] = 0,
        [TierColor.White] = 5,
        [TierColor.Green] = 10,
        [TierColor.Blue] = 15,
        [TierColor.Purple] = 20,
        [TierColor.Orange] = 25,
        [TierColor.Gold] = 30,
    };

    public static double HazardBaseFailureCost { get; set; } = 50;

    // Indexed by band position (0-4, matching declaration order), same
    // as the TypeScript source's own array -- MinPointsBelow/
    // MaxPointsBelow are the band's identity, not something that should
    // drift out of the escalating order the curve depends on.
    public static List<HazardFailureCostBand> HazardFailureCostCurve { get; } = new()
    {
        new HazardFailureCostBand { MinPointsBelow = 1, MaxPointsBelow = 10, CostMultiplier = 1.0 },
        new HazardFailureCostBand { MinPointsBelow = 11, MaxPointsBelow = 20, CostMultiplier = 2.0 },
        new HazardFailureCostBand { MinPointsBelow = 21, MaxPointsBelow = 30, CostMultiplier = 4.0 },
        new HazardFailureCostBand { MinPointsBelow = 31, MaxPointsBelow = 40, CostMultiplier = 7.0 },
        new HazardFailureCostBand { MinPointsBelow = 41, MaxPointsBelow = null, CostMultiplier = 10.0 },
    };

    public static int ScannerPoolSizePerPlanet { get; set; } = 2;
    public static double ScannerPoolRefreshIntervalHours { get; set; } = 48;

    public static Dictionary<TierColor, double> ScannerPurchaseCostByTier { get; } = new()
    {
        [TierColor.Grey] = 200,
        [TierColor.White] = 400,
        [TierColor.Green] = 800,
        [TierColor.Blue] = 1600,
        [TierColor.Purple] = 3200,
        [TierColor.Orange] = 6400,
        [TierColor.Gold] = 12800,
    };

    public static double ScannerBaseScanRadius { get; set; } = 120;

    public static Dictionary<TierColor, double> ScannerTierRadiusBonus { get; } = new()
    {
        [TierColor.Grey] = 0,
        [TierColor.White] = 40,
        [TierColor.Green] = 80,
        [TierColor.Blue] = 130,
        [TierColor.Purple] = 190,
        [TierColor.Orange] = 260,
        [TierColor.Gold] = 350,
    };

    // Ship Fuel amendment. Grey 50 up to Gold 190 -- retuned so a low/mid
    // -tier ship cannot always reach the galaxy's single worst-case route
    // (~85 fuel at the ~2,828-unit max diagonal) in one hop, while Blue
    // and above always can.
    public static Dictionary<TierColor, double> FuelCapacityByTier { get; } = new()
    {
        [TierColor.Grey] = 50,
        [TierColor.White] = 65,
        [TierColor.Green] = 80,
        [TierColor.Blue] = 100,
        [TierColor.Purple] = 125,
        [TierColor.Orange] = 155,
        [TierColor.Gold] = 190,
    };

    // Deliberately not tier-modified -- tier's fuel-relevant effect is
    // capacity, not efficiency.
    public static double FuelCostPerDistanceUnit { get; set; } = 0.03;
    public static double RefuelCostPerUnit { get; set; } = 2;

    // Constrains Voyage.Cargo only, not general inventory.
    public static Dictionary<TierColor, double> CargoHoldCapacityByTier { get; } = new()
    {
        [TierColor.Grey] = 5,
        [TierColor.White] = 8,
        [TierColor.Green] = 12,
        [TierColor.Blue] = 18,
        [TierColor.Purple] = 25,
        [TierColor.Orange] = 35,
        [TierColor.Gold] = 50,
    };

    // Ship Crew Roles amendment. CombatEngineerOrScienceOfficer is a
    // single COMBINED pool shared between the two roles, not two
    // independent per-role caps.
    public static Dictionary<TierColor, CrewSlotsByTierEntry> CrewSlotsByTier { get; } = new()
    {
        [TierColor.Grey] = new CrewSlotsByTierEntry { Pilot = 1, CombatEngineerOrScienceOfficer = 1, SystemsEngineer = 1, Crafter = 1 },
        [TierColor.White] = new CrewSlotsByTierEntry { Pilot = 1, CombatEngineerOrScienceOfficer = 1, SystemsEngineer = 1, Crafter = 1 },
        [TierColor.Green] = new CrewSlotsByTierEntry { Pilot = 1, CombatEngineerOrScienceOfficer = 1, SystemsEngineer = 1, Crafter = 2 },
        [TierColor.Blue] = new CrewSlotsByTierEntry { Pilot = 1, CombatEngineerOrScienceOfficer = 2, SystemsEngineer = 1, Crafter = 2 },
        [TierColor.Purple] = new CrewSlotsByTierEntry { Pilot = 2, CombatEngineerOrScienceOfficer = 2, SystemsEngineer = 1, Crafter = 2 },
        [TierColor.Orange] = new CrewSlotsByTierEntry { Pilot = 2, CombatEngineerOrScienceOfficer = 2, SystemsEngineer = 2, Crafter = 2 },
        [TierColor.Gold] = new CrewSlotsByTierEntry { Pilot = 2, CombatEngineerOrScienceOfficer = 2, SystemsEngineer = 2, Crafter = 3 },
    };

    // Role-effect magnitudes, all originated defaults/tunables.
    public static Dictionary<TierColor, double> PilotSpeedBonusByTier { get; } = new()
    {
        [TierColor.Grey] = 1.0,
        [TierColor.White] = 0.98,
        [TierColor.Green] = 0.96,
        [TierColor.Blue] = 0.94,
        [TierColor.Purple] = 0.93,
        [TierColor.Orange] = 0.91,
        [TierColor.Gold] = 0.9,
    };

    // Combat Engineer: reduces the loss-outcome mitigation constants by
    // this fraction on a loss -- mitigation only, never the win/lose roll.
    public static Dictionary<TierColor, double> CombatEngineerMitigationByTier { get; } = new()
    {
        [TierColor.Grey] = 0.05,
        [TierColor.White] = 0.1,
        [TierColor.Green] = 0.15,
        [TierColor.Blue] = 0.2,
        [TierColor.Purple] = 0.3,
        [TierColor.Orange] = 0.4,
        [TierColor.Gold] = 0.5,
    };

    // Science Officer: an additional scan-radius bonus stacking with
    // ScannerTierRadiusBonus, keyed off the crew member's own tier.
    public static Dictionary<TierColor, double> ScienceOfficerRadiusBonusByTier { get; } = new()
    {
        [TierColor.Grey] = 10,
        [TierColor.White] = 20,
        [TierColor.Green] = 35,
        [TierColor.Blue] = 55,
        [TierColor.Purple] = 80,
        [TierColor.Orange] = 110,
        [TierColor.Gold] = 150,
    };

    // Crafter (Artisan only): a material-quantity discount on general
    // (non-component) recipes, applied entirely upstream of Crafter.Craft
    // in presentation -- not consumed by any Sub-Phase D function, ported
    // here only because it lives in the same source constants file.
    public static Dictionary<TierColor, double> ArtisanMaterialDiscountByTier { get; } = new()
    {
        [TierColor.Grey] = 0.05,
        [TierColor.White] = 0.1,
        [TierColor.Green] = 0.15,
        [TierColor.Blue] = 0.2,
        [TierColor.Purple] = 0.25,
        [TierColor.Orange] = 0.3,
        [TierColor.Gold] = 0.35,
    };

    // ResolveComponentRepair()'s resolved Systems Engineer / Crafter
    // interaction. Durability points restored per elapsed hour, keyed by
    // the Systems Engineer crew member's own tier.
    public static Dictionary<TierColor, double> SystemsEngineerRepairRateByTier { get; } = new()
    {
        [TierColor.Grey] = 0.5,
        [TierColor.White] = 0.75,
        [TierColor.Green] = 1,
        [TierColor.Blue] = 1.5,
        [TierColor.Purple] = 2,
        [TierColor.Orange] = 2.5,
        [TierColor.Gold] = 3,
    };

    // Same shape, deliberately smaller magnitude than Systems Engineer's
    // own per-tier rate -- only accrues while ActiveVoyage is not null.
    public static Dictionary<TierColor, double> CrafterRepairRateByTier { get; } = new()
    {
        [TierColor.Grey] = 0.25,
        [TierColor.White] = 0.4,
        [TierColor.Green] = 0.55,
        [TierColor.Blue] = 0.75,
        [TierColor.Purple] = 1,
        [TierColor.Orange] = 1.25,
        [TierColor.Gold] = 1.5,
    };

    // Retroactive removal (2026-08-04): CitadelLevel2RepairRate/
    // CitadelLevel3RepairRate removed along with Citadels -- see
    // planet-ownership.md's own retroactive note for the full account.
    // Systems Engineer/Crafter repair rates above are unaffected.

    // A new, independent cap constant for ResolveComponentRepair's own
    // elapsed-time window -- deliberately not a reuse of Crew's
    // ElapsedTimeCapHours, so the two catch-up windows can be tuned
    // independently even though they share the same "cap the elapsed
    // hours" shape.
    public static double RepairElapsedTimeCapHours { get; set; } = 48;
}
