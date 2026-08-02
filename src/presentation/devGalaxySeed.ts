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

// SUPERSEDED (found while making sure the starting planet itself supports
// refining/crafting playtests, not just travel-reachable neighbors): the
// previous seed here, "playtest-galaxy-12", was picked before a real bug
// in getEligibleResources() (generatePlanet.ts) was found and fixed --
// planet-type eligibility was matched by a category substring, and 3 real
// content resources (polished-crystal-lattice, master-crystal-array,
// fusion-gas-mix -- all refined/crafted, not raw) accidentally passed that
// match because their self-referential category name happened to contain
// "crystal" or "gas". That means every planet pick this file made before
// the fix, including the previous seed's starting planet, was chosen
// against resource rolls that don't exist anymore post-fix (the eligible
// pool composition changed for every planet, which reshuffles
// selectResourceSubset()'s draws even though tier/type/position are
// unaffected -- separate random streams). Re-searched from scratch
// against the fixed logic rather than patching the old seed's planet
// picks piecemeal.
//
// "alpha-playtest-191" verified via generateGalaxy(50, realResourceCatalog,
// seed) against the current (60-resource, post-fix) content roster:
//
// - Planet 0 (startingPlanet): SuperEarth, Purple tier, 17 producible
//   resources -- including igneous-ore, autunite-crystal, AND ferrite-ore
//   (raw inputs for 2 of the 10 real refining recipes) and hydrogen-gas
//   (the gas-category input the one MVP craft recipe already exercised by
//   the playtest doc needs). This is what this seed was searched for: the
//   starting planet alone, no travel required, now supports the full
//   gather -> refine -> craft chain for BOTH a schematic-backed recipe
//   (ion-forged-hull-plate, Blue schematic) and the one general recipe
//   with no schematic at all (iron-hull-plate, Grey-equivalent) -- a real,
//   immediately-reachable "with vs. without a schematic" comparison. Also
//   has its own real specialty (nickel-iron-fragment).
// - Planet 1 (secondaryDiscoveredPlanet, auto-discovered): SuperEarth,
//   Gold tier, real specialty hydrogen-gas -- A4 reachable with zero
//   travel beyond the two bootstrap planets, same as before, but now
//   backed by a genuinely raw specialty resource (the old seed's planet 1
//   specialty, fusion-gas-mix, was itself one of the 3 resources the
//   eligibility bug should never have allowed -- so A4 as previously
//   documented was unknowingly exercising the bug, not a real specialty).
// - Planet 16: SuperEarth, Grey tier, ~0.7h from the starting planet (an
//   essentially free side-trip, not a real voyage commitment) -- shares
//   igneous-ore (among others) with planet 1's Gold-tier SuperEarth, so
//   A3 ("same resource, Grey-tier vs. Gold-tier planet") is reachable
//   using planets 1 and 16, both close to the start.
// - Planet 46: Terrestrial, Gold tier, ~22h from the starting planet at
//   Grey ship speed -- much closer to the plan doc's original "~24-28h"
//   B4 long-trip example than the previous seed's farthest reachable
//   planet (~14.7h) managed.
// - Planets 3, 7, 9 added for general short/medium-hop variety and extra
//   A4 specialty examples (graphite-deposit, ammonia-gas respectively);
//   see devSeed.ts's seedDiscoveredPlanets() for the full discovered set
//   and its own per-planet reasoning.
//
// Each planet's own seed is `${gameSeed}:${index}`, independent of the
// total planet count (see generateGalaxy.ts) -- confirmed again this pass,
// not just carried over as an assumption from the previous seed's own
// verification.
const KNOWN_GOOD_GALAXY_SEED = "alpha-playtest-191";

if (isDebugModeEnabled() && !saveSystem.load(GALAXY_SEED_SAVE_KEY)) {
  saveSystem.save(GALAXY_SEED_SAVE_KEY, KNOWN_GOOD_GALAXY_SEED);
}
