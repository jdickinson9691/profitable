// Dev-only playtest shortcut, companion to devSeed.ts -- but structurally
// different from everything in that file. devSeed.ts's seedPlaytestSave()
// is called on demand (from the console, after the game has already
// booted) and works by calling real setters, because every OTHER piece of
// state it touches has a setter that updates both the in-memory value and
// SaveSystem together.
//
// galaxyState.ts's `galaxy` (and `startingPlanet`/`secondaryDiscoveredPlanet`
// derived from it) has no such setter -- it's a module-level `const`,
// generated exactly once, the first time anything imports galaxyState.ts
// (directly or transitively). By the time a console command could call a
// function, that import has already happened and the galaxy already
// exists; nothing can regenerate it in-place for the running session.
//
// The only point where a specific galaxy seed can actually take effect is
// *before* galaxyState.ts is first evaluated -- which means this file
// must itself be imported before any scene (main.ts's scene imports are
// what transitively pull in galaxyState.ts). This is why it's a separate
// top-level import in main.ts, positioned before the scene imports,
// rather than something devSeed.ts calls.
//
// Does not touch generateGalaxy()/generatePlanet() or any formula --
// exactly like devSeed.ts's SCANNER_POOL_SEED, this only picks which
// value feeds the existing deterministic generator's own, already-
// intended seed parameter. Only ever writes the seed if none is already
// stored (mirrors galaxyState.ts's own loadOrCreateGalaxy() rule), so an
// existing save's galaxy -- debug session or not -- is never overwritten.
import { saveSystem } from "./gameState.ts";
import { isDebugModeEnabled } from "./debugFlag.ts";

const GALAXY_SEED_SAVE_KEY = "profitable:galaxySeed";

// Verified via generateGalaxy(5, realResourceCatalog, seed): planet 0
// (startingPlanet) rolls Grey, planet 1 (secondaryDiscoveredPlanet, also
// auto-discovered) rolls Gold with a real specialty (fusion-gas-mix) --
// so profitable-alpha-playtest-plan.md's A3 (Grey-tier vs. Gold-tier
// gathering) and A4 (specialty planet payoff) are both reachable
// immediately, with no travel/discovery needed beyond the two bootstrap
// planets. Planet 3 additionally rolls Orange with its own specialty
// (helium-3), for extra A4 variety. Full roll: Grey, Gold, Grey, Orange,
// Grey.
const KNOWN_GOOD_GALAXY_SEED = "playtest-galaxy-12";

if (isDebugModeEnabled() && !saveSystem.load(GALAXY_SEED_SAVE_KEY)) {
  saveSystem.save(GALAXY_SEED_SAVE_KEY, KNOWN_GOOD_GALAXY_SEED);
}
