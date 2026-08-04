import type { Voyage } from "../data/types/voyage.ts";
import type { Ship } from "../data/types/ship.ts";
import type { Planet } from "../data/types/planet.ts";
import type { Resource } from "../data/types/resource.ts";
import type { RandomFn } from "../data/types/random.ts";
import type { EncounterResult, EncounterType } from "../data/types/encounter.ts";
import type { CombatEncounter } from "../data/types/combatEncounter.ts";
import type { EncounterResolution } from "../data/types/encounterResolution.ts";
import { rollQuality } from "../simulation/rollQuality.ts";
import { initiateCombat } from "./initiateCombat.ts";
import {
  ENCOUNTER_CHECK_WINDOW_HOURS,
  ENCOUNTER_TRIGGER_CHANCE,
  ENCOUNTER_TYPE_WEIGHTS,
  ENCOUNTER_TRADE_OPPORTUNITY_MIN_CREDITS,
  ENCOUNTER_TRADE_OPPORTUNITY_MAX_CREDITS,
  HAZARD_PASS_THRESHOLD,
  HAZARD_SHIP_TIER_MODIFIER,
  HAZARD_BASE_FAILURE_COST,
  HAZARD_FAILURE_COST_CURVE,
} from "../data/constants/shipsAndTravelConfig.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

// Fixed declaration order used for the cumulative weighted-type roll --
// arbitrary but must stay stable, since it's part of what makes a given
// random() sequence reproducible. Combat GDD §2.2/§3: `combat` is
// appended at the end, not interleaved -- combined with
// ENCOUNTER_TYPE_WEIGHTS' own proportional-scaling choice (see that
// constant's comment), every existing hardcoded type-split roll value in
// tests/ships/resolveEncounters.test.ts (0 / 0.5 / 0.9) still lands in the
// same tradeOpportunity/discovery/hazard bucket it always did.
const TYPE_ORDER: readonly EncounterType[] = ["tradeOpportunity", "discovery", "hazard", "combat"];

function pickEncounterType(random: RandomFn): EncounterType {
  const roll = random();
  let cumulative = 0;
  for (const type of TYPE_ORDER) {
    cumulative += ENCOUNTER_TYPE_WEIGHTS[type];
    if (roll < cumulative) return type;
  }
  return TYPE_ORDER[TYPE_ORDER.length - 1]!; // floating-point fallback, weights sum to 1
}

function resolveTradeOpportunity(windowIndex: number, random: RandomFn): EncounterResult {
  const range = ENCOUNTER_TRADE_OPPORTUNITY_MAX_CREDITS - ENCOUNTER_TRADE_OPPORTUNITY_MIN_CREDITS;
  const creditsGranted = Math.round(ENCOUNTER_TRADE_OPPORTUNITY_MIN_CREDITS + random() * range);
  return { type: "tradeOpportunity", windowIndex, outcome: { creditsGranted } };
}

// Travel Encounters GDD §2.5: "Never sets discovered: true on a new planet
// remotely -- that would functionally reopen the closed 'no scanner'
// decision through a different door." This function only ever reads
// eligibleResources/destinationPlanet, never writes to either -- there is
// no code path here, or anywhere in this file, that touches
// Planet.discovered at all.
function resolveDiscovery(windowIndex: number, eligibleResources: Resource[], random: RandomFn): EncounterResult | null {
  if (eligibleResources.length === 0) return null;
  const resource = eligibleResources[Math.floor(random() * eligibleResources.length)]!;
  const qualities = rollQuality(resource, random);
  return { type: "discovery", windowIndex, outcome: { resourceId: resource.id, qualities } };
}

