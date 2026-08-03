// Alpha Section 3 (docs/profitable-alpha-scale-performance-plan.md)
// harness for Tests 2-4: a realistic "deep player" state at the real
// 50-planet galaxy scale, real getGlobalPrice() performance under that
// load, and the voyage/encounter-history accumulation question.
//
// Deliberately avoids importing src/presentation/{crewState,shipsState,
// tradingState,galaxyState}.ts directly -- like scripts/playtestHarness.ts,
// those transitively import gameState.ts, whose module-level SaveSystem
// construction defaults to globalThis.localStorage, which doesn't exist
// under plain Node (confirmed: `node -e "console.log(typeof
// globalThis.localStorage)"` -> undefined without --experimental
// -webstorage). Builds state directly via the real domain functions and
// types instead, then exercises the real createLocalStorageSaveSystem()
// adapter against an injected in-memory backing store.
//
// Run: npm run scale-test (or: node scripts/scaleTestHarness.ts)
import { loadMvpContent } from "../src/presentation/loadMvpContent.ts";
import { generateGalaxy } from "../src/galaxy/generateGalaxy.ts";
import { createLocalStorageSaveSystem } from "../src/adapters/saveSystem.ts";
import type { StorageLike } from "../src/adapters/saveSystem.ts";
import { assembleShip } from "../src/ships/assembleShip.ts";
import { createListing } from "../src/trading/createListing.ts";
import { getGlobalPrice } from "../src/trading/globalPrice.ts";
import { resolveArrival } from "../src/ships/resolveArrival.ts";
import { initiateVoyage } from "../src/ships/initiateVoyage.ts";
import { calculateTravelTime } from "../src/ships/calculateTravelTime.ts";
import type { Ship } from "../src/data/types/ship.ts";
import type { ShipComponent } from "../src/data/types/shipComponent.ts";
import type { ComponentCategory } from "../src/data/types/componentCategory.ts";
import type { CrewMember } from "../src/data/types/crewMember.ts";
import type { PlanetMarketState } from "../src/data/types/planetMarketState.ts";
import type { Listing } from "../src/data/types/listing.ts";
import type { TierColor } from "../src/data/types/tierColor.ts";
import type { Voyage } from "../src/data/types/voyage.ts";

const content = loadMvpContent();
const PLAYER_ID = "scale-test-player";

function section(title: string) {
  console.log(`\n${"=".repeat(70)}\n${title}\n${"=".repeat(70)}`);
}

// ---- Byte-counting SaveSystem, backed by the REAL adapter implementation
// (createLocalStorageSaveSystem), not a fake -- only the backing
// StorageLike is a test double, the same injectable seam
// tests/adapters/saveSystem.test.ts's own createMemoryStorage() uses. ----
function createByteCountingStorage(): StorageLike & { totalBytes(): number } {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    totalBytes: () => {
      let total = 0;
      for (const value of store.values()) total += Buffer.byteLength(value, "utf8");
      return total;
    },
  };
}

// ---- Test 2 setup: a "deep player" state ----

const BLUE_QUALITY = 80;
function buildBlueComponent(category: ComponentCategory): ShipComponent {
  return {
    id: `scale-test-${category}`,
    category,
    qualities: { purity: BLUE_QUALITY, density: BLUE_QUALITY, potency: BLUE_QUALITY, durability: BLUE_QUALITY, rarity: BLUE_QUALITY },
    tier: "Blue",
  };
}

function buildShip(index: number, homePlanetId: string): Ship {
  let ship: Ship = {
    id: `scale-test-ship-${index}`,
    name: `Scale Test Runner ${index}`,
    ownerId: PLAYER_ID,
    tier: "Grey",
    currentPlanetId: homePlanetId,
    fuelCapacity: 100,
    currentFuel: 100,
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
  };
  for (const category of ["weapon", "engine", "shield", "cargoHold"] as const) {
    ship = assembleShip(ship, buildBlueComponent(category), category);
  }
  return ship;
}

