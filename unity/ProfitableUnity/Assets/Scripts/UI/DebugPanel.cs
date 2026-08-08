#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Unity.DebugTools;
using UnityEngine;

namespace Profitable.Unity.UI
{
    // Ports src/presentation/scenes/DebugPanelScene.ts +
    // src/presentation/debugTuningRegistry.ts. "A simple, ugly-is-fine
    // panel exposing the tunable values... for live adjustment during a
    // play session" (docs/profitable-alpha-uiux-onboarding-plan.md §2),
    // same Alpha Section 4 scope the TypeScript panel implements.
    // Presentation-layer only: every row this panel touches is a real
    // mutable property/Dictionary entry already declared in
    // ProfitableCore/Constants/ -- no formula/logic is duplicated or
    // reimplemented here.
    //
    // Only ever constructed/reachable when DebugGate.IsEnabled -- see
    // that class and MvpLoopBootstrap.cs's own nav-button wiring for the
    // gate. This class itself has no gating logic of its own, same
    // division of responsibility as nav.ts (renders the entry only when
    // isDebugModeEnabled()) vs DebugPanelScene.ts (assumes it's already
    // reachable only when allowed).
    public class DebugPanel
    {
        public GameObject Root { get; }

        private readonly Action<string> _log;
        private readonly RectTransform _sectionsGroup;

        private static readonly TierColor[] AllTiers =
        {
            TierColor.Grey, TierColor.White, TierColor.Green, TierColor.Blue,
            TierColor.Purple, TierColor.Orange, TierColor.Gold,
        };

        private static readonly (EncounterType Type, string Label)[] ForceEncounterTypes =
        {
            (EncounterType.TradeOpportunity, "Trade Opportunity"),
            (EncounterType.Discovery, "Discovery"),
            (EncounterType.Hazard, "Hazard"),
            (EncounterType.Combat, "Combat"),
        };

        private sealed class TuningRow
        {
            public string Label = "";
            public Func<double> Get = () => 0;
            public Action<double> Set = _ => { };
            public double Step;
            public int Decimals;
        }

        private sealed class TuningSection
        {
            public string Title = "";
            public List<TuningRow> Rows = new();
        }

        private readonly List<TuningSection> _sections;

        // Captured once, at panel construction (app boot) -- before any
        // panel interaction can possibly have mutated anything -- so
        // "Reset to Alpha Defaults" always restores the values this
        // session actually started with. Mirrors
        // debugTuningRegistry.ts's own DEFAULT_SNAPSHOT.
        private readonly Dictionary<TuningRow, double> _defaultSnapshot = new();

        public DebugPanel(Transform parent, Action<string> log)
        {
            _log = log;
            _sections = BuildSections();
            foreach (var section in _sections)
            {
                foreach (var tuningRow in section.Rows)
                {
                    _defaultSnapshot[tuningRow] = tuningRow.Get();
                }
            }

            var group = UiFactory.CreateVerticalGroup(parent, "DebugPanel");
            Root = group.gameObject;

            UiFactory.CreateText(group, "Debug / Tuning Panel (debug build only)", 20);

            var forceEncounterGroup = UiFactory.CreateVerticalGroup(group, "ForceEncounter");
            UiFactory.CreateText(forceEncounterGroup, "Force next voyage arrival to include an encounter:", 14);
            var forceEncounterRow = UiFactory.CreateHorizontalGroup(forceEncounterGroup, "ForceEncounterButtons");
            foreach (var (type, label) in ForceEncounterTypes)
            {
                UiFactory.CreateButton(forceEncounterRow, label, () => OnForceEncounter(type, label));
            }

            UiFactory.CreateButton(group, "Reset all tuning to alpha defaults", ResetAllToDefaults);

            _sectionsGroup = UiFactory.CreateVerticalGroup(group, "TuningSections");
            Refresh();
        }