function resolveHazard(windowIndex: number, ship: Ship, random: RandomFn): EncounterResult {
  const tierBonus = HAZARD_SHIP_TIER_MODIFIER.find((entry) => entry.tier === ship.tier)?.rollBonus;
  if (tierBonus === undefined) {
    throw new RangeError(`no hazard tier modifier defined for tier ${ship.tier}`);
  }

  const roll = Math.floor(random() * 100) + 1;
  const effectiveRoll = roll + tierBonus;
  const passed = effectiveRoll >= HAZARD_PASS_THRESHOLD;

  if (passed) {
    return { type: "hazard", windowIndex, outcome: { passed: true, creditsLost: 0 } };
  }

  const pointsBelow = HAZARD_PASS_THRESHOLD - effectiveRoll;

  // Bug fix (same shape as getTierColor()'s/getPenaltyMultiplier()'s
  // boundary fix): HAZARD_FAILURE_COST_CURVE's min/maxPointsBelow are
  // integers (band {1,10} then {11,20}, etc.), but pointsBelow is only an
  // integer when HAZARD_SHIP_TIER_MODIFIER's rollBonus for the ship's
  // tier happens to be a whole number -- every tier's rollBonus is
  // currently whole (0/5/10/15/20/25/30), but the constant is typed
  // `number`, not an integer, so nothing stops a future tuning pass from
  // setting a fractional bonus. A value like 10.2 points below satisfied
  // neither `<= 10` nor `>= 11` under the old `pointsBelow <= max` check
  // and would throw, even though it's a real, in-range effective value.
  //
  // Unlike PENALTY_CURVE, there is no zero-width "no violation" band to
  // protect here -- resolveHazard's own `passed` check above already
  // guarantees pointsBelow is strictly positive whenever this lookup
  // runs, so the first band has no previous band to inherit a lower
  // bound from and needs its own explicit floor of "greater than 0"
  // (not its declared integer minPointsBelow) to close the same
  // below-band-0 fractional gap every other adjacent pair closes from
  // the high side via `< max + 1`.
  const band = HAZARD_FAILURE_COST_CURVE.find((entry, index) => {
    if (index === 0) {
      return pointsBelow > 0 && pointsBelow < entry.maxPointsBelow! + 1;
    }
    const previousBand = HAZARD_FAILURE_COST_CURVE[index - 1]!;
    return (
      pointsBelow > previousBand.maxPointsBelow! &&
      (entry.maxPointsBelow === null || pointsBelow < entry.maxPointsBelow + 1)
    );
  });
  if (!band) {
    throw new RangeError(`no hazard failure cost band defined for ${pointsBelow} points below threshold`);
  }

  const creditsLost = Math.round(HAZARD_BASE_FAILURE_COST * band.costMultiplier);
  return { type: "hazard", windowIndex, outcome: { passed: false, creditsLost } };
}

// Travel Encounters (Non-Combat) GDD §2. Necessary completion beyond the
// contract's own `resolveEncounters(voyage: Voyage)` pseudocode signature
// (same category of gap this project has closed repeatedly): resolving a
// hazard needs the voyage's ship (for its derived tier), resolving a
// discovery needs a real resource pool to roll against, and determinism
// needs an injectable RandomFn, same convention as every other random
// function in this codebase. `destinationPlanet` is GDD §2.5's own
// "noted-but-unresolved" choice -- resolved here as the destination
// (arriving somewhere new is what a discovery narratively represents),
// documented rather than silently picked.
//
// Never touches Wallet or player inventory directly, the same boundary
// resolveArrival() already holds for cargo/Listing activation: this
// function only *reports* what happened (creditsGranted/creditsLost/the
// rolled resource+qualities) via each EncounterResult's own outcome data.
// Applying those amounts to a real Wallet, or the rolled item to real
// inventory, is the caller's (Presentation's) job.
export function resolveEncounters(
  voyage: Voyage,
  ship: Ship,
  destinationPlanet: Planet,
  resources: Resource[],
  random: RandomFn = Math.random,
): EncounterResolution {
  // Combat GDD §2.6, Agent 20's own contract: "the one place
  // resolveEncounters()'s behavior changes" -- a retreat voyage never
  // rolls for encounters of any kind, a simple early-return guard rather
  // than a rewrite of anything below.
  if (voyage.isRetreat) return { encounters: [], pendingCombats: [] };

  const durationHours = (voyage.arrivesAt - voyage.departedAt) / MS_PER_HOUR;
  const windowCount = Math.max(1, Math.ceil(durationHours / ENCOUNTER_CHECK_WINDOW_HOURS));

  const eligibleResources = resources.filter((resource) => destinationPlanet.producibleResourceIds.includes(resource.id));

  const encounters: EncounterResult[] = [];
  const pendingCombats: CombatEncounter[] = [];
  for (let windowIndex = 0; windowIndex < windowCount; windowIndex++) {
    if (random() >= ENCOUNTER_TRIGGER_CHANCE) continue;

    const type = pickEncounterType(random);
    if (type === "tradeOpportunity") {
      encounters.push(resolveTradeOpportunity(windowIndex, random));
    } else if (type === "discovery") {
      const result = resolveDiscovery(windowIndex, eligibleResources, random);
      if (result) encounters.push(result);
    } else if (type === "hazard") {
      encounters.push(resolveHazard(windowIndex, ship, random));
    } else {
      // Combat GDD §1/§2.2: a combat roll does NOT resolve an outcome
      // here -- it only records a pending CombatEncounter (id derived
      // deterministically from the voyage + window, no hidden
      // ID-generation scheme) for the caller to present as a decision.
      pendingCombats.push(initiateCombat(`${voyage.id}-combat-w${windowIndex}`, voyage.id, "travel", windowIndex, random));
    }
  }

  return { encounters, pendingCombats };
}
