import type { Voyage } from "../data/types/voyage.ts";
import type { Ship } from "../data/types/ship.ts";
import type { Planet } from "../data/types/planet.ts";
import type { Resource } from "../data/types/resource.ts";
import type { RandomFn } from "../data/types/random.ts";
import type { ArrivalResult } from "../data/types/arrivalResult.ts";
import type { EncounterResult } from "../data/types/encounter.ts";
import type { CombatEncounter } from "../data/types/combatEncounter.ts";
import { resolveEncounters } from "./resolveEncounters.ts";
import { initiateCombat } from "./initiateCombat.ts";
import { ARRIVAL_COMBAT_CHECK_CHANCE } from "../data/constants/shipsAndTravelConfig.ts";

// Phase 5 GDD §2.8/§3. Necessary completion: takes the actual Voyage and
// Ship objects directly rather than a voyageId into an implicit store,
// same pure-function reasoning as every other necessary completion in
// this project. Only resolves once currentTime >= voyage.arrivesAt --
// never allows early resolution (Agent 20's own contract, explicitly).
// Does not itself activate any Phase 3 Listing for in-transit sale cargo
// -- see arrivalResult.ts's own comment on why that boundary matters.
//
// Travel Encounters (Non-Combat) amendment: `destinationPlanet`/`resources`
// are new, OPTIONAL trailing parameters -- additive only, per this
// amendment's own explicit constraint that arrival timing, cargo delivery,
// and ship delivery must stay unchanged. Every pre-amendment call site
// (existing tests, existing presentation code) keeps compiling and
// behaving identically without passing them; encounters simply don't
// resolve (`encounters: []`) unless a caller opts in by providing both.
export function resolveArrival(
  voyage: Voyage,
  ship: Ship,
  currentTime: number,
  destinationPlanet?: Planet,
  resources?: Resource[],
  random: RandomFn = Math.random,
): ArrivalResult {
  if (currentTime < voyage.arrivesAt) {
    return { resolved: false, reason: `voyage has not yet arrived (arrives at ${voyage.arrivesAt})` };
  }

  const updatedShip: Ship = { ...ship, currentPlanetId: voyage.destinationPlanetId };

  let encounters: EncounterResult[] = [];
  const pendingCombats: CombatEncounter[] = [];

  if (destinationPlanet && resources) {
    const resolution = resolveEncounters(voyage, ship, destinationPlanet, resources, random);
    encounters = resolution.encounters;
    pendingCombats.push(...resolution.pendingCombats);

    // Combat GDD §2.2/§3: "at arrival... a separate check" from the
    // window-roll mechanism above. Gated behind the same opt-in as every
    // other encounter (destinationPlanet/resources both supplied) --
    // every pre-Travel-Encounters call site keeps behaving identically
    // (pendingCombats stays []), same reasoning already established for
    // `encounters`. Deliberately NOT suppressed by voyage.isRetreat: the
    // Combat GDD's own §2.6 wording scopes that flag to resolveEncounters()
    // specifically ("a flag suppressing resolveEncounters() for that
    // specific trip") -- the arrival check is a separate mechanism this
    // function rolls directly, not something resolveEncounters() gates.
    if (random() < ARRIVAL_COMBAT_CHECK_CHANCE) {
      pendingCombats.push(initiateCombat(`${voyage.id}-combat-arrival`, voyage.id, "arrival", null, random));
    }
  }

  return {
    resolved: true,
    updatedShip,
    destinationPlanetId: voyage.destinationPlanetId,
    cargo: voyage.cargo,
    encounters,
    pendingCombats,
  };
}
