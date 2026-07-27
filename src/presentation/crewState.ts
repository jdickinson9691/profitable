import { saveSystem } from "./gameState.ts";
import { startingPlanet } from "./galaxyState.ts";
import { PLAYER_ID } from "./tradingState.ts";
import { refreshCrewPool } from "../crew/refreshCrewPool.ts";
import type { CrewCapacity } from "../data/types/crewCapacity.ts";
import type { CrewMember } from "../data/types/crewMember.ts";
import type { PlanetCrewPool } from "../data/types/planetCrewPool.ts";
import { BASE_CREW_CAPACITY } from "../data/constants/crewConfig.ts";

// Agent 18's own cross-scene state, same pattern tradingState.ts already
// established -- scoped to startingPlanet only (the one planet the
// player can currently reach without a travel system), same scope
// boundary Agent 13 drew for its own market state.

const CREW_CAPACITY_SAVE_KEY = "profitable:crewCapacity";
const CREW_ROSTER_SAVE_KEY = "profitable:crewRoster";
const CREW_POOL_SAVE_KEY = "profitable:crewPool";

function loadOrCreateCapacity(): CrewCapacity {
  const stored = saveSystem.load(CREW_CAPACITY_SAVE_KEY) as CrewCapacity | null;
  if (stored) return stored;
  const capacity: CrewCapacity = { playerId: PLAYER_ID, baseCapacity: BASE_CREW_CAPACITY, purchasedSlots: 0 };
  saveSystem.save(CREW_CAPACITY_SAVE_KEY, capacity);
  return capacity;
}

function loadOrCreatePool(): PlanetCrewPool {
  const stored = saveSystem.load(CREW_POOL_SAVE_KEY) as PlanetCrewPool | null;
  if (stored) return stored;
  const pool = refreshCrewPool(startingPlanet.id);
  saveSystem.save(CREW_POOL_SAVE_KEY, pool);
  return pool;
}

let capacity: CrewCapacity = loadOrCreateCapacity();
let roster: CrewMember[] = (saveSystem.load(CREW_ROSTER_SAVE_KEY) as CrewMember[] | null) ?? [];
let pool: PlanetCrewPool = loadOrCreatePool();

export function getCrewCapacity(): CrewCapacity {
  return capacity;
}

export function setCrewCapacity(next: CrewCapacity): void {
  capacity = next;
  saveSystem.save(CREW_CAPACITY_SAVE_KEY, capacity);
}

export function getCrewRoster(): CrewMember[] {
  return roster;
}

export function setCrewRoster(next: CrewMember[]): void {
  roster = next;
  saveSystem.save(CREW_ROSTER_SAVE_KEY, roster);
}

export function replaceCrewMember(next: CrewMember): void {
  setCrewRoster(roster.map((member) => (member.id === next.id ? next : member)));
}

export function addCrewMember(member: CrewMember): void {
  setCrewRoster([...roster, member]);
}

export function removeCrewMember(id: string): void {
  setCrewRoster(roster.filter((member) => member.id !== id));
}

export function getCrewPool(): PlanetCrewPool {
  return pool;
}

export function setCrewPool(next: PlanetCrewPool): void {
  pool = next;
  saveSystem.save(CREW_POOL_SAVE_KEY, pool);
}
