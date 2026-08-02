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

// Alpha Section 3 (docs/profitable-alpha-scale-performance-plan.md):
// locked at 50, the real alpha galaxy size -- large enough that the map
// genuinely can't be taken in at a glance, round enough to reason about
// when tuning discovery pacing/travel distances/market pool distribution
// against it. Was a small fixed 5 through Phase 2-5 and the deferred
// gaps, deliberately kept minimal until scale/performance became this
// section's own explicit job to verify -- see that plan doc for the full
// rationale and the four verification tests this change is gated behind.
const PLANET_COUNT = 50;

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
//
// Necessary correction (found while implementing the Scanner/Probe
// presentation amendment): traveledTo entries came straight off
// galaxy.planets, which always carries discovered: false baked in
// (generatePlanet() is deterministic and never mutated in place --
// membership in discoveredPlanetIds is what actually signals discovery,
// not the object's own field). That went unnoticed until performScan()
// needed a real, trustworthy Planet.discovered to check -- every planet
// this function returns is now normalized to discovered: true, matching
// what its own name and contract already promised.
export function getDiscoveredPlanets(): Planet[] {
  const traveledTo = galaxy.planets
    .filter((planet) => !bootstrapDiscoveredIds.has(planet.id) && discoveredPlanetIds.includes(planet.id))
    .map((planet) => ({ ...planet, discovered: true }));
  return [...bootstrapDiscoveredPlanets, ...traveledTo];
}

// Called from a successful resolveArrival() (physical visitation) and,
// since the Scanner/Probe amendment, from a successful performScan() too
// (TradeMapScene.onScan()) -- both are physical/deliberate discovery
// paths the map GDD's "no alternate discovery path" guard (see
// tests/integration/mapVerification.test.ts) still confirms are the only
// two: no code anywhere else writes a Planet's `discovered` field.
export function markPlanetDiscovered(planetId: string): void {
  if (bootstrapDiscoveredIds.has(planetId) || discoveredPlanetIds.includes(planetId)) return;
  discoveredPlanetIds = [...discoveredPlanetIds, planetId];
  saveSystem.save(DISCOVERED_PLANET_IDS_SAVE_KEY, discoveredPlanetIds);
}
