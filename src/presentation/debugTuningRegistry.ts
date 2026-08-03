// Alpha Section 4 debug/tuning panel (docs/profitable-alpha-uiux-onboarding-plan.md
// §2). A declarative list of every Section 2 balance-tunable value --
// scalar constants promoted to `let`+setter, and per-tier table rows
// mutated in place -- see each constants file's own comment
// (tradingConfig.ts/crewConfig.ts/shipsAndTravelConfig.ts) for why that's
// safe: the underlying formulas never change, only whether the number
// behind them can move without a redeploy. DebugPanelScene.ts renders this
// list; this file owns no rendering, no Phaser objects -- just the rows
// and a captured-at-load snapshot for "reset to defaults."
import * as trading from "../data/constants/tradingConfig.ts";
import * as crew from "../data/constants/crewConfig.ts";
import * as ships from "../data/constants/shipsAndTravelConfig.ts";
import { TIER_COLOR_BREAKPOINTS } from "../data/constants/tierColor.ts";
import type { TierColor } from "../data/types/tierColor.ts";

export interface TuningRow {
  label: string;
  get(): number;
  set(value: number): void;
  step: number;
  // Display precision -- purely cosmetic, never affects the stored value.
  decimals: number;
}

export interface TuningSection {
  title: string;
  rows: TuningRow[];
}

// All 7 tiers in Grey->Gold order, reused for every per-tier table below
// rather than hardcoding the list again.
const TIERS: readonly TierColor[] = TIER_COLOR_BREAKPOINTS.map((b) => b.tier);

function perTierRows(
  labelPrefix: string,
  get: (tier: TierColor) => number,
  set: (tier: TierColor, value: number) => void,
  step: number,
  decimals = 0,
): TuningRow[] {
  return TIERS.map((tier) => ({
    label: `${labelPrefix} — ${tier}`,
    get: () => get(tier),
    set: (value: number) => set(tier, value),
    step,
    decimals,
  }));
}

function row(label: string, get: () => number, set: (value: number) => void, step: number, decimals = 0): TuningRow {
  return { label, get, set, step, decimals };
}

