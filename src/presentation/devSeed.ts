// Dev-only playtest shortcut (Section 2 alpha balance-tuning support --
// see the seed-playtest-save request this file answers). Purely seeds
// state through the same setters/entity-creation functions every real
// player action already goes through (addShip/addCrewMember/setWallet/
// setInventory/markPlanetDiscovered/refreshScannerPool) -- no tuning
// value, formula, or generation logic is touched. Gated behind
// isDebugModeEnabled() (debugFlag.ts) at the call site in main.ts, never
// imported/wired into the normal onboarding or new-game path.
//
// Covers profitable-alpha-playtest-plan.md's A1 (raw materials for the
// real refining recipe -- refiner tier itself is a free UI selector,
// RefineScene.ts's own selectedTier, so no crew/seeding dependency
// exists there), A2 (3 threshold-banded craft inputs), B1-B6, and B8. A3/
// A4 (a Grey-tier and a Gold-tier planet, both with real specialties)
// are covered by this file's companion, devGalaxySeed.ts -- see that
// file for why it can't be done here as a normal on-demand setter call.
import { content, setInventory, getInventory } from "./gameState.ts";
import { addBatch } from "./inventory.ts";
import { galaxy, startingPlanet, markPlanetDiscovered } from "./galaxyState.ts";
import { getWallet, setWallet, PLAYER_ID } from "./tradingState.ts";
import { addCrewMember, getCrewRoster } from "./crewState.ts";
import { addShip, getShipRoster, setScannerPool } from "./shipsState.ts";
import { assembleShip } from "../ships/assembleShip.ts";
import { refreshScannerPool } from "../ships/refreshScannerPool.ts";
import { SCANNER_PURCHASE_COST_BY_TIER } from "../data/constants/shipsAndTravelConfig.ts";
import { CREW_CAPACITY_EXPANSION_BASE_COST, CREW_WAGE_BY_TIER, TIER_6_7_PROFESSIONS } from "../data/constants/crewConfig.ts";
import type { Ship } from "../data/types/ship.ts";
import type { ShipComponent } from "../data/types/shipComponent.ts";
import type { ComponentCategory } from "../data/types/componentCategory.ts";
import type { CrewMember } from "../data/types/crewMember.ts";
import type { TierColor } from "../data/types/tierColor.ts";

// Fixed seed, chosen (see the investigation this shortcut was built from)
// because it deterministically rolls a Grey + White scanner pool at
// startingPlanet -- guarantees B6 (scanner purchase) is affordable
// without gambling on refreshScannerPool()'s normal random tier roll.
// Not a new generation rule: refreshScannerPool()'s seed parameter is an
// existing, intended hook (the same one every test in this codebase uses
// for reproducibility) -- this just picks a specific, known-good value
// for it, the same as everything else in this file only ever *calls*
// real entity-creation functions.
const SCANNER_POOL_SEED = "playtest-seed";

// A quality value comfortably inside Blue's 76-85 band (per
// TIER_COLOR_BREAKPOINTS) on every one of the 5 qualities -- same
// "identical value on every quality" pattern refreshShipyardPool()'s own
// generateMatchingQualities() already uses, so the component's own tier
// and the ship's derived aggregate tier land on Blue with no ambiguity.
const BLUE_COMPONENT_QUALITY_VALUE = 80;
const BLUE_TIER: TierColor = "Blue";

function buildBlueComponent(category: ComponentCategory): ShipComponent {
  return {
    id: `playtest-seed-${category}`,
    category,
    qualities: {
      purity: BLUE_COMPONENT_QUALITY_VALUE,
      density: BLUE_COMPONENT_QUALITY_VALUE,
      potency: BLUE_COMPONENT_QUALITY_VALUE,
      durability: BLUE_COMPONENT_QUALITY_VALUE,
      rarity: BLUE_COMPONENT_QUALITY_VALUE,
    },
    tier: BLUE_TIER,
  };
}

