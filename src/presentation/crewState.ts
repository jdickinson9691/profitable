import { saveSystem } from "./gameState.ts";
import { PLAYER_ID } from "./tradingState.ts";
import { refreshCrewPool } from "../crew/refreshCrewPool.ts";
import type { CrewCapacity } from "../data/types/crewCapacity.ts";
import type { CrewMember } from "../data/types/crewMember.ts";
import type { PlanetCrewPool } from "../data/types/planetCrewPool.ts";
import { BASE_CREW_CAPACITY } from "../data/constants/crewConfig.ts";

// Agent 18's own cross-scene state, same pattern tradingState.ts already
// established. The crew pool is keyed per planet (below) -- planet-aware
// fix, see CrewScene.ts -- generated on demand for whichever planet is
// actually requested, not just startingPlanet.

const CREW_CAPACITY_SAVE_KEY = "profitable:crewCapacity";
const CREW_ROSTER_SAVE_KEY = "profitable:crewRoster";
// Renamed from the old "profitable:crewPool" single-pool key: that key
// held one PlanetCrewPool total, always for startingPlanet. This holds a
// per-planet map instead, so an old save's single pool is simply
// regenerated fresh under the new key rather than misread as a map.
const CREW_POOLS_SAVE_KEY = "profitable:crewPoolsByPlanet";

function loadOrCreateCapacity(): CrewCapacity {
  const stored = saveSystem.load(CREW_CAPACITY_SAVE_KEY) as CrewCapacity | null;
  if (stored) return stored;
  const capacity: CrewCapacity = { playerId: PLAYER_ID, baseCapacity: BASE_CREW_CAPACITY, purchasedSlots: 0 };
  saveSystem.save(CREW_CAPACITY_SAVE_KEY, capacity);
  return capacity;
}

let capacity: CrewCapacity = loadOrCreateCapacity();
let roster: CrewMember[] = (saveSystem.load(CREW_ROSTER_SAVE_KEY) as CrewMember[] | null) ?? [];
let crewPoolsByPlanet: Record<string, PlanetCrewPool> =
  (saveSystem.load(CREW_POOLS_SAVE_KEY) as Record<string, PlanetCrewPool> | null) ?? {};

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

// Generates a planet's pool on first request and persists it, the same
// "load or create, then cache" behavior the old single-pool getCrewPool()
// had -- just keyed per planet now instead of assuming startingPlanet.
export function getCrewPool(planetId: string): PlanetCrewPool {
  const stored = crewPoolsByPlanet[planetId];
  if (stored) return stored;
  const pool = refreshCrewPool(planetId);
  setCrewPool(planetId, pool);
  return pool;
}

export function setCrewPool(planetId: string, next: PlanetCrewPool): void {
  crewPoolsByPlanet = { ...crewPoolsByPlanet, [planetId]: next };
  saveSystem.save(CREW_POOLS_SAVE_KEY, crewPoolsByPlanet);
}