export const TUNING_SECTIONS: TuningSection[] = [
  {
    title: "Trading",
    rows: [
      row("Listing expiry (h)", () => trading.LISTING_EXPIRY_HOURS, trading.setListingExpiryHours, 1),
      row("Baseline drift %/unit", () => trading.BASELINE_DRIFT_PERCENT, trading.setBaselineDriftPercent, 0.005, 3),
      row("Price floor %", () => trading.PRICE_FLOOR_PERCENT, trading.setPriceFloorPercent, 0.05, 2),
      row("Price ceiling %", () => trading.PRICE_CEILING_PERCENT, trading.setPriceCeilingPercent, 0.05, 2),
      row(
        "Price recovery %/hour",
        () => trading.PRICE_RECOVERY_PERCENT_PER_HOUR,
        trading.setPriceRecoveryPercentPerHour,
        0.005,
        3,
      ),
      row(
        "Global market markup %",
        () => trading.GLOBAL_MARKET_MARKUP_PERCENT,
        trading.setGlobalMarketMarkupPercent,
        0.01,
        2,
      ),
      row(
        "Global market discount %",
        () => trading.GLOBAL_MARKET_DISCOUNT_PERCENT,
        trading.setGlobalMarketDiscountPercent,
        0.01,
        2,
      ),
      row("Transaction fee %", () => trading.TRANSACTION_FEE_PERCENT, trading.setTransactionFeePercent, 0.01, 2),
      row("Season cycle (h)", () => trading.SEASON_CYCLE_HOURS, trading.setSeasonCycleHours, 1),
      row(
        "Season price swing %",
        () => trading.SEASON_PRICE_SWING_PERCENT,
        trading.setSeasonPriceSwingPercent,
        0.01,
        2,
      ),
      row(
        "Emergency check interval (h)",
        () => trading.EMERGENCY_CHECK_INTERVAL_HOURS,
        trading.setEmergencyCheckIntervalHours,
        1,
      ),
      row(
        "Emergency trigger chance",
        () => trading.EMERGENCY_TRIGGER_CHANCE,
        trading.setEmergencyTriggerChance,
        0.01,
        2,
      ),
      row("Emergency duration (h)", () => trading.EMERGENCY_DURATION_HOURS, trading.setEmergencyDurationHours, 1),
      row(
        "Emergency price premium %",
        () => trading.EMERGENCY_PRICE_PREMIUM_PERCENT,
        trading.setEmergencyPricePremiumPercent,
        0.01,
        2,
      ),
    ],
  },
  {
    title: "Crew",
    rows: [
      row("Base crew capacity", () => crew.BASE_CREW_CAPACITY, crew.setBaseCrewCapacity, 1),
      row(
        "Capacity expansion base cost",
        () => crew.CREW_CAPACITY_EXPANSION_BASE_COST,
        crew.setCrewCapacityExpansionBaseCost,
        50,
      ),
      row(
        "Capacity expansion cost x",
        () => crew.CREW_CAPACITY_EXPANSION_COST_MULTIPLIER,
        crew.setCrewCapacityExpansionCostMultiplier,
        0.1,
        1,
      ),
      row("Wage payment interval (h)", () => crew.WAGE_PAYMENT_INTERVAL_HOURS, crew.setWagePaymentIntervalHours, 1),
      row("Upkeep grace period (h)", () => crew.UPKEEP_GRACE_PERIOD_HOURS, crew.setUpkeepGracePeriodHours, 1),
      row("Crew pool size/planet", () => crew.CREW_POOL_SIZE_PER_PLANET, crew.setCrewPoolSizePerPlanet, 1),
      row(
        "Crew pool refresh (h)",
        () => crew.CREW_POOL_REFRESH_INTERVAL_HOURS,
        crew.setCrewPoolRefreshIntervalHours,
        1,
      ),
      row("Elapsed time cap (h)", () => crew.ELAPSED_TIME_CAP_HOURS, crew.setElapsedTimeCapHours, 1),
      row(
        "Background idle output rate/h",
        () => crew.BACKGROUND_IDLE_OUTPUT_RATE ?? 0,
        crew.setBackgroundIdleOutputRate,
        0.05,
        2,
      ),
      ...perTierRows(
        "Crew hire cost",
        (tier) => crew.CREW_HIRE_COST_BY_TIER.find((e) => e.tier === tier)?.cost ?? 0,
        crew.setCrewHireCostForTier,
        10,
      ),
      ...perTierRows(
        "Crew wage",
        (tier) => crew.CREW_WAGE_BY_TIER.find((e) => e.tier === tier)?.wage ?? 0,
        crew.setCrewWageForTier,
        5,
      ),
    ],
  },
  {
    title: "Ships & Travel",
    rows: [
      row(
        "Distance -> travel hours/unit",
        () => ships.DISTANCE_TO_TRAVEL_HOURS_PER_UNIT,
        ships.setDistanceToTravelHoursPerUnit,
        0.001,
        3,
      ),
      row(
        "Shipyard pool size/planet",
        () => ships.SHIPYARD_POOL_SIZE_PER_PLANET,
        ships.setShipyardPoolSizePerPlanet,
        1,
      ),
      row(
        "Shipyard pool refresh (h)",
        () => ships.SHIPYARD_POOL_REFRESH_INTERVAL_HOURS,
        ships.setShipyardPoolRefreshIntervalHours,
        1,
      ),
      ...perTierRows(
        "Ship speed multiplier",
        (tier) => ships.SHIP_TIER_SPEED_MODIFIER.find((e) => e.tier === tier)?.travelTimeMultiplier ?? 0,
        ships.setShipTierSpeedModifierForTier,
        0.01,
        2,
      ),
      ...perTierRows(
        "Ship purchase cost",
        (tier) => ships.SHIP_PURCHASE_COST_BY_TIER.find((e) => e.tier === tier)?.cost ?? 0,
        ships.setShipPurchaseCostForTier,
        50,
      ),
    ],
  },
  {
    title: "Scanner",
    rows: [
      row(
        "Scanner pool size/planet",
        () => ships.SCANNER_POOL_SIZE_PER_PLANET,
        ships.setScannerPoolSizePerPlanet,
        1,
      ),
      row(
        "Scanner pool refresh (h)",
        () => ships.SCANNER_POOL_REFRESH_INTERVAL_HOURS,
        ships.setScannerPoolRefreshIntervalHours,
        1,
      ),
      row("Scanner base radius", () => ships.SCANNER_BASE_SCAN_RADIUS, ships.setScannerBaseScanRadius, 10),
      ...perTierRows(
        "Scanner purchase cost",
        (tier) => ships.SCANNER_PURCHASE_COST_BY_TIER.find((e) => e.tier === tier)?.cost ?? 0,
        ships.setScannerPurchaseCostForTier,
        100,
      ),
      ...perTierRows(
        "Scanner radius bonus",
        (tier) => ships.SCANNER_TIER_RADIUS_BONUS.find((e) => e.tier === tier)?.radiusBonus ?? 0,
        ships.setScannerTierRadiusBonusForTier,
        10,
      ),
    ],
  },
  {
    title: "Travel Encounters",
    rows: [
      row(
        "Encounter check window (h)",
        () => ships.ENCOUNTER_CHECK_WINDOW_HOURS,
        ships.setEncounterCheckWindowHours,
        1,
      ),
      row("Encounter trigger chance", () => ships.ENCOUNTER_TRIGGER_CHANCE, ships.setEncounterTriggerChance, 0.01, 2),
      row(
        "Type weight — tradeOpportunity",
        () => ships.ENCOUNTER_TYPE_WEIGHTS.tradeOpportunity,
        (v) => ships.setEncounterTypeWeight("tradeOpportunity", v),
        0.01,
        2,
      ),
      row(
        "Type weight — discovery",
        () => ships.ENCOUNTER_TYPE_WEIGHTS.discovery,
        (v) => ships.setEncounterTypeWeight("discovery", v),
        0.01,
        2,
      ),
      row(
        "Type weight — hazard",
        () => ships.ENCOUNTER_TYPE_WEIGHTS.hazard,
        (v) => ships.setEncounterTypeWeight("hazard", v),
        0.01,
        2,
      ),
      row(
        "Type weight — combat",
        () => ships.ENCOUNTER_TYPE_WEIGHTS.combat,
        (v) => ships.setEncounterTypeWeight("combat", v),
        0.01,
        2,
      ),
      row(
        "Trade opportunity min Cr",
        () => ships.ENCOUNTER_TRADE_OPPORTUNITY_MIN_CREDITS,
        ships.setEncounterTradeOpportunityMinCredits,
        10,
      ),
      row(
        "Trade opportunity max Cr",
        () => ships.ENCOUNTER_TRADE_OPPORTUNITY_MAX_CREDITS,
        ships.setEncounterTradeOpportunityMaxCredits,
        10,
      ),
      row("Hazard pass threshold", () => ships.HAZARD_PASS_THRESHOLD, ships.setHazardPassThreshold, 1),
      row("Hazard base failure cost", () => ships.HAZARD_BASE_FAILURE_COST, ships.setHazardBaseFailureCost, 10),
      ...perTierRows(
        "Hazard ship tier bonus",
        (tier) => ships.HAZARD_SHIP_TIER_MODIFIER.find((e) => e.tier === tier)?.rollBonus ?? 0,
        ships.setHazardShipTierModifierForTier,
        1,
      ),
      ...ships.HAZARD_FAILURE_COST_CURVE.map(
        (band, index): TuningRow => ({
          label: `Hazard cost x — ${band.minPointsBelow}-${band.maxPointsBelow ?? "+"} pts below`,
          get: () => ships.HAZARD_FAILURE_COST_CURVE[index]!.costMultiplier,
          set: (v) => ships.setHazardFailureCostMultiplierAt(index, v),
          step: 0.5,
          decimals: 1,
        }),
      ),
    ],
  },
  {
    title: "Combat",
    rows: [
      row(
        "Arrival combat check chance",
        () => ships.ARRIVAL_COMBAT_CHECK_CHANCE,
        ships.setArrivalCombatCheckChance,
        0.01,
        2,
      ),
      row(
        "Component durability damage %",
        () => ships.COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT,
        ships.setCombatComponentDurabilityDamagePercent,
        0.01,
        2,
      ),
      row(
        "Crew unavailable duration (h)",
        () => ships.COMBAT_CREW_UNAVAILABLE_DURATION_HOURS,
        ships.setCombatCrewUnavailableDurationHours,
        1,
      ),
    ],
  },
];

// Captured once, at module load (app boot) -- before any panel interaction
// can possibly have mutated anything -- so "Reset to Alpha Defaults" always
// restores the values this session actually started with, not some
// hardcoded re-guess.
const DEFAULT_SNAPSHOT: number[] = TUNING_SECTIONS.flatMap((section) => section.rows.map((r) => r.get()));

export function resetAllTuningToDefaults(): void {
  let index = 0;
  for (const section of TUNING_SECTIONS) {
    for (const r of section.rows) {
      r.set(DEFAULT_SNAPSHOT[index]!);
      index++;
    }
  }
}
