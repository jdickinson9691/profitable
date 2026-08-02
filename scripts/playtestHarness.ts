// Mechanical playtest harness for docs/profitable-alpha-playtest-plan.md.
//
// Calls the real simulation functions directly (the same functions the
// game itself calls) to produce concrete numbers for every scenario that
// has a mechanical, number-driven component. Deliberately does NOT judge
// "feel" -- every scenario's "Watch for" line asks a subjective question
// (does this feel meaningful / proportionate / worthwhile) that only a
// human playing the real 2D game can answer. This script exists to make
// that judgment call fast (real numbers in front of you) rather than to
// replace it.
//
// C1 (full-loop session pacing) is entirely out of scope here -- it's
// about a session's combined rhythm, which cannot be produced by running
// isolated functions.
//
// Run: npm run playtest (or: node scripts/playtestHarness.ts)
import { loadMvpContent } from "../src/presentation/loadMvpContent.ts";
import { generateGalaxy } from "../src/galaxy/generateGalaxy.ts";
import { refine } from "../src/simulation/refine.ts";
import { craft } from "../src/simulation/craft.ts";
import { rollQualityOnPlanet } from "../src/galaxy/rollQualityOnPlanet.ts";
import { applyDrift, applyRecovery } from "../src/trading/drift.ts";
import { getGlobalPrice } from "../src/trading/globalPrice.ts";
import { calculateTravelTime } from "../src/ships/calculateTravelTime.ts";
import { performScan } from "../src/ships/performScan.ts";
import { resolveEncounters } from "../src/ships/resolveEncounters.ts";
import { resolveCombatChoice } from "../src/ships/resolveCombatChoice.ts";
import { assembleShip } from "../src/ships/assembleShip.ts";
import { CREW_WAGE_BY_TIER, CREW_CAPACITY_EXPANSION_BASE_COST, CREW_CAPACITY_EXPANSION_COST_MULTIPLIER } from "../src/data/constants/crewConfig.ts";
import { SHIP_TIER_SPEED_MODIFIER } from "../src/data/constants/shipsAndTravelConfig.ts";
import { SCANNER_BASE_SCAN_RADIUS, SCANNER_TIER_RADIUS_BONUS } from "../src/data/constants/shipsAndTravelConfig.ts";

import type { ResourceInstance } from "../src/data/types/resourceInstance.ts";
import type { TierColor } from "../src/data/types/tierColor.ts";
import type { Ship } from "../src/data/types/ship.ts";
import type { ShipComponent } from "../src/data/types/shipComponent.ts";
import type { Planet } from "../src/data/types/planet.ts";
import type { Voyage } from "../src/data/types/voyage.ts";
import type { CombatEncounter } from "../src/data/types/combatEncounter.ts";
import type { Scanner } from "../src/data/types/scanner.ts";
import type { PlanetMarketState } from "../src/data/types/planetMarketState.ts";
import type { QualityRoll } from "../src/data/types/quality.ts";

const content = loadMvpContent();

// Same known-good seed devGalaxySeed.ts uses -- verified to roll Grey on
// planet 0, Gold on planet 1 (with a real specialty). Used for A3/A4/B7-B9
// below, which need a guaranteed tier pairing (A3/A4) or don't depend on
// galaxy scale at all (B7-B9 -- their randomness is in the encounter/
// combat rolls, not planet coordinates) -- this 5-planet convenience
// galaxy is fine for those. NOT used for B4/B5/B6 -- see scaleGalaxy below.
const galaxy = generateGalaxy(5, content.resources, "playtest-galaxy-12");
const [greyPlanet, goldPlanet, , orangePlanet] = galaxy.planets;

// docs/profitable-alpha-scale-performance-plan.md locks the real alpha
// galaxy at exactly 50 planets ("Picking one number rather than the
// '40-60' range... 50 planets, generated once per new game via the
// existing seeded generateGalaxy() function, no changes to that
// function's logic or contract"). B4/B5/B6 are all distance/coordinate-
// dependent (travel time, scan radius vs. real planet spacing), so
// running them against the 5-planet devGalaxySeed.ts convenience galaxy
// understates real planet density and produces numbers that don't
// reflect the actual alpha experience -- this is a separate, real
// 50-planet galaxy specifically for those three. No seed significance
// intended beyond reproducibility (unlike playtest-galaxy-12 above, this
// one isn't hand-picked for any particular tier/specialty outcome).
const scaleGalaxy = generateGalaxy(50, content.resources, "alpha-scale-galaxy-50");