// Builds a fully-assembled Blue-tier ship -- enough to test B5 (speed,
// via SHIP_TIER_SPEED_MODIFIER) and B8 (combat, via a real non-Grey
// derived tier feeding resolveCombatChoice()) without a grind. Goes
// through assembleShip() for every slot (never hand-sets ship.tier), the
// same recompute-on-every-install path a real crafted-and-installed
// component would take.
function buildSeededShip(): Ship {
  let ship: Ship = {
    id: "playtest-seed-ship",
    name: "Playtest Runner",
    ownerId: PLAYER_ID,
    tier: "Grey",
    currentPlanetId: startingPlanet.id,
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
  };
  for (const category of ["weapon", "engine", "shield", "cargoHold"] as const) {
    ship = assembleShip(ship, buildBlueComponent(category), category);
  }
  return ship;
}

// 3 crew members spanning Grey, White, and a tier-6/7 (Gold) profession
// holder -- enough to test B2/B3 (crew hire/capacity screens already
// populated) immediately. Built as real CrewMember records directly
// (same shape hireCrew() itself constructs -- see hireCrew.ts) rather
// than routed through hireCrew()'s pool/wallet-deduction machinery, since
// these are seeded as already-hired, not purchased during this session.
function buildSeededCrew(now: number): CrewMember[] {
  const wageFor = (tier: TierColor): number => {
    const entry = CREW_WAGE_BY_TIER.find((row) => row.tier === tier);
    if (!entry) throw new RangeError(`no wage entry for tier ${tier}`);
    return entry.wage;
  };

  const tiers: Array<{ tier: TierColor; profession: string | null }> = [
    { tier: "Grey", profession: null },
    { tier: "White", profession: null },
    { tier: "Gold", profession: TIER_6_7_PROFESSIONS[1] ?? null }, // "Engineer"
  ];

  return tiers.map(({ tier, profession }, index) => ({
    id: `playtest-seed-crew-${index}`,
    hiredByPlayerId: PLAYER_ID,
    tier,
    profession,
    status: "idle",
    assignedCraftId: null,
    hiredAt: now,
    lastCheckedAt: now,
    wageAmount: wageFor(tier),
    lastPaidAt: now,
    unavailableUntil: null,
  }));
}

// Real resource ids from the actual content catalog (content/resources.json),
// looked up defensively (mirrors tradingState.ts's own createSeedListings()
// pattern) rather than assumed present.
const BASELINE_QUALITIES = { purity: 55, density: 55, potency: 55, durability: 55, rarity: 55 };

// The real "ion-forged-hull-plate" recipe (content/recipes.json) needs 1x
// refined-metal (durability >= 60 threshold) + 1x gas, no threshold on the
// gas input. Radiant Alloy Bar / Hydrogen Gas are the real matching
// resources (also already used elsewhere in this codebase's own seed
// data, e.g. tradingState.ts's createSeedListings()). 3 separate
// radiant-alloy-bar batches at different durability values, so
// profitable-alpha-playtest-plan.md's A2 (threshold penalty feel -- once
// comfortably above threshold, once 10-15 points below, once 35-40 points
// below) is runnable immediately with no gather step, in either
// direction, without exceeding the 41+ instant-rejection floor.
const SEED_INVENTORY: ReadonlyArray<{
  resourceId: string;
  quantity: number;
  qualities: typeof BASELINE_QUALITIES;
}> = [
  // A1: raw materials for the real MVP refining recipe (2x Igneous Ore +
  // 1x Autunite Crystal -> Radiant Alloy Bar), enough for ~7 refines.
  { resourceId: "igneous-ore", quantity: 15, qualities: BASELINE_QUALITIES },
  { resourceId: "autunite-crystal", quantity: 10, qualities: BASELINE_QUALITIES },
  // A2 / B1: comfortably above the 60 threshold (75, +15).
  { resourceId: "radiant-alloy-bar", quantity: 2, qualities: { ...BASELINE_QUALITIES, durability: 75 } },
  // A2: 12 points below threshold (60 - 48), inside the documented 10-15 band.
  { resourceId: "radiant-alloy-bar", quantity: 2, qualities: { ...BASELINE_QUALITIES, durability: 48 } },
  // A2: 38 points below threshold (60 - 22), inside the documented 35-40
  // band -- deliberately short of the 41+ reject floor.
  { resourceId: "radiant-alloy-bar", quantity: 2, qualities: { ...BASELINE_QUALITIES, durability: 22 } },
  // A2: the recipe's other input (no threshold) -- one per craft attempt
  // across all 3 radiant-alloy-bar batches above (6 total).
  { resourceId: "hydrogen-gas", quantity: 6, qualities: BASELINE_QUALITIES },
];