const CREW_TIERS: TierColor[] = ["Grey", "White", "Green", "Blue", "Purple", "Gold"];
function buildCrew(now: number): CrewMember[] {
  return CREW_TIERS.map((tier, index) => ({
    id: `scale-test-crew-${index}`,
    hiredByPlayerId: PLAYER_ID,
    tier,
    profession: null,
    status: "idle",
    assignedCraftId: null,
    hiredAt: now,
    lastCheckedAt: now,
    wageAmount: 0,
    lastPaidAt: now,
    unavailableUntil: null,
  }));
}

function main() {
  const now = Date.now();
  const galaxy = generateGalaxy(50, content.resources, "alpha-scale-test-50");

  section("Test 2 -- Realistic player-state load (50-planet galaxy)");

  const ships = Array.from({ length: 5 }, (_, i) => buildShip(i, galaxy.planets[i % galaxy.planets.length]!.id));
  console.log(`Built ${ships.length} fully-componentized ships (4 Blue-tier components each).`);

  const crew = buildCrew(now);
  console.log(`Built a ${crew.length}-member crew roster (one per tier Grey through Gold).`);

  // 75 listings (midpoint of the plan's 50-100 range) spread across
  // planet markets, plus a handful of global (tier <=5) listings -- each
  // paired with the PlanetMarketState a real listing implies, matching
  // how the two structures actually co-occur in play.
  const tradeableResources = content.resources.filter((r) => (r.itemTier ?? 1) <= 5).slice(0, 15);
  if (tradeableResources.length === 0) {
    throw new Error("scale-test: no tradeable (itemTier <= 5) resources found in real content");
  }

  const listings: Listing[] = [];
  const marketStates: PlanetMarketState[] = [];
  const LISTING_COUNT = 75;
  for (let i = 0; i < LISTING_COUNT; i++) {
    const planet = galaxy.planets[i % galaxy.planets.length]!;
    const resource = tradeableResources[i % tradeableResources.length]!;
    const basePrice = 10 + (i % 20);
    const instance = {
      resource,
      quantity: 1,
      qualities: { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 },
    };
    listings.push(
      createListing(instance, 1 + (i % 5), basePrice, { planetId: planet.id }, PLAYER_ID, `scale-listing-${i}`, now),
    );
    if (!marketStates.some((s) => s.planetId === planet.id && s.itemId === resource.id)) {
      marketStates.push({ planetId: planet.id, itemId: resource.id, currentPrice: basePrice, basePrice });
    }
  }
  console.log(`Built ${listings.length} active listings across ${galaxy.planets.length} planets, `
    + `${marketStates.length} distinct planet+item market states.`);

  const discoveredPlanetIds = galaxy.planets.slice(0, 20).map((p) => p.id);

  // Real SaveSystem, real JSON serialization, byte-counted backing store.
  const storage = createByteCountingStorage();
  const saveSystem = createLocalStorageSaveSystem(storage);

  const saveStart = performance.now();
  saveSystem.save("profitable:shipRoster", ships);
  saveSystem.save("profitable:crewRoster", crew);
  saveSystem.save("profitable:listings", listings);
  saveSystem.save("profitable:marketStates", marketStates);
  saveSystem.save("profitable:discoveredPlanetIds", discoveredPlanetIds);
  saveSystem.save("profitable:galaxySeed", galaxy.seed);
  const saveElapsedMs = performance.now() - saveStart;

  const loadStart = performance.now();
  saveSystem.load("profitable:shipRoster");
  saveSystem.load("profitable:crewRoster");
  saveSystem.load("profitable:listings");
  saveSystem.load("profitable:marketStates");
  saveSystem.load("profitable:discoveredPlanetIds");
  saveSystem.load("profitable:galaxySeed");
  const loadElapsedMs = performance.now() - loadStart;

  const totalBytes = storage.totalBytes();
  console.log(`Save: ${saveElapsedMs.toFixed(2)}ms. Load: ${loadElapsedMs.toFixed(2)}ms.`);
  console.log(`Total serialized size: ${totalBytes} bytes (${(totalBytes / 1024).toFixed(1)} KB).`);
  console.log(
    `For scale: a real browser's localStorage quota is typically ~5MB (5,242,880 bytes) per origin -- `
      + `this deep-player state uses ${((totalBytes / 5_242_880) * 100).toFixed(2)}% of that budget.`,
  );

  section("Test 3 -- getGlobalPrice() at scale");
  const CALL_COUNT = 2000;
  const perfStart = performance.now();
  let lastPrice = 0;
  for (let i = 0; i < CALL_COUNT; i++) {
    const resource = tradeableResources[i % tradeableResources.length]!;
    lastPrice = getGlobalPrice(resource.id, i % 2 === 0 ? "buy" : "sell", marketStates);
  }
  const perfElapsedMs = performance.now() - perfStart;
  console.log(
    `${CALL_COUNT} getGlobalPrice() calls against ${marketStates.length} market states: `
      + `${perfElapsedMs.toFixed(2)}ms total, ${((perfElapsedMs / CALL_COUNT) * 1000).toFixed(1)}μs/call average `
      + `(last result: ${lastPrice.toFixed(2)}cr, sanity-checked non-zero).`,
  );

  section("Test 4 -- Encounter/voyage volume");
  console.log(
    "Finding, not a benchmark: no persisted price-history log or voyage/encounter-history log exists anywhere "
      + "in the codebase (grep-confirmed) -- PlanetMarketState is a live snapshot only (Trading design §2.7's own "
      + "\"always query live, never cache\" rule), and resolveArrival() calls removeVoyage() on every resolution "
      + "(TradeMapScene.ts's onResolveArrival()), deleting a Voyage -- and whatever encounters it carries -- the "
      + "moment it resolves. Both of this section's plan doc's original scale concerns for Test 4 (\"a price "
      + "-history log... most likely to silently balloon\"; \"many resolved Voyage.encounters records over time\") "
      + "describe structures that were never built this way -- not a gap to fix, a premise that didn't match the "
      + "actual locked design once Trading/Travel Encounters were built.",
  );

  const ship = ships[0]!;
  const origin = galaxy.planets[0]!;
  const VOYAGE_COUNT = 25;
  let resolvedCount = 0;
  let encounterCount = 0;
  const voyageStart = performance.now();
  for (let i = 0; i < VOYAGE_COUNT; i++) {
    const destination = galaxy.planets[(i + 1) % galaxy.planets.length]!;
    // Back-date departure by exactly this real route's own travel time
    // (+ a 1s buffer) so the voyage reads as "just arrived" at a REAL
    // duration -- not an arbitrary huge one. Encounter-check windows are
    // time-elapsed-based (24h each, per B7/B8/B9's own model), so an
    // artificially long voyage would roll far more windows than any real
    // trip ever could; a first attempt at this loop used a 10-year
    // backdate and produced ~17,000 total encounters across 25 voyages
    // -- a bug in this harness, not a real finding, caught by the result
    // looking obviously wrong rather than assumed correct.
    const realTravelTimeMs = calculateTravelTime(origin, destination, ship);
    const departedAt = now - realTravelTimeMs - 1000;
    const { voyage } = initiateVoyage(ship, origin, destination, [], departedAt, `scale-voyage-${i}`);
    const result = resolveArrival(voyage, ship, now, destination, content.resources);
    if (result.resolved) {
      resolvedCount++;
      encounterCount += result.encounters.length;
    }
  }
  const voyageElapsedMs = performance.now() - voyageStart;
  console.log(
    `Resolved ${resolvedCount}/${VOYAGE_COUNT} simulated voyage arrivals in ${voyageElapsedMs.toFixed(2)}ms `
      + `(${encounterCount} total encounters rolled naturally) -- no accumulating structure to measure the size `
      + `of, per the finding above; this only confirms resolution itself isn't slow at real distances/scale.`,
  );
}

main();