function findResource(id: string) {
  const resource = content.resources.find((r) => r.id === id);
  if (!resource) throw new Error(`missing expected resource ${id} in real content`);
  return resource;
}

function stats(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return { min, max, mean: Math.round(mean * 10) / 10, range: max - min };
}

function section(title: string) {
  console.log(`\n${"=".repeat(70)}\n${title}\n${"=".repeat(70)}`);
}

// ---------------------------------------------------------------------
// A1 -- Refining variance feel (Grey vs Gold refiner)
// ---------------------------------------------------------------------
function runA1() {
  section("A1 -- Refining variance (Grey vs. Gold refiner tier)");
  const igneousOre = findResource("igneous-ore");
  const autuniteCrystal = findResource("autunite-crystal");
  const midQuality: QualityRoll = { purity: 60, density: 60, potency: 60, durability: 60, rarity: 60 };
  const inputs: ResourceInstance[] = [
    { resource: igneousOre, quantity: 2, qualities: midQuality },
    { resource: autuniteCrystal, quantity: 1, qualities: midQuality },
  ];

  for (const tier of ["Grey", "Gold"] as const) {
    const outputs: number[] = [];
    for (let i = 0; i < 10; i++) {
      const result = refine(inputs, tier);
      const values = Object.values(result.qualities).filter((v): v is number => v !== null);
      outputs.push(values.reduce((a, b) => a + b, 0) / values.length);
    }
    const s = stats(outputs);
    console.log(
      `  ${tier.padEnd(6)} refiner, 10 runs from base_avg=60: min=${s.min.toFixed(1)} mean=${s.mean} max=${s.max.toFixed(1)} range=${s.range.toFixed(1)}`,
    );
  }
  console.log("  Watch for: Gold's range should be visibly narrower than Grey's (documented variance: Grey -10%/+10%, Gold -0.5%/+15%).");
}

// ---------------------------------------------------------------------
// A2 -- Crafting threshold penalty feel
// ---------------------------------------------------------------------
function runA2() {
  section("A2 -- Crafting threshold penalty (ion-forged-hull-plate, durability >= 60)");
  const recipe = content.recipes.find((r) => r.id === "ion-forged-hull-plate");
  if (!recipe) throw new Error("missing ion-forged-hull-plate recipe in real content");
  const radiantAlloyBar = findResource("radiant-alloy-bar");
  const hydrogenGas = findResource("hydrogen-gas");

  const bands: Array<{ label: string; durability: number }> = [
    { label: "comfortably above threshold (75, +15)", durability: 75 },
    { label: "10-15 points below (48, -12)", durability: 48 },
    { label: "35-40 points below (22, -38)", durability: 22 },
  ];

  for (const { label, durability } of bands) {
    const metalQualities: QualityRoll = { purity: 60, density: 60, potency: 60, durability, rarity: 60 };
    const gasQualities: QualityRoll = { purity: 60, density: 60, potency: null, durability: null, rarity: 60 };
    const inputs: ResourceInstance[] = [
      { resource: radiantAlloyBar, quantity: 1, qualities: metalQualities },
      { resource: hydrogenGas, quantity: 1, qualities: gasQualities },
    ];
    // Grey crafter/schematic -- isolates the threshold penalty itself,
    // no ceiling-raise/forgiveness interaction muddying the comparison.
    const result = craft(inputs, recipe, "Grey", "Grey");
    if (!result.accepted) {
      console.log(`  ${label.padEnd(38)} -> REJECTED: ${result.reason}`);
      continue;
    }
    const values = Object.values(result.qualities).filter((v): v is number => v !== null);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    console.log(`  ${label.padEnd(38)} -> output avg quality: ${mean.toFixed(1)}`);
  }
  console.log("  Watch for: escalation should feel mild at 10-15 below, seriously punishing near 35-40.");
}

