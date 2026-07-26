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
