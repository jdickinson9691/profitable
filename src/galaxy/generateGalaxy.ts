import type { Resource } from "../data/types/resource.ts";
import type { Planet, PlanetPosition } from "../data/types/planet.ts";
import { createSeededRandom, generateRandomSeed } from "./seededRandom.ts";
import { generatePlanet } from "./generatePlanet.ts";

// Phase 2 GDD §2.7 -- positions aren't range/distribution-specified in the
// design; this is a documented default (a bounded square, uniform random),
// not a literal requirement. Cheap to change later since nothing besides
// display/travel (both post-MVP) reads position values yet.
// Exported (Ship Fuel amendment): the galaxy's real worst-case single-trip
// distance -- corner-to-corner, 2*POSITION_RANGE on each axis -- is what
// FUEL_CAPACITY_BY_TIER's "Blue is the first always-reachable-in-one-hop
// tier" claim is verified against (shipsAndTravelConfig.ts's own comment).
// Read from here rather than duplicated as a second literal, so the two
// stay structurally linked if this value ever changes.
export const POSITION_RANGE = 1000;

function generatePosition(random: () => number): PlanetPosition {
  return {
    x: Math.round(random() * POSITION_RANGE * 2 - POSITION_RANGE),
    y: Math.round(random() * POSITION_RANGE * 2 - POSITION_RANGE),
  };
}

export interface Galaxy {
  seed: string;
  planets: Planet[];
}

// Phase 2 GDD §2.7-2.8 -- a fixed, finite set of planets generated once
// (not a streaming/infinite generator). If no seed is supplied, one is
// generated and returned so the caller can store it for reproducibility.
// `resources` is the full resource catalog -- see generatePlanet.ts for
// why this isn't in Agent 8's originally-specified signature.
export function generateGalaxy(planetCount: number, resources: Resource[], seed?: string): Galaxy {
  const gameSeed = seed ?? generateRandomSeed();
  // A separate random stream from any individual planet's own seed, so
  // generating positions never perturbs a specific planet's tier/type/
  // subset/specialty rolls.
  const positionRandom = createSeededRandom(`${gameSeed}:positions`);

  const planets: Planet[] = [];
  for (let index = 0; index < planetCount; index++) {
    const planetSeed = `${gameSeed}:${index}`;
    const position = generatePosition(positionRandom);
    planets.push(generatePlanet(planetSeed, position, resources));
  }

  return { seed: gameSeed, planets };
}