// ---------------------------------------------------------------------
// A3 -- Planet tier gathering feel (Grey vs Gold)
// ---------------------------------------------------------------------
function runA3() {
  section("A3 -- Planet tier gathering (Grey vs. Gold planet)");
  if (!greyPlanet || !goldPlanet) throw new Error("expected galaxy to have at least 2 planets");
  console.log(`  Real galaxy planets: ${greyPlanet.id} (${greyPlanet.tier}, ${greyPlanet.planetType}), ${goldPlanet.id} (${goldPlanet.tier}, ${goldPlanet.planetType})`);
  console.log("  Note: these two planet TYPES don't share any eligible resource category in this galaxy");
  console.log("  (Terrestrial vs. GasGiant), so no single resource is producible on both in real play.");
  console.log("  Demonstrating the tier-modifier formula's real effect with the same representative");
  console.log("  resource (Igneous Ore) evaluated against both planet objects directly -- the number is");
  console.log("  real (PLANET_TIER_MODIFIER: Grey -15, Gold +30), the specific pairing is illustrative.");

  const igneousOre = findResource("igneous-ore");
  for (const planet of [greyPlanet, goldPlanet]) {
    const outputs: number[] = [];
    for (let i = 0; i < 10; i++) {
      const rolled = rollQualityOnPlanet(igneousOre, planet);
      const values = Object.values(rolled).filter((v): v is number => v !== null);
      outputs.push(values.reduce((a, b) => a + b, 0) / values.length);
    }
    const s = stats(outputs);
    console.log(`  ${planet.tier!.padEnd(6)} planet, 10 gathers: min=${s.min.toFixed(1)} mean=${s.mean} max=${s.max.toFixed(1)}`);
  }
}

// ---------------------------------------------------------------------
// A4 -- Specialty planet payoff
// ---------------------------------------------------------------------
function runA4() {
  section("A4 -- Specialty resource payoff (same planet, specialty vs. non-specialty resource)");
  if (!goldPlanet?.specialtyResourceId) throw new Error("expected goldPlanet to have a specialty resource");
  const specialtyResource = findResource(goldPlanet.specialtyResourceId);
  const otherResourceId = goldPlanet.producibleResourceIds.find((id) => id !== goldPlanet.specialtyResourceId);
  if (!otherResourceId) throw new Error("expected goldPlanet to produce a second, non-specialty resource");
  const otherResource = findResource(otherResourceId);

  console.log(`  Planet: ${goldPlanet.id} (${goldPlanet.tier}), specialty = ${specialtyResource.id}`);
  for (const [label, resource] of [
    ["specialty resource", specialtyResource],
    ["non-specialty resource", otherResource],
  ] as const) {
    const outputs: number[] = [];
    for (let i = 0; i < 10; i++) {
      const rolled = rollQualityOnPlanet(resource, goldPlanet);
      const values = Object.values(rolled).filter((v): v is number => v !== null);
      outputs.push(values.reduce((a, b) => a + b, 0) / values.length);
    }
    const s = stats(outputs);
    console.log(`  ${label.padEnd(24)} (${resource.id}): mean=${s.mean} (min=${s.min.toFixed(1)}, max=${s.max.toFixed(1)})`);
  }
  console.log("  Documented gap: +15 (SPECIALTY_QUALITY_MODIFIER), additive on top of the tier modifier.");
}

// ---------------------------------------------------------------------
// B1 -- Trading drift feel
// ---------------------------------------------------------------------
function runB1() {
  section("B1 -- Trading drift, floor/ceiling");
  const basePriceEntry = content.resources.length > 0 ? { itemId: "igneous-ore", basePrice: 5 } : null;
  if (!basePriceEntry) throw new Error("expected a base price to demonstrate against");

  let state: PlanetMarketState = {
    planetId: "demo-planet",
    itemId: "igneous-ore",
    currentPrice: basePriceEntry.basePrice,
    basePrice: basePriceEntry.basePrice,
  };
  console.log(`  Base price: ${state.basePrice}cr. Buying 1 unit at a time (each buy nudges price up ${"2%"}):`);
  const trail: number[] = [state.currentPrice];
  for (let i = 0; i < 25; i++) {
    state = applyDrift(state, 1, "buy");
    trail.push(state.currentPrice);
  }
  console.log(`  after 25 buys: ${trail.map((p) => p.toFixed(2)).join(" -> ")}`);
  console.log(`  ceiling (150% of base = ${(state.basePrice * 1.5).toFixed(2)}) reached: ${state.currentPrice >= state.basePrice * 1.5 - 0.01}`);

  const recovered = applyRecovery(state, 24);
  console.log(`  after 24h with no trading, recovers to: ${recovered.currentPrice.toFixed(2)} (from ${state.currentPrice.toFixed(2)})`);

  const globalBuy = getGlobalPrice("igneous-ore", "buy", [state]);
  const globalSell = getGlobalPrice("igneous-ore", "sell", [state]);
  console.log(`  getGlobalPrice() at this state: buy=${globalBuy.toFixed(2)} sell=${globalSell.toFixed(2)}`);
}

