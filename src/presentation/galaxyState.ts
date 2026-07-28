import { generateGalaxy } from "../galaxy/generateGalaxy.ts";
import type { Galaxy } from "../galaxy/generateGalaxy.ts";
import type { Planet } from "../data/types/planet.ts";
import { content, saveSystem } from "./gameState.ts";

// Phase 2 integration (Agent 10): replaces the MVP's single hardcoded
// Delta Rigelus with a real generated galaxy. Persistence goes through
// SaveSystem exclusively, per the architectural mandate -- only the SEED
// is stored (small, and generateGalaxy() is deterministic given it), not
// the whole planet array.
const GALAXY_SEED_KEY = "profitable:galaxySeed";

// A small fixed galaxy -- enough to prove real generation (varied tiers/
// types/specialties across a seed) without redesigning the single-planet
// MVP presentation into a multi-planet UI. Agent 10 must not modify Agent
// 5's scenes beyond what's needed to source planet data from Agent 8
// instead of Agent 6's hardcoded content -- this is an integration point,
// not a presentation redesign.
const PLANET_COUNT = 5;

function loadOrCreateGalaxy(): Galaxy {
  const storedSeed = saveSystem.load(GALAXY_SEED_KEY) as string | null;
  const galaxy = generateGalaxy(PLANET_COUNT, content.resources, storedSeed ?? undefined);
  if (!storedSeed) {
    saveSystem.save(GALAXY_SEED_KEY, galaxy.seed);
  }
  return galaxy;
}

export const galaxy: Galaxy = loadOrCreateGalaxy();

// Agent 8 always sets discovered: false on every generated planet (its own
// contract says picking/revealing a starting planet is "Agent 10's
// integration concern, not this agent's"). This is that concern.
export const startingPlanet: Planet = { ...galaxy.planets[0]!, discovered: true };

// Phase 5 integration (Agent 22): travel needs at least one real reachable
// destination to demonstrate against. Mirrors startingPlanet's own
// override immediately above, one planet further into the generated list.
export const secondaryDiscoveredPlanet: Planet | undefined = galaxy.planets[1]
  ? { ...galaxy.planets[1]!, discovered: true }
  : undefined;

// Bug fix (Galactic Map Agent 25/26 verification, Section 6/7 of
// profitable-map-gdd.md): arriving at a planet via a real Voyage never
// used to mark it discovered anywhere in the codebase -- only the two
// bootstrap overrides above were ever reachable, regardless of how much a
// player traveled. The map GDD's own premise ("a planet becomes
// discovered: true when physically visited") is the design this closes.
//
// `galaxy.planets` itself only round-trips its SEED through SaveSystem
// (see loadOrCreateGalaxy() above) -- generatePlanet() deterministically
// reproduces discovered: false for every planet on every reload, so an
// in-memory-only mutation of galaxy.planets would silently vanish on the
// next session. Discovery-by-travel therefore needs its own persisted
// side-table, the same "elsewhere" pattern tradingState.ts's
// listingQualities already uses for data a regenerated/reloaded structure
// can't itself carry.
const DISCOVERED_PLANET_IDS_SAVE_KEY = "profitable:discoveredPlanetIds";

let discoveredPlanetIds: string[] =
  (saveSystem.load(DISCOVERED_PLANET_IDS_SAVE_KEY) as string[] | null) ?? [];

const bootstrapDiscoveredPlanets: Planet[] = [startingPlanet, secondaryDiscoveredPlanet].filter(
  (planet): planet is Planet => planet !== undefined,
);
const bootstrapDiscoveredIds = new Set(bootstrapDiscoveredPlanets.map((planet) => planet.id));

// The single source of truth for "which planets can the player currently
// see/travel to" -- the two structural bootstrap planets plus any real
// generated planet a Voyage has actually delivered a ship to. Presentation
// code (TradeMapScene) should read this rather than re-deriving its own
// copy of the discovery rule.
export function getDiscoveredPlanets(): Planet[] {
  const traveledTo = galaxy.planets.filter(
    (planet) => !bootstrapDiscoveredIds.has(planet.id) && discoveredPlanetIds.includes(planet.id),
  );
  return [...bootstrapDiscoveredPlanets, ...traveledTo];
}

// Called only from a successful resolveArrival() (physical visitation) --
// per the map GDD's own decided property, no other call site should ever
// exist (see tests/integration/mapVerification.test.ts's scanner/probe
// regression guard for the adjacent "no alternate discovery path" check).
export function markPlanetDiscovered(planetId: string): void {
  if (bootstrapDiscoveredIds.has(planetId) || discoveredPlanetIds.includes(planetId)) return;
  discoveredPlanetIds = [...discoveredPlanetIds, planetId];
  saveSystem.save(DISCOVERED_PLANET_IDS_SAVE_KEY, discoveredPlanetIds);
}
