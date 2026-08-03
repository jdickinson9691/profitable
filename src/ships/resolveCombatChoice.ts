import type { CombatEncounter } from "../data/types/combatEncounter.ts";
import type { Voyage } from "../data/types/voyage.ts";
import type { Ship } from "../data/types/ship.ts";
import type { Planet } from "../data/types/planet.ts";
import type { CrewMember } from "../data/types/crewMember.ts";
import type { TierColor } from "../data/types/tierColor.ts";
import type { RandomFn } from "../data/types/random.ts";
import type { CombatResolution } from "../data/types/combatResolution.ts";
import { getTierVariance } from "../simulation/tierVariance.ts";
import { computeAggregateTier } from "../simulation/aggregateTier.ts";
import { clamp } from "../simulation/clamp.ts";
import { tierMidpoint } from "./deriveShipTier.ts";
import { assembleShip } from "./assembleShip.ts";
import { initiateVoyage } from "./initiateVoyage.ts";
import { QUALITY_MIN, QUALITY_MAX } from "../data/constants/quality.ts";
import {
  COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT,
  COMBAT_CREW_UNAVAILABLE_DURATION_HOURS,
  COMBAT_ENGINEER_MITIGATION_BY_TIER,
} from "../data/constants/shipsAndTravelConfig.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

// Ship Crew Roles amendment: an assigned crew member of the given role on
// this specific ship, or null if none -- shared by the Combat Engineer
// mitigation lookup and the Pilot speed bonus passed into the retreat
// voyage's own calculateTravelTime() call below. `ownedCrew` is the
// player's full roster (already this function's own parameter); only the
// entry actually assigned to *this* ship counts, same scoping as
// assignToShipRole()'s own capacity check.
function findAssignedCrew(ownedCrew: readonly CrewMember[], ship: Ship, role: CrewMember["shipRole"]): CrewMember | null {
  return ownedCrew.find((member) => member.assignedShipId === ship.id && member.shipRole === role) ?? null;
}

// Combat GDD §2.4: "both sides apply the existing percentage-based
// variance" -- reuses tierMidpoint() (deriveShipTier.ts's own tier-to-
// number conversion) and getTierVariance() (the same shared refiner/
// crafter/ship-tier table), never a combat-specific reimplementation of
// either.
function rollCombatValue(tier: TierColor, random: RandomFn): number {
  const variance = getTierVariance(tier);
  const varianceRoll = variance.negative + random() * (variance.positive - variance.negative);
  return tierMidpoint(tier) * (1 + varianceRoll);
}