// ---------------------------------------------------------------------
// B2 -- Crew wage sustainability
// ---------------------------------------------------------------------
function runB2() {
  section("B2 -- Crew wage sustainability");
  const seededCrewTiers: TierColor[] = ["Grey", "White", "Gold"];
  let dailyWage = 0;
  for (const tier of seededCrewTiers) {
    const wage = CREW_WAGE_BY_TIER.find((row) => row.tier === tier)?.wage ?? 0;
    dailyWage += wage;
    console.log(`  ${tier.padEnd(6)} crew wage: ${wage}cr/day`);
  }
  console.log(`  Total daily upkeep for the seeded 3-crew roster: ${dailyWage}cr/day`);
  console.log("  Compare against B1's per-unit trade economics above (each igneous-ore trade nets ~single-digit cr) --");
  console.log(`  ${dailyWage}cr/day means needing dozens of trades/day just to break even at raw-material prices;`);
  console.log("  refined/crafted goods sell for meaningfully more (see A2's radiant-alloy-bar/hull-plate economics).");
}

// ---------------------------------------------------------------------
// B3 -- Crew capacity cost curve (confirms real constants, no simulation needed)
// ---------------------------------------------------------------------
function runB3() {
  section("B3 -- Crew capacity expansion cost curve");
  for (let n = 1; n <= 4; n++) {
    const cost = CREW_CAPACITY_EXPANSION_BASE_COST * CREW_CAPACITY_EXPANSION_COST_MULTIPLIER ** (n - 1);
    console.log(`  slot ${n + 2}: ${cost}cr`);
  }
}

// ---------------------------------------------------------------------
// B4/B5 -- Travel time feel + ship tier speed payoff (one table, real distances)
// ---------------------------------------------------------------------
function runB4B5() {
  section("B4/B5 -- Travel time across real distances, by ship tier (real 50-planet scale galaxy)");
  function shipWithTier(tier: TierColor): Ship {
    return {
      id: `demo-${tier}`,
      name: `Demo ${tier}`,
      ownerId: "player-1",
      tier,
      currentPlanetId: scaleGalaxy.planets[0]!.id,
      components: { weapon: null, engine: null, shield: null, cargoHold: null },
    };
  }

  // Nearest-neighbor and farthest pair from planet 0, across the real
  // 50-planet scale galaxy -- not the 5-planet convenience one.
  const planets = scaleGalaxy.planets.filter((p) => p.position);
  const distances: number[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i]!.position!;
      const b = planets[j]!.position!;
      distances.push(Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2));
    }
  }
  const shortDistancePair = planets[0]!;
  let nearestOther = planets[1]!;
  let nearestDist = Infinity;
  for (const p of planets.slice(1)) {
    const d = Math.sqrt((p.position!.x - shortDistancePair.position!.x) ** 2 + (p.position!.y - shortDistancePair.position!.y) ** 2);
    if (d < nearestDist) {
      nearestDist = d;
      nearestOther = p;
    }
  }
  let farthestOther = planets[1]!;
  let farthestDist = 0;
  for (const p of planets.slice(1)) {
    const d = Math.sqrt((p.position!.x - shortDistancePair.position!.x) ** 2 + (p.position!.y - shortDistancePair.position!.y) ** 2);
    if (d > farthestDist) {
      farthestDist = d;
      farthestOther = p;
    }
  }

  console.log(`  Short hop: ${shortDistancePair.id} -> ${nearestOther.id} (${nearestDist.toFixed(1)} units)`);
  console.log(`  Long trip: ${shortDistancePair.id} -> ${farthestOther.id} (${farthestDist.toFixed(1)} units)`);
  for (const tier of ["Grey", "White", "Green", "Blue", "Purple", "Orange", "Gold"] as const) {
    const ship = shipWithTier(tier);
    const shortMs = calculateTravelTime(shortDistancePair, nearestOther, ship);
    const longMs = calculateTravelTime(shortDistancePair, farthestOther, ship);
    const bonus = SHIP_TIER_SPEED_MODIFIER.find((r) => r.tier === tier)?.travelTimeMultiplier;
    console.log(
      `  ${tier.padEnd(6)} (${((1 - (bonus ?? 1)) * 100).toFixed(0)}% speed bonus): short=${(shortMs / 3_600_000).toFixed(2)}h  long=${(longMs / 3_600_000).toFixed(2)}h`,
    );
  }
}

