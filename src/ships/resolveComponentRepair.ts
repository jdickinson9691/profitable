import type { Ship } from "../data/types/ship.ts";
import type { CrewMember } from "../data/types/crewMember.ts";
import type { Voyage } from "../data/types/voyage.ts";
import type { ComponentCategory } from "../data/types/componentCategory.ts";
import { COMPONENT_CATEGORIES } from "../data/types/componentCategory.ts";
import { computeAggregateTier } from "../simulation/aggregateTier.ts";
import { clamp } from "../simulation/clamp.ts";
import { QUALITY_MIN, QUALITY_MAX } from "../data/constants/quality.ts";
import {
  SYSTEMS_ENGINEER_REPAIR_RATE_BY_TIER,
  CRAFTER_REPAIR_RATE_BY_TIER,
  REPAIR_ELAPSED_TIME_CAP_HOURS,
} from "../data/constants/shipsAndTravelConfig.ts";
import { deriveShipTier } from "./deriveShipTier.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

// Crafter (Weaponsmith/Engineer/Shield Technician/Cargo Specialist) only
// -- Artisan has no repair effect (its own general-crafting discount is
// CraftScene's job, never this function's). No new taxonomy: reuses the
// existing profession strings directly (crewConfig.ts's
// TIER_6_7_PROFESSIONS), one-to-one with the matching ShipComponent
// category.
const PROFESSION_REPAIR_CATEGORY: Partial<Record<string, ComponentCategory>> = {
  Weaponsmith: "weapon",
  Engineer: "engine",
  "Shield Technician": "shield",
  "Cargo Specialist": "cargoHold",
};

function findAssignedCrew(ownedCrew: readonly CrewMember[], ship: Ship, role: NonNullable<CrewMember["shipRole"]>): CrewMember | null {
  return ownedCrew.find((member) => member.assignedShipId === ship.id && member.shipRole === role) ?? null;
}

// Ship Crew Roles' resolved repair interaction (profitable-design-
// questions.md, `ship.md`'s own cross-reference), task #89. Same "derive
// from elapsed hours since a stored timestamp, capped, no background job"
// shape resolveBackgroundCrafting() already established, applied to the
// new Ship.lastRepairedAt field. `activeVoyage` is an explicit, required
// parameter -- Ship.currentPlanetId alone can't distinguish "docked here"
// from "mid-voyage, origin still shown" (ship.ts's own comment), so the
// caller resolves and passes which state currently applies, same "no
// hidden lookups in a pure function" convention every other function
// here follows.
//
// Two independent rate sources, summed into one combined per-category
// rate: Systems Engineer's unconditional rate, and Crafter's
// traveling-only, category-matched rate.
//
// No sub-interval blending: the rate is resolved once, from whichever
// state is true at the moment this is called, and applied to the entire
// capped elapsed window -- matching resolveBackgroundCrafting()'s own
// precedent (a single rate/state resolved once per check, never a
// historical replay).
//
// Retroactive removal (2026-08-04): the `dockedPlanet` parameter and its
// Citadel-driven repair-rate contribution (citadelRate, Level 2/3
// benefits) are removed along with Citadels -- see planet-ownership.md's
// own retroactive note for the full account, including the documented
// Unity consequence (Unity's Check Repair becomes a no-op until Ship
// Crew Roles UI exists there, since Unity has no other repair source).
// Systems Engineer and Crafter repair are both unaffected in TS.
export function resolveComponentRepair(
  ship: Ship,
  ownedCrew: readonly CrewMember[],
  activeVoyage: Voyage | null,
  currentTime: number,
): Ship {
  // Missing lastRepairedAt (never repaired before) reads as zero elapsed
  // time on this first call -- no free retroactive catch-up for a ship
  // this function has never seen.
  const rawElapsedHours = (currentTime - (ship.lastRepairedAt ?? currentTime)) / MS_PER_HOUR;
  const cappedElapsedHours = Math.min(Math.max(rawElapsedHours, 0), REPAIR_ELAPSED_TIME_CAP_HOURS);

  const systemsEngineer = findAssignedCrew(ownedCrew, ship, "Systems Engineer");
  let systemsEngineerRate = 0;
  if (systemsEngineer) {
    const entry = SYSTEMS_ENGINEER_REPAIR_RATE_BY_TIER.find((e) => e.tier === systemsEngineer.tier);
    if (!entry) throw new RangeError(`no Systems Engineer repair rate defined for tier ${systemsEngineer.tier}`);
    systemsEngineerRate = entry.rate;
  }

  // "While traveling" (design entry's literal wording) -- never resolved
  // at all while docked, regardless of profession/tier.
  const crafter = activeVoyage !== null ? findAssignedCrew(ownedCrew, ship, "Crafter") : null;
  const crafterCategory = crafter?.profession ? PROFESSION_REPAIR_CATEGORY[crafter.profession] : undefined;
  let crafterRate = 0;
  if (crafter && crafterCategory) {
    const entry = CRAFTER_REPAIR_RATE_BY_TIER.find((e) => e.tier === crafter.tier);
    if (!entry) throw new RangeError(`no Crafter repair rate defined for tier ${crafter.tier}`);
    crafterRate = entry.rate;
  }

  const updatedComponents = { ...ship.components };
  for (const category of COMPONENT_CATEGORIES) {
    const component = updatedComponents[category];
    // Null stays null, never coerced to 0 -- same "not applicable, not
    // zero" convention resolveCombatChoice() already follows for a
    // component with no durability rating.
    if (!component || component.qualities.durability === null) continue;

    const rate = systemsEngineerRate + (category === crafterCategory ? crafterRate : 0);
    if (rate <= 0) continue;

    const repairedDurability = clamp(
      Math.round(component.qualities.durability + rate * cappedElapsedHours),
      QUALITY_MIN,
      QUALITY_MAX,
    );
    if (repairedDurability === component.qualities.durability) continue;

    const updatedQualities = { ...component.qualities, durability: repairedDurability };
    const recomputedTier = computeAggregateTier(updatedQualities);
    if (recomputedTier === null) {
      // Structurally shouldn't happen -- every ShipComponent in this
      // codebase is generated with all 5 qualities populated
      // (refreshShipyardPool.ts), never all-null. Same "structurally
      // required" throw precedent resolveCombatChoice() already uses for
      // its own post-damage recompute.
      throw new Error(`component repair left ${category} with no ratable qualities`);
    }
    updatedComponents[category] = { ...component, qualities: updatedQualities, tier: recomputedTier };
  }

  const updatedShip: Ship = { ...ship, components: updatedComponents, lastRepairedAt: currentTime };
  return { ...updatedShip, tier: deriveShipTier(updatedShip) };
}