// Combat GDD §2.3/§2.4/§2.5/§3, Agent 20's own contract:
// `resolveCombatChoice(combatEncounterId: string, choice): CombatResolution`.
// Necessary completion, same category as every other Agent 20 function --
// a pure function can't resolve "the combat encounter," "the player's
// ship," "which planets," or "which crew are owned" from bare IDs into an
// implicit store, so this takes the actual objects directly (the same
// resolution already applied to initiateVoyage()/resolveArrival()/
// assembleShip()). `originPlanet`/`currentPlanet` are the original
// voyage's origin/destination Planet objects respectively -- by the time
// this is called, `resolveArrival()` has already delivered the ship to
// `voyage.destinationPlanetId` (GDD §1: "the original voyage's
// arrival/delivery already completed normally... since combat's pending
// state never blocked the rest of arrival processing"), so the retreat
// voyage's origin is the *current* location and its destination is the
// original voyage's origin (the "last safe planet," GDD §2.5) --
// deliberately reversed from the original voyage's own origin/destination.
export function resolveCombatChoice(
  combatEncounter: CombatEncounter,
  choice: "attack" | "flee",
  voyage: Voyage,
  ship: Ship,
  originPlanet: Planet,
  currentPlanet: Planet,
  ownedCrew: readonly CrewMember[],
  currentTime: number,
  retreatVoyageId: string,
  random: RandomFn = Math.random,
): CombatResolution {
  // Not a normal business outcome (unlike win/lose/flee, all explicitly
  // decided by this GDD) -- resolving an already-resolved encounter, or
  // one that was never detected, is a caller/programming error, same
  // "throw, don't invent a rejection union the contract never asked for"
  // precedent as assembleShip()'s category-mismatch check.
  if (combatEncounter.status !== "pending") {
    throw new RangeError(`combat encounter ${combatEncounter.id} is not pending (status: ${combatEncounter.status})`);
  }

  // Ship Crew Roles amendment: assignedShipId doesn't change within this
  // function (only ship.components does, on a loss), so this is resolved
  // once and reused by both the flee branch and the lose branch's own
  // retreat voyage below.
  const pilot = findAssignedCrew(ownedCrew, ship, "Pilot");

  if (choice === "flee") {
    return {
      combatEncounter: { ...combatEncounter, status: "resolved", outcome: "flee" },
      updatedShip: ship,
      updatedCrewMember: null,
      // A retreat voyage never touches fuel/cargo (initiateVoyage()'s own
      // isRetreat skip) -- .updatedShip from that call is always identical
      // to the ship passed in, so only the voyage itself is used here.
      retreatVoyage: initiateVoyage(ship, currentPlanet, originPlanet, voyage.cargo, currentTime, retreatVoyageId, true, pilot).voyage,
    };
  }

  // choice === "attack". Necessary completion: no weapon installed is
  // treated as Grey, the same zero-components fallback deriveShipTier()
  // already established ("an unrated/incomplete ship... not a neutral
  // one") -- nothing in the GDD forbids combat triggering on a
  // weapon-less ship, and this keeps the function total rather than
  // throwing on a normal (if unarmed) game state.
  const weapon = ship.components.weapon;
  const playerTier = weapon?.tier ?? "Grey";

  // Order matters for determinism: player's roll first, then the
  // opponent's, per this agent's own contract's own bullet order.
  const playerValue = rollCombatValue(playerTier, random);
  const opponentValue = rollCombatValue(combatEncounter.opponentThreatTier, random);

  // "Higher value wins" -- ties favor the player, same >= convention
  // resolveHazard() already uses for its own pass/fail roll (landing
  // exactly on the threshold passes, it doesn't fail).
  const won = playerValue >= opponentValue;

  if (won) {
    return {
      combatEncounter: { ...combatEncounter, status: "resolved", outcome: "win" },
      updatedShip: ship,
      updatedCrewMember: null,
      retreatVoyage: null,
    };
  }

  // Ship Crew Roles amendment: an assigned Combat Engineer mitigates the
  // cost of a loss (never the win/lose roll itself, per the design
  // entry) -- reduces both loss-outcome constants by the same tier-scaled
  // fraction. No Combat Engineer assigned means no mitigation (0%), the
  // exact pre-amendment behavior.
  const combatEngineer = findAssignedCrew(ownedCrew, ship, "Combat Engineer");
  let mitigationPercent = 0;
  if (combatEngineer) {
    const entry = COMBAT_ENGINEER_MITIGATION_BY_TIER.find((e) => e.tier === combatEngineer.tier);
    if (!entry) throw new RangeError(`no combat engineer mitigation defined for tier ${combatEngineer.tier}`);
    mitigationPercent = entry.mitigationPercent;
  }

  // Lose: weapon durability damage + ship tier recompute, one random
  // owned crew member benched (if any owned), and a retreat voyage.
  let updatedShip = ship;
  if (weapon) {
    const currentDurability = weapon.qualities.durability;
    // Null stays null (never coerced to 0) -- same "not applicable, not
    // zero" convention every other quality-handling function in this
    // codebase already follows. A component with no durability rating
    // simply can't be damaged by this.
    if (currentDurability !== null) {
      const damagedDurability = clamp(
        Math.round(currentDurability * (1 - COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT * (1 - mitigationPercent))),
        QUALITY_MIN,
        QUALITY_MAX,
      );
      const damagedQualities = { ...weapon.qualities, durability: damagedDurability };
      const recomputedTier = computeAggregateTier(damagedQualities);
      if (recomputedTier === null) {
        // Structurally shouldn't happen -- every ShipComponent in this
        // codebase is generated with all 5 qualities populated
        // (refreshShipyardPool.ts), never all-null. Same "structurally
        // required" throw precedent as calculateTravelTime()'s position
        // check, not a normal rejection.
        throw new Error(`combat damage left weapon ${weapon.id} with no ratable qualities`);
      }
      const damagedWeapon = { ...weapon, qualities: damagedQualities, tier: recomputedTier };
      // Reuses assembleShip()'s own recompute pattern directly (per this
      // agent's own contract) -- installing the same category back into
      // its own slot is exactly what assembleShip() already does, tier
      // recompute included.
      updatedShip = assembleShip(ship, damagedWeapon, "weapon");
    }
  }

  let updatedCrewMember: CrewMember | null = null;
  if (ownedCrew.length > 0) {
    const chosen = ownedCrew[Math.floor(random() * ownedCrew.length)]!;
    updatedCrewMember = {
      ...chosen,
      unavailableUntil: currentTime + COMBAT_CREW_UNAVAILABLE_DURATION_HOURS * (1 - mitigationPercent) * MS_PER_HOUR,
    };
  }

  return {
    combatEncounter: { ...combatEncounter, status: "resolved", outcome: "lose" },
    updatedShip,
    updatedCrewMember,
    retreatVoyage: initiateVoyage(updatedShip, currentPlanet, originPlanet, voyage.cargo, currentTime, retreatVoyageId, true, pilot).voyage,
  };
}