// ---------------------------------------------------------------------
// B6 -- Scanner value proposition
// ---------------------------------------------------------------------
function runB6() {
  section("B6 -- Scanner value proposition (real 50-planet scale galaxy, real distances)");
  const dockedPlanet: Planet = { ...scaleGalaxy.planets[0]!, discovered: true };
  const ship: Ship = {
    id: "demo-scan-ship",
    name: "Demo Scanner Ship",
    ownerId: "player-1",
    tier: "Grey",
    currentPlanetId: dockedPlanet.id,
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
  };
  const allPlanets = scaleGalaxy.planets.map((p) => (p.id === dockedPlanet.id ? dockedPlanet : { ...p, discovered: false }));

  for (const tier of ["Grey", "White", "Green", "Blue", "Purple", "Orange", "Gold"] as const) {
    const scanner: Scanner = { id: `demo-scanner-${tier}`, ownerId: "player-1", tier };
    const bonus = SCANNER_TIER_RADIUS_BONUS.find((r) => r.tier === tier)?.radiusBonus ?? 0;
    const result = performScan(ship, dockedPlanet, [scanner], allPlanets);
    const found = result.scanned ? result.newlyDiscovered.length : 0;
    console.log(`  ${tier.padEnd(6)} scanner (radius ${SCANNER_BASE_SCAN_RADIUS}+${bonus}=${SCANNER_BASE_SCAN_RADIUS + bonus}): ${found}/${scaleGalaxy.planets.length - 1} undiscovered planets found`);
  }
}

// ---------------------------------------------------------------------
// B7 -- Travel Encounters frequency and mix (statistical, real random)
// ---------------------------------------------------------------------
function runB7() {
  section("B7 -- Travel Encounters frequency and mix (2000 simulated windows)");
  const ship: Ship = {
    id: "demo-encounter-ship",
    name: "Demo",
    ownerId: "player-1",
    tier: "Grey",
    currentPlanetId: greyPlanet!.id,
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
  };
  const WINDOW_HOURS = 24;
  const TRIALS = 2000;
  const counts: Record<string, number> = { tradeOpportunity: 0, discovery: 0, hazard: 0, combat: 0 };
  let triggered = 0;
  for (let i = 0; i < TRIALS; i++) {
    const voyage: Voyage = {
      id: `demo-voyage-${i}`,
      shipId: ship.id,
      originPlanetId: greyPlanet!.id,
      destinationPlanetId: goldPlanet!.id,
      departedAt: 0,
      arrivesAt: WINDOW_HOURS * 3_600_000,
      cargo: [],
    };
    const { encounters, pendingCombats } = resolveEncounters(voyage, ship, goldPlanet!, content.resources, Math.random);
    if (encounters.length > 0 || pendingCombats.length > 0) triggered += 1;
    for (const e of encounters) counts[e.type] = (counts[e.type] ?? 0) + 1;
    counts.combat! += pendingCombats.length;
  }
  console.log(`  Trigger rate: ${((triggered / TRIALS) * 100).toFixed(1)}% (documented: 20%)`);
  const totalEvents = Object.values(counts).reduce((a, b) => a + b, 0);
  for (const [type, count] of Object.entries(counts)) {
    console.log(`  ${type.padEnd(16)}: ${count} (${totalEvents > 0 ? ((count / totalEvents) * 100).toFixed(1) : "0"}% of events)`);
  }
  console.log("  Documented split: tradeOpportunity 40% / discovery 35% / hazard 20% / combat 5%.");
}