function seedInventory(): void {
  let inventory = getInventory();
  for (const { resourceId, quantity, qualities } of SEED_INVENTORY) {
    const exists = content.resources.some((resource) => resource.id === resourceId);
    if (!exists) continue;
    // Idempotent re-run: skip only if this exact batch (same resource AND
    // same rolled qualities) is already present -- resourceId alone isn't
    // a unique key here, since radiant-alloy-bar deliberately has 3
    // distinct batches above.
    const alreadySeeded = inventory.some(
      (batch) => batch.resourceId === resourceId && JSON.stringify(batch.qualities) === JSON.stringify(qualities),
    );
    if (alreadySeeded) continue;
    inventory = addBatch(inventory, { resourceId, quantity, qualities });
  }
  setInventory(inventory);
}

// Wallet target = cheapest real scanner tier cost + one crew capacity
// expansion (slot 3) + a flat trading cushion -- derived from the actual
// tuning constants (not hardcoded guesses) so this stays correct if
// those values change again, per one crew capacity expansion (B3) and
// one scanner purchase (B6) without needing to trade first, while still
// leaving B1's drift/pricing scenarios meaningful rather than trivial.
const TRADING_CUSHION_CREDITS = 800;

function seedWallet(): void {
  const cheapestScannerCost = Math.min(...SCANNER_PURCHASE_COST_BY_TIER.map((row) => row.cost));
  const targetCredits = cheapestScannerCost + CREW_CAPACITY_EXPANSION_BASE_COST + TRADING_CUSHION_CREDITS;
  const wallet = getWallet();
  if (wallet.credits >= targetCredits) return; // idempotent re-run, never claws back credits
  setWallet({ ...wallet, credits: targetCredits });
}

// Discovers a handful of generated planets beyond the 2 structural
// bootstrap planets (startingPlanet + secondaryDiscoveredPlanet, already
// discovered by galaxyState.ts itself) -- 4 more, for 5 total discovered
// beyond the single starting planet, the middle of this file's original
// "requested 4-6" range. Deliberately NOT "every remaining planet" now
// that Alpha Section 3 sets PLANET_COUNT = 50 (galaxyState.ts) -- that
// old "as many as the galaxy has" behavior only ever produced the low
// end of the range because the galaxy itself was too small (5 total) to
// produce more; blindly keeping it now would discover 48 planets instead,
// defeating this seed's own "meaningful playtest subset, not the whole
// galaxy" purpose (the same "not all 50" premise Section 3's own Test 1
// requires -- see profitable-alpha-scale-performance-plan.md). Uses the
// real generated positions (no fabricated coordinates) so B4's short-hop
// -vs-long-trip comparison is testing real distances.
function seedDiscoveredPlanets(): void {
  for (const planet of galaxy.planets.slice(2, 6)) {
    markPlanetDiscovered(planet.id);
  }
}

function seedScannerPool(now: number): void {
  setScannerPool(startingPlanet.id, refreshScannerPool(startingPlanet.id, SCANNER_POOL_SEED, now));
}

// The single entry point -- exposed on `window` from main.ts, behind
// isDebugModeEnabled(), never called from any normal game-start path.
// Idempotent: safe to invoke more than once in a session (won't duplicate
// the seeded ship/crew/inventory or claw back credits already above
// target), except the scanner pool reroll and newly-discovered planets,
// which are cheap/harmless to repeat.
export function seedPlaytestSave(now: number = Date.now()): void {
  seedWallet();

  if (!getShipRoster().some((ship) => ship.id === "playtest-seed-ship")) {
    addShip(buildSeededShip());
  }

  const existingCrewIds = new Set(getCrewRoster().map((member) => member.id));
  for (const member of buildSeededCrew(now)) {
    if (!existingCrewIds.has(member.id)) addCrewMember(member);
  }

  seedInventory();
  seedDiscoveredPlanets();
  seedScannerPool(now);
}