        public void Refresh()
        {
            UiFactory.ClearChildren(_sectionsGroup);
            foreach (var section in _sections)
            {
                UiFactory.CreateText(_sectionsGroup, section.Title, 16);
                foreach (var tuningRow in section.Rows)
                {
                    var row = UiFactory.CreateHorizontalGroup(_sectionsGroup, $"Row_{section.Title}_{tuningRow.Label}");
                    UiFactory.CreateText(row, $"{tuningRow.Label}: {FormatValue(tuningRow)}", 12);
                    UiFactory.CreateButton(row, $"- {tuningRow.Label}", () => Adjust(tuningRow, -tuningRow.Step));
                    UiFactory.CreateButton(row, $"+ {tuningRow.Label}", () => Adjust(tuningRow, tuningRow.Step));
                }
            }
        }

        private static string FormatValue(TuningRow tuningRow) => tuningRow.Get().ToString($"F{tuningRow.Decimals}");

        // Mirrors the +/- buttons -- private since TuningRow itself is a
        // private nested type. Tests exercise this the same way
        // ShipCrewRolesPanelClickThroughTest.cs's own Click() helper
        // does: find the real Button by its GameObject name
        // (Button_{label}) and invoke its real onClick, not by calling
        // this method directly.
        private void Adjust(TuningRow tuningRow, double delta)
        {
            tuningRow.Set(tuningRow.Get() + delta);
            Refresh();
        }

        public void ResetAllToDefaults()
        {
            foreach (var (tuningRow, defaultValue) in _defaultSnapshot)
            {
                tuningRow.Set(defaultValue);
            }
            _log("All tuning values reset to alpha defaults.");
            Refresh();
        }

        // Sets a one-shot flag ShipsPanel.ResolveArrival() reads on its
        // next real ResolveArrival() call (DebugState). Does not itself
        // create any CombatEncounter/EncounterResult -- that only ever
        // happens through the real ResolveArrival()->ResolveEncounters()
        // path, same as a natural roll.
        private void OnForceEncounter(EncounterType type, string label)
        {
            DebugState.SetForcedEncounterType(type);
            _log($"Next resolved voyage arrival will force a \"{label}\" encounter. Initiate/resolve a voyage on Ships to trigger it.");
        }

        private static List<TuningRow> PerTierRows(
            string labelPrefix,
            Func<TierColor, double> get,
            Action<TierColor, double> set,
            double step,
            int decimals = 0)
        {
            return AllTiers
                .Select(tier => new TuningRow
                {
                    Label = $"{labelPrefix} — {tier}",
                    Get = () => get(tier),
                    Set = value => set(tier, value),
                    Step = step,
                    Decimals = decimals,
                })
                .ToList();
        }

        private static TuningRow Row(string label, Func<double> get, Action<double> set, double step, int decimals = 0) =>
            new() { Label = label, Get = get, Set = set, Step = step, Decimals = decimals };

        // CrewSlotsByTier's entries have `init`-only fields (a real,
        // whole-entry replacement, not a per-field setter) -- each of the
        // 4 role-capacity fields still needs its own row/stepper, so this
        // reads the current entry, patches just the one field the row
        // owns, and writes a new entry back. Mirrors
        // debugTuningRegistry.ts's crewSlotRows() exactly.
        private static List<TuningRow> CrewSlotRows()
        {
            var fields = new (string Key, string Label)[]
            {
                ("pilot", "Crew slots — Pilot"),
                ("combatEngineerOrScienceOfficer", "Crew slots — Combat Eng./Sci. Officer (combined pool)"),
                ("systemsEngineer", "Crew slots — Systems Engineer"),
                ("crafter", "Crew slots — Crafter"),
            };
            var rows = new List<TuningRow>();
            foreach (var (key, label) in fields)
            {
                rows.AddRange(PerTierRows(
                    label,
                    tier => GetCrewSlotField(tier, key),
                    (tier, value) => SetCrewSlotField(tier, key, value),
                    1));
            }
            return rows;
        }

        private static double GetCrewSlotField(TierColor tier, string key)
        {
            var entry = ShipsAndTravelConfig.CrewSlotsByTier[tier];
            return key switch
            {
                "pilot" => entry.Pilot,
                "combatEngineerOrScienceOfficer" => entry.CombatEngineerOrScienceOfficer,
                "systemsEngineer" => entry.SystemsEngineer,
                "crafter" => entry.Crafter,
                _ => 0,
            };
        }