// ---------------------------------------------------------------------
// B8 -- Combat outcomes (win rate by matchup, plus a loss example)
// ---------------------------------------------------------------------
function runB8() {
  section("B8 -- Combat outcomes by weapon tier vs. opponent threat tier");
  function shipWithWeapon(tier: TierColor): Ship {
    const weapon: ShipComponent | null =
      tier === "Grey"
        ? null
        : { id: `demo-weapon-${tier}`, category: "weapon", qualities: { purity: 80, density: 80, potency: 80, durability: 80, rarity: 80 }, tier };
    let ship: Ship = {
      id: `demo-combat-ship-${tier}`,
      name: `Demo ${tier}`,
      ownerId: "player-1",
      tier: "Grey",
      currentPlanetId: greyPlanet!.id,
      components: { weapon: null, engine: null, shield: null, cargoHold: null },
    };
    if (weapon) ship = assembleShip(ship, weapon, "weapon");
    return ship;
  }

  const matchups: Array<[TierColor, TierColor]> = [
    ["Grey", "Grey"],
    ["Blue", "Grey"],
    ["Blue", "Gold"],
    ["Gold", "Gold"],
  ];
  const TRIALS = 500;
  for (const [weaponTier, opponentTier] of matchups) {
    let wins = 0;
    for (let i = 0; i < TRIALS; i++) {
      const ship = shipWithWeapon(weaponTier);
      const encounter: CombatEncounter = {
        id: `demo-combat-${i}`,
        voyageId: "demo-voyage",
        triggerContext: "travel",
        opponentThreatTier: opponentTier,
        status: "pending",
        outcome: null,
        windowIndex: 0,
      };
      const voyage: Voyage = {
        id: "demo-voyage",
        shipId: ship.id,
        originPlanetId: greyPlanet!.id,
        destinationPlanetId: goldPlanet!.id,
        departedAt: 0,
        arrivesAt: 3_600_000,
        cargo: [],
      };
      const resolution = resolveCombatChoice(
        encounter,
        "attack",
        voyage,
        ship,
        greyPlanet!,
        greyPlanet!,
        [],
        0,
        "demo-retreat",
        Math.random,
      );
      if (resolution.combatEncounter.outcome === "win") wins += 1;
    }
    console.log(`  weapon=${weaponTier.padEnd(6)} vs opponent=${opponentTier.padEnd(6)}: ${((wins / TRIALS) * 100).toFixed(1)}% win rate over ${TRIALS} trials`);
  }

  // A single, deterministic loss example to show the consequence numbers.
  const ship = shipWithWeapon("Grey"); // no weapon installed
  const encounter: CombatEncounter = {
    id: "demo-loss",
    voyageId: "demo-voyage",
    triggerContext: "travel",
    opponentThreatTier: "Gold",
    status: "pending",
    outcome: null,
    windowIndex: 0,
  };
  const voyage: Voyage = {
    id: "demo-voyage",
    shipId: ship.id,
    originPlanetId: greyPlanet!.id,
    destinationPlanetId: goldPlanet!.id,
    departedAt: 0,
    arrivesAt: 3_600_000,
    cargo: [],
  };
  const crew = [
    {
      id: "demo-crew",
      hiredByPlayerId: "player-1",
      tier: "Grey" as TierColor,
      profession: null,
      status: "idle" as const,
      assignedCraftId: null,
      hiredAt: 0,
      lastCheckedAt: 0,
      wageAmount: 5,
      lastPaidAt: 0,
      unavailableUntil: null,
    },
  ];
  // Force a loss: no weapon (Grey floor) vs. Gold opponent, real rolls.
  let resolution = resolveCombatChoice(encounter, "attack", voyage, ship, greyPlanet!, greyPlanet!, crew, 0, "demo-retreat", Math.random);
  let attempts = 0;
  while (resolution.combatEncounter.outcome !== "lose" && attempts < 200) {
    const freshEncounter: CombatEncounter = { ...encounter, status: "pending", outcome: null };
    resolution = resolveCombatChoice(freshEncounter, "attack", voyage, ship, greyPlanet!, greyPlanet!, crew, 0, "demo-retreat", Math.random);
    attempts += 1;
  }
  if (resolution.combatEncounter.outcome === "lose") {
    console.log(`  Loss example (took ${attempts + 1} tries to roll one): crew unavailable until ${resolution.updatedCrewMember?.unavailableUntil}ms (documented: 24h = 86400000ms)`);
  } else {
    console.log("  Loss example: no loss rolled in 200 attempts at this matchup -- Grey weapon vs Gold opponent apparently favors the player often (real data, worth a closer look).");
  }
}

