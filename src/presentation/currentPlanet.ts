import type { Planet } from "../data/types/planet.ts";
import { galaxy, startingPlanet, getDiscoveredPlanets } from "./galaxyState.ts";
import { getShipRoster } from "./shipsState.ts";

// Presentation-layer wiring: resolves "wherever the player's ship
// currently is," for the scenes (Gather/Market/Crew/Shipyard) that used to
// hardcode startingPlanet regardless of travel. Mirrors TradeMapScene's own
// originPlanet lookup exactly (prefer the discovered/normalized copy,
// fall back to the raw galaxy entry) so every scene agrees on the same
// planet object shape. Single-ship assumption throughout matches
// TradeMapScene's own `getShipRoster()[0]`. Falls back to startingPlanet
// before any ship is purchased, matching every affected scene's previous
// pre-travel behavior.
export function getCurrentPlanet(): Planet {
  const ship = getShipRoster()[0];
  if (!ship) return startingPlanet;
  return (
    getDiscoveredPlanets().find((planet) => planet.id === ship.currentPlanetId) ??
    galaxy.planets.find((planet) => planet.id === ship.currentPlanetId) ??
    startingPlanet
  );
}