        private static void SetCrewSlotField(TierColor tier, string key, double value)
        {
            var entry = ShipsAndTravelConfig.CrewSlotsByTier[tier];
            ShipsAndTravelConfig.CrewSlotsByTier[tier] = new CrewSlotsByTierEntry
            {
                Pilot = key == "pilot" ? (int)value : entry.Pilot,
                CombatEngineerOrScienceOfficer = key == "combatEngineerOrScienceOfficer" ? (int)value : entry.CombatEngineerOrScienceOfficer,
                SystemsEngineer = key == "systemsEngineer" ? (int)value : entry.SystemsEngineer,
                Crafter = key == "crafter" ? (int)value : entry.Crafter,
            };
        }

        private static List<TuningSection> BuildSections()
        {
            var sections = new List<TuningSection>
            {
                new()
                {
                    Title = "Trading",
                    Rows = new List<TuningRow>
                    {
                        Row("Listing expiry (h)", () => TradingConfig.ListingExpiryHours, v => TradingConfig.ListingExpiryHours = v, 1),
                        Row("Baseline drift %/unit", () => TradingConfig.BaselineDriftPercent, v => TradingConfig.BaselineDriftPercent = v, 0.005, 3),
                        Row("Price floor %", () => TradingConfig.PriceFloorPercent, v => TradingConfig.PriceFloorPercent = v, 0.05, 2),
                        Row("Price ceiling %", () => TradingConfig.PriceCeilingPercent, v => TradingConfig.PriceCeilingPercent = v, 0.05, 2),
                        Row("Price recovery %/hour", () => TradingConfig.PriceRecoveryPercentPerHour, v => TradingConfig.PriceRecoveryPercentPerHour = v, 0.005, 3),
                        Row("Global market markup %", () => TradingConfig.GlobalMarketMarkupPercent, v => TradingConfig.GlobalMarketMarkupPercent = v, 0.01, 2),
                        Row("Global market discount %", () => TradingConfig.GlobalMarketDiscountPercent, v => TradingConfig.GlobalMarketDiscountPercent = v, 0.01, 2),
                        Row("Transaction fee %", () => TradingConfig.TransactionFeePercent, v => TradingConfig.TransactionFeePercent = v, 0.01, 2),
                        Row("Season cycle (h)", () => TradingConfig.SeasonCycleHours, v => TradingConfig.SeasonCycleHours = v, 1),
                        Row("Season price swing %", () => TradingConfig.SeasonPriceSwingPercent, v => TradingConfig.SeasonPriceSwingPercent = v, 0.01, 2),
                        Row("Emergency check interval (h)", () => TradingConfig.EmergencyCheckIntervalHours, v => TradingConfig.EmergencyCheckIntervalHours = v, 1),
                        Row("Emergency trigger chance", () => TradingConfig.EmergencyTriggerChance, v => TradingConfig.EmergencyTriggerChance = v, 0.01, 2),
                        Row("Emergency duration (h)", () => TradingConfig.EmergencyDurationHours, v => TradingConfig.EmergencyDurationHours = v, 1),
                        Row("Emergency price premium %", () => TradingConfig.EmergencyPricePremiumPercent, v => TradingConfig.EmergencyPricePremiumPercent = v, 0.01, 2),
                    },
                },
                new()
                {
                    Title = "Crew",
                    Rows = new List<TuningRow>
                    {
                        Row("Base crew capacity", () => CrewConfig.BaseCrewCapacity, v => CrewConfig.BaseCrewCapacity = (int)v, 1),
                        Row("Capacity expansion base cost", () => CrewConfig.CrewCapacityExpansionBaseCost, v => CrewConfig.CrewCapacityExpansionBaseCost = v, 50),
                        Row("Capacity expansion cost x", () => CrewConfig.CrewCapacityExpansionCostMultiplier, v => CrewConfig.CrewCapacityExpansionCostMultiplier = v, 0.1, 1),
                        Row("Wage payment interval (h)", () => CrewConfig.WagePaymentIntervalHours, v => CrewConfig.WagePaymentIntervalHours = v, 1),
                        Row("Upkeep grace period (h)", () => CrewConfig.UpkeepGracePeriodHours, v => CrewConfig.UpkeepGracePeriodHours = v, 1),
                        Row("Crew pool size/planet", () => CrewConfig.CrewPoolSizePerPlanet, v => CrewConfig.CrewPoolSizePerPlanet = (int)v, 1),
                        Row("Crew pool refresh (h)", () => CrewConfig.CrewPoolRefreshIntervalHours, v => CrewConfig.CrewPoolRefreshIntervalHours = v, 1),
                        Row("Elapsed time cap (h)", () => CrewConfig.ElapsedTimeCapHours, v => CrewConfig.ElapsedTimeCapHours = v, 1),
                        Row("Background idle output rate/h", () => CrewConfig.BackgroundIdleOutputRate ?? 0, v => CrewConfig.BackgroundIdleOutputRate = v, 0.05, 2),
                    }
                        .Concat(PerTierRows("Crew hire cost", t => CrewConfig.CrewHireCostByTier[t], (t, v) => CrewConfig.CrewHireCostByTier[t] = v, 10))
                        .Concat(PerTierRows("Crew wage", t => CrewConfig.CrewWageByTier[t], (t, v) => CrewConfig.CrewWageByTier[t] = v, 5))
                        .ToList(),
                },
                new()
                {
                    Title = "Ships & Travel",
                    Rows = new List<TuningRow>
                    {
                        Row("Distance -> travel hours/unit", () => ShipsAndTravelConfig.DistanceToTravelHoursPerUnit, v => ShipsAndTravelConfig.DistanceToTravelHoursPerUnit = v, 0.001, 3),
                        Row("Shipyard pool size/planet", () => ShipsAndTravelConfig.ShipyardPoolSizePerPlanet, v => ShipsAndTravelConfig.ShipyardPoolSizePerPlanet = (int)v, 1),
                        Row("Shipyard pool refresh (h)", () => ShipsAndTravelConfig.ShipyardPoolRefreshIntervalHours, v => ShipsAndTravelConfig.ShipyardPoolRefreshIntervalHours = v, 1),
                    }
                        .Concat(PerTierRows("Ship speed multiplier", t => ShipsAndTravelConfig.ShipTierSpeedModifier[t], (t, v) => ShipsAndTravelConfig.ShipTierSpeedModifier[t] = v, 0.01, 2))
                        .Concat(PerTierRows("Ship purchase cost", t => ShipsAndTravelConfig.ShipPurchaseCostByTier[t], (t, v) => ShipsAndTravelConfig.ShipPurchaseCostByTier[t] = v, 50))
                        .Concat(PerTierRows("Fuel capacity", t => ShipsAndTravelConfig.FuelCapacityByTier[t], (t, v) => ShipsAndTravelConfig.FuelCapacityByTier[t] = v, 5))
                        .Append(Row("Fuel cost / distance unit", () => ShipsAndTravelConfig.FuelCostPerDistanceUnit, v => ShipsAndTravelConfig.FuelCostPerDistanceUnit = v, 0.005, 3))
                        .Append(Row("Refuel cost / unit", () => ShipsAndTravelConfig.RefuelCostPerUnit, v => ShipsAndTravelConfig.RefuelCostPerUnit = v, 0.5, 1))
                        .Concat(PerTierRows("Cargo hold capacity", t => ShipsAndTravelConfig.CargoHoldCapacityByTier[t], (t, v) => ShipsAndTravelConfig.CargoHoldCapacityByTier[t] = v, 1))
                        .Append(Row("Repair elapsed-time cap (h)", () => ShipsAndTravelConfig.RepairElapsedTimeCapHours, v => ShipsAndTravelConfig.RepairElapsedTimeCapHours = v, 1))
                        .ToList(),
                },
                new()
                {
                    Title = "Ship Crew Roles",
                    Rows = CrewSlotRows()
                        .Concat(PerTierRows("Pilot speed multiplier", t => ShipsAndTravelConfig.PilotSpeedBonusByTier[t], (t, v) => ShipsAndTravelConfig.PilotSpeedBonusByTier[t] = v, 0.01, 2))
                        .Concat(PerTierRows("Combat Engineer mitigation %", t => ShipsAndTravelConfig.CombatEngineerMitigationByTier[t], (t, v) => ShipsAndTravelConfig.CombatEngineerMitigationByTier[t] = v, 0.05, 2))
                        .Concat(PerTierRows("Science Officer radius bonus", t => ShipsAndTravelConfig.ScienceOfficerRadiusBonusByTier[t], (t, v) => ShipsAndTravelConfig.ScienceOfficerRadiusBonusByTier[t] = v, 5))
                        .Concat(PerTierRows("Artisan material discount %", t => ShipsAndTravelConfig.ArtisanMaterialDiscountByTier[t], (t, v) => ShipsAndTravelConfig.ArtisanMaterialDiscountByTier[t] = v, 0.05, 2))
                        .Concat(PerTierRows("Systems Engineer repair rate/h", t => ShipsAndTravelConfig.SystemsEngineerRepairRateByTier[t], (t, v) => ShipsAndTravelConfig.SystemsEngineerRepairRateByTier[t] = v, 0.25, 2))
                        .Concat(PerTierRows("Crafter repair rate/h", t => ShipsAndTravelConfig.CrafterRepairRateByTier[t], (t, v) => ShipsAndTravelConfig.CrafterRepairRateByTier[t] = v, 0.25, 2))
                        .ToList(),
                },
                new()
                {
                    Title = "Planet & Colonists",
                    Rows = new List<TuningRow>
                    {
                        Row("Colonist transport cost", () => PlanetOwnershipConstants.ColonistTransportCost, v => PlanetOwnershipConstants.ColonistTransportCost = v, 5),
                        Row("Minimum colonists to produce", () => PlanetOwnershipConstants.MinimumColonistsToProduce, v => PlanetOwnershipConstants.MinimumColonistsToProduce = (int)v, 1),
                        Row("Planet resource reset interval (h)", () => PlanetResourceCycleConstants.PlanetResourceResetIntervalHours, v => PlanetResourceCycleConstants.PlanetResourceResetIntervalHours = (int)v, 12),
                    }
                        .Concat(PerTierRows("Resource quantity cap / cycle", t => ResourceQuantityCapTable.ByTier[t], (t, v) => ResourceQuantityCapTable.ByTier[t] = (int)v, 5))
                        .ToList(),
                },
                new()
                {
                    Title = "Scanner",
                    Rows = new List<TuningRow>
                    {
                        Row("Scanner pool size/planet", () => ShipsAndTravelConfig.ScannerPoolSizePerPlanet, v => ShipsAndTravelConfig.ScannerPoolSizePerPlanet = (int)v, 1),
                        Row("Scanner pool refresh (h)", () => ShipsAndTravelConfig.ScannerPoolRefreshIntervalHours, v => ShipsAndTravelConfig.ScannerPoolRefreshIntervalHours = v, 1),
                        Row("Scanner base radius", () => ShipsAndTravelConfig.ScannerBaseScanRadius, v => ShipsAndTravelConfig.ScannerBaseScanRadius = v, 10),
                    }
                        .Concat(PerTierRows("Scanner purchase cost", t => ShipsAndTravelConfig.ScannerPurchaseCostByTier[t], (t, v) => ShipsAndTravelConfig.ScannerPurchaseCostByTier[t] = v, 100))
                        .Concat(PerTierRows("Scanner radius bonus", t => ShipsAndTravelConfig.ScannerTierRadiusBonus[t], (t, v) => ShipsAndTravelConfig.ScannerTierRadiusBonus[t] = v, 10))
                        .ToList(),
                },
                new()
                {
                    Title = "Travel Encounters",
                    Rows = new List<TuningRow>
                    {
                        Row("Encounter check window (h)", () => ShipsAndTravelConfig.EncounterCheckWindowHours, v => ShipsAndTravelConfig.EncounterCheckWindowHours = v, 1),
                        Row("Encounter trigger chance", () => ShipsAndTravelConfig.EncounterTriggerChance, v => ShipsAndTravelConfig.EncounterTriggerChance = v, 0.01, 2),
                        Row("Type weight — tradeOpportunity", () => ShipsAndTravelConfig.EncounterTypeWeights[EncounterType.TradeOpportunity], v => ShipsAndTravelConfig.EncounterTypeWeights[EncounterType.TradeOpportunity] = v, 0.01, 2),
                        Row("Type weight — discovery", () => ShipsAndTravelConfig.EncounterTypeWeights[EncounterType.Discovery], v => ShipsAndTravelConfig.EncounterTypeWeights[EncounterType.Discovery] = v, 0.01, 2),
                        Row("Type weight — hazard", () => ShipsAndTravelConfig.EncounterTypeWeights[EncounterType.Hazard], v => ShipsAndTravelConfig.EncounterTypeWeights[EncounterType.Hazard] = v, 0.01, 2),
                        Row("Type weight — combat", () => ShipsAndTravelConfig.EncounterTypeWeights[EncounterType.Combat], v => ShipsAndTravelConfig.EncounterTypeWeights[EncounterType.Combat] = v, 0.01, 2),
                        Row("Trade opportunity min Cr", () => ShipsAndTravelConfig.EncounterTradeOpportunityMinCredits, v => ShipsAndTravelConfig.EncounterTradeOpportunityMinCredits = v, 10),
                        Row("Trade opportunity max Cr", () => ShipsAndTravelConfig.EncounterTradeOpportunityMaxCredits, v => ShipsAndTravelConfig.EncounterTradeOpportunityMaxCredits = v, 10),
                        Row("Hazard pass threshold", () => ShipsAndTravelConfig.HazardPassThreshold, v => ShipsAndTravelConfig.HazardPassThreshold = v, 1),
                        Row("Hazard base failure cost", () => ShipsAndTravelConfig.HazardBaseFailureCost, v => ShipsAndTravelConfig.HazardBaseFailureCost = v, 10),
                    }
                        .Concat(PerTierRows("Hazard ship tier bonus", t => ShipsAndTravelConfig.HazardShipTierModifier[t], (t, v) => ShipsAndTravelConfig.HazardShipTierModifier[t] = v, 1))
                        .Concat(ShipsAndTravelConfig.HazardFailureCostCurve.Select((band, index) => new TuningRow
                        {
                            Label = $"Hazard cost x — {band.MinPointsBelow}-{(band.MaxPointsBelow.HasValue ? band.MaxPointsBelow.Value.ToString() : "+")} pts below",
                            Get = () => ShipsAndTravelConfig.HazardFailureCostCurve[index].CostMultiplier,
                            Set = v => ShipsAndTravelConfig.HazardFailureCostCurve[index].CostMultiplier = v,
                            Step = 0.5,
                            Decimals = 1,
                        }))
                        .ToList(),
                },
                new()
                {
                    Title = "Combat",
                    Rows = new List<TuningRow>
                    {
                        Row("Arrival combat check chance", () => ShipsAndTravelConfig.ArrivalCombatCheckChance, v => ShipsAndTravelConfig.ArrivalCombatCheckChance = v, 0.01, 2),
                        Row("Component durability damage %", () => ShipsAndTravelConfig.CombatComponentDurabilityDamagePercent, v => ShipsAndTravelConfig.CombatComponentDurabilityDamagePercent = v, 0.01, 2),
                        Row("Crew unavailable duration (h)", () => ShipsAndTravelConfig.CombatCrewUnavailableDurationHours, v => ShipsAndTravelConfig.CombatCrewUnavailableDurationHours = v, 1),
                    },
                },
            };

            return sections;
        }
    }
}