// ---------------------------------------------------------------------
// B9 -- Hazard failure cost curve (all 5 bands, controlled rolls)
// ---------------------------------------------------------------------
function runB9() {
  section("B9 -- Hazard failure cost curve (all 5 documented bands)");
  const ship: Ship = {
    id: "demo-hazard-ship",
    name: "Demo",
    ownerId: "player-1",
    tier: "Grey",
    currentPlanetId: greyPlanet!.id,
    components: { weapon: null, engine: null, shield: null, cargoHold: null },
  };
  // HAZARD_PASS_THRESHOLD = 50, Grey ship = +0 roll bonus. A 1-100 roll of
  // R gives effectiveRoll = R, pointsBelow = 50 - R for R < 50.
  const targetPointsBelow = [5, 15, 25, 35, 45];
  for (const pointsBelow of targetPointsBelow) {
    const rawRoll = 50 - pointsBelow; // 1-100 scale
    const rollRandomValue = (rawRoll - 1) / 100; // inverts Math.floor(x*100)+1 === rawRoll
    let call = 0;
    const sequence = [0.05, 0.8, rollRandomValue]; // trigger(<0.2), hazard bucket [0.75,0.95), the roll
    const random = () => sequence[call++] ?? Math.random();
    const voyage: Voyage = {
      id: "demo-hazard-voyage",
      shipId: ship.id,
      originPlanetId: greyPlanet!.id,
      destinationPlanetId: goldPlanet!.id,
      departedAt: 0,
      arrivesAt: 24 * 3_600_000, // exactly 1 window
      cargo: [],
    };
    const { encounters } = resolveEncounters(voyage, ship, goldPlanet!, content.resources, random);
    const hazard = encounters.find((e) => e.type === "hazard");
    if (hazard && hazard.type === "hazard") {
      console.log(`  ${String(pointsBelow).padStart(2)} points below threshold -> ${hazard.outcome.passed ? "passed" : `failed, ${hazard.outcome.creditsLost}cr lost`}`);
    } else {
      console.log(`  ${String(pointsBelow).padStart(2)} points below threshold -> (no hazard produced -- check sequencing)`);
    }
  }
  console.log("  Documented curve (base 50cr): 50 / 100 / 200 / 350 / 500cr across the 5 bands.");
}

function main() {
  console.log("Profitable -- Playtest Harness (mechanical numbers only, no feel judgments)");
  console.log(`Convenience galaxy (5 planets, seed "playtest-galaxy-12"): ${galaxy.planets.map((p) => `${p.tier}`).join(", ")}`);
  const tierCounts: Record<string, number> = {};
  for (const p of scaleGalaxy.planets) tierCounts[p.tier ?? "?"] = (tierCounts[p.tier ?? "?"] ?? 0) + 1;
  console.log(
    `Scale galaxy (50 planets, seed "alpha-scale-galaxy-50"), tier distribution: ${Object.entries(tierCounts)
      .map(([tier, count]) => `${tier}=${count}`)
      .join(", ")}`,
  );
  // Alpha Section 3's own "worth confirming this empirically... not just
  // asserting it should work" -- Planet Type is the other axis the plan
  // doc names alongside tier.
  const typeCounts: Record<string, number> = {};
  for (const p of scaleGalaxy.planets) typeCounts[p.planetType ?? "?"] = (typeCounts[p.planetType ?? "?"] ?? 0) + 1;
  console.log(
    `Scale galaxy (50 planets, seed "alpha-scale-galaxy-50"), Planet Type distribution: ${Object.entries(typeCounts)
      .map(([type, count]) => `${type}=${count}`)
      .join(", ")}`,
  );

  runA1();
  runA2();
  runA3();
  runA4();
  runB1();
  runB2();
  runB3();
  runB4B5();
  runB6();
  runB7();
  runB8();
  runB9();

  section("C1 -- Full-loop session pacing");
  console.log("  Not automatable -- pacing/rhythm across a real session requires actually playing it.");
  console.log("  Everything above gives you the per-system numbers faster; C1 still needs a real playthrough.");
}

main();
