# Unity Migration — Phase 2 Checklist

**What this is:** a concrete, actionable checklist for getting Profitable's Alpha-milestone functionality running in Unity, beyond Migration Phase 1's MVP loop (gather → refine → craft). "Alpha Phase 2" here means `docs/profitable-unity-migration-gdd.md`'s **Migration Phase 2+** — the GDD explicitly scopes that as "future GDDs, not scoped here" (§2), and `docs/functional-agents/build.md` is the *meta-agent contract* that computes readiness and generates agent rosters, but is itself a spec for an orchestrator, not a followable task list. This file is that followable task list, recomputed fresh against today's actual code state (2026-08-03) rather than `build.md`'s own example table, which is already stale in several places (see below).

**How to use this doc:** work top to bottom. Each sub-phase below is independently portable once its prerequisites are checked — they don't have to run in the listed order, but *within* a sub-phase the role order (Schema → Simulation Core → Parity Validation → Infrastructure Adapters → Presentation → Phase Integration) is a real dependency chain, same as Migration Phase 1 proved out. Do not skip Parity Validation for any sub-phase — see `profitable-unity-migration-gdd.md` §6.

**On agent numbering:** this file deliberately does **not** pre-assign specific `docs/agents/agent-N-*` numbers to any task below. `build.md` itself found a real numbering collision once already (Agent 37 was claimed by Planet Ownership Core while a Phase 2 roster still assumed 36 was the ceiling) — precisely the "never trust a cached snapshot" failure mode this project explicitly guards against. When a task below is actually started, check `ls docs/agents/` fresh, use the next free number, and write that task's own contract file at that time.

---

## 0. Prerequisites — do these before starting any sub-phase below

- [x] **Write `docs/functional-agents/crew.md`.** Done — the core Crew system (hire/wage/upkeep/attrition — `src/crew/hireCrew.ts`, `assignToCraft.ts`, `payUpkeep.ts`, `checkAttrition.ts`, `dismissCrew.ts`, `purchaseCapacity.ts`, `refreshCrewPool.ts`, `resolveBackgroundCrafting.ts`) now has a consolidated contract (`docs/functional-agents/crew.md`), matching every other functional area's shape. `BACKGROUND_IDLE_OUTPUT_RATE` is now resolved (0.5/hour) with real inventory consumption wired into `CrewScene`'s `> Check Background` action. `CREW_POOL_REFRESH_INTERVAL_HOURS` now correctly re-rolls a stale pool (`getCrewPool()`) — the same fix landed for the shipyard/scanner pools' identical gap (`getShipyardPool()`/`getScannerPool()`, `travel.md`). No known Crew gaps remain.
- [ ] **Confirm the Phase 1 baseline is still green** before adding anything on top of it: `cd unity && dotnet build && dotnet test`, and regenerate the parity corpus (`npm run parity` from repo root) to confirm it still matches `unity/ProfitableCore.Tests/Parity`'s expectations. A silent Phase 1 regression would poison every sub-phase built on top of it.
- [ ] **Re-run the readiness table below against `docs/functional-agents/*.md`'s live Status lines** if any time has passed since 2026-08-03 — this file decays the same way `build.md` warns its own cached table does. Do not trust this snapshot without re-checking.

---

## 1. Readiness table (recomputed 2026-08-03 — corrects `build.md`'s own example table)

| Area | `docs/functional-agents/` file(s) | TS status today | Change vs. `build.md`'s table |
|---|---|---|---|
| Galaxy generation | `galaxy.md` | Fully as-built | Unchanged — already correct |
| Planet generation | `planet.md` | Fully as-built | Unchanged |
| Mining | `mining.md` | Fully as-built | Unchanged |
| Refining | `refining.md` | Fully as-built | Unchanged |
| Crafting | `crafting.md` | Fully as-built | Unchanged |
| Recipes/Schematics | `recipes-schematics.md` | Fully as-built | Unchanged |
| Planetary Markets | `planetary-markets.md` | Fully as-built | Unchanged |
| Galactic Market | `galactic-market.md` | Fully as-built | Unchanged |
| **Travel (incl. Scanner)** | `travel.md` | **Fully as-built** — Ship Fuel/Cargo Hold Capacity preconditions on `initiateVoyage()` now built | **Corrected: was "Partially," now Yes** |
| **Ship** | `ship.md` | **Mostly built** — all 5 Crew Role effects now built including Systems Engineer's repair (task #89); only polish gaps remain (no `> Unassign` action, no starting-ship fuel bootstrap, one unverified numeric claim) — none of these are unbuilt *design* scope | **Corrected: was "No," now effectively Yes** — see the honest caveat in Sub-Phase D below |
| Encounters/Combat | `encounters-combat.md` | Fully as-built | Unchanged |
| **Planet Ownership** | `planet-ownership.md` | **Now fully as-built** — Colonist-Driven Production, Citadel claim/build, refuel discount, and depth-scaled repair (Level 2 reduced, Level 3 full) all built. Level 2's original "cargo storage" benefit was repurposed into the repair tier, not left as a gap — see the file's own status note for why (the target mechanic, remote-cargo voyages, was itself never given a player-facing UI) | **Corrected: was "Partially" with 1 gap, now Yes** |
| Crew (core) | `crew.md` — **now exists, doc gap closed (§0)** | Fully as-built (`agent-16-crew-core.md`); `BACKGROUND_IDLE_OUTPUT_RATE` resolved (0.5/hour); `CREW_POOL_REFRESH_INTERVAL_HOURS` now correctly re-rolls a stale pool. No known gaps remain | **Yes** |
| Universe | `universe.md` | Fully designed, zero code | **No** — deliberately unscheduled, excluded entirely, not just blocked |

**Bottom line: everything except Universe is TS-ready simultaneously.** What was originally sequenced as separate Migration Phases 2 (Galaxy/Planet) → 3 (Trading) → 4 (Crew) → 5 (Ships/Travel) → Combat is, as of today, one large bundle of ready work with zero remaining TS-side blockers — Crew's documentation gap and Planet Ownership's cargo-storage question (the two blockers noted in earlier revisions of this table) are both closed. The sub-phases below stay separated to mirror the original TypeScript Creation Order and keep each Parity Validation pass scoped and reviewable — not because they're blocked on each other.

---

## Sub-Phase A: Galaxy, Planet, Mining

**Covers:** `galaxy.md`, `planet.md`, `mining.md`. Fully as-built, zero blockers.

- [ ] **Schema.** Extend `unity/ProfitableCore/Schema/Planet.cs` (already exists from Phase 1's base schema) with the fields added since: `producibleResourceIds`, `specialtyResourceId`, `resourceQualities`, `colonistCount`, `citadelLevel`, `ownedByPlayerId` (the last three merge in from Planet Ownership — schema them here even though the *behavior* they gate is Sub-Phase E's job, since `Planet` is one type). Port `PlanetType`, the tier/type/resource-subset constant tables (`src/data/constants/` galaxy-adjacent tables).
- [ ] **Simulation Core.** Port `generateGalaxy.ts`, `generatePlanet.ts`, `seededRandom.ts`, `resourceSubset.ts`, `rollQualityOnPlanet.ts`, `planetResourceCycle.ts` (the live-derived reset cycle — `getPlanetResourceCycleIndex`/`generateResourcesForCycle`/`getCurrentPlanetResources`, zero persisted state). Fresh check for the integer-boundary-vs-fractional-input risk (`profitable-unity-migration-gdd.md` §3) on every tier/type breakpoint comparison in this batch, even though none of them have exhibited the bug yet.
- [ ] **Parity Validation.** Regenerate the parity corpus (`npm run parity`) to include galaxy-generation and resource-cycle cases; prove seeded-RNG determinism holds identically in C# (same seed → same galaxy, same planet, same resource-cycle output at the same `now`).
- [ ] **Infrastructure Adapters.** None expected — no new adapter type beyond Phase 1's `SaveSystem`/`AudioManager`.
- [ ] **Presentation.** Rewrite the Unity equivalents of `MapScene`/`GatherScene`'s galaxy-facing parts (galaxy overview, planet detail, gather action) as real Unity scenes — full rewrite per the GDD's own table, not a mechanical port.
- [ ] **Phase Integration.** Wire galaxy/planet generation + gathering into the existing Unity MVP loop; confirm gather → refine → craft still works end-to-end against real generated planets instead of Phase 1's static test content; confirm the existing web/Electron build is untouched.

---

## Sub-Phase B: Trading (Planetary + Galactic Market)

**Covers:** `planetary-markets.md`, `galactic-market.md`. Fully as-built, zero blockers. Two files, same core (`src/trading/`), different presentation screens — port together, present separately, per those files' own split rationale.

- [ ] **Schema.** Port `Listing`, `PlanetMarketState`, `Wallet` types and the tunable pricing/fee/expiry constants (drift %, floor/ceiling, recovery rate, markup/discount, transaction fee, listing expiry, season cycle, emergency trigger/duration).
- [ ] **Simulation Core.** Port `createListing.ts`, `purchaseListing.ts`, `drift.ts`, `season.ts`, `emergency.ts`, `expireListings.ts`, `globalPrice.ts`, `loadTradingContent.ts`, `sellToMarket.ts`, `sellToGlobalMarket.ts`. Fresh fractional-boundary check on the tier-restriction/emergency-window comparisons specifically — these are exactly the "table/breakpoint/threshold" shape §3 warns about.
- [ ] **Parity Validation.** Corpus must cover drift/recovery over elapsed time, the global-price invariant (buy never beats best planet sell, sell never beats best planet buy), and both instant-sell functions' fee math against `purchaseListing()`'s own.
- [ ] **Infrastructure Adapters.** None expected.
- [ ] **Presentation.** Rewrite `MarketScene`/`GlobalMarketScene`/`TradeMapScene`'s trading-facing parts as real Unity scenes, including the `> Sell Now` instant-sell actions.
- [ ] **Phase Integration.** Wire trading into the loop; confirm a full gather → refine → craft → trade cycle works end-to-end in Unity; confirm Sub-Phase A's parity proof still holds (regression, not just new-feature correctness).

---

## Sub-Phase C: Crew (core hire/wage/upkeep/attrition)

**No longer blocked — `docs/functional-agents/crew.md` now exists (§0).** The TS side itself is fully as-built (`docs/agents/agent-16-crew-core.md`, consolidated in `crew.md`).

- [ ] **Schema.** Port `CrewMember`, `CrewCandidate`, `PlanetCrewPool`, `CrewCapacity` types, wage table, hire-cost table, capacity-cost curve, upkeep grace period constant, pool size/refresh-interval constants.
- [ ] **Simulation Core.** Port `hireCrew.ts`, `assignToCraft.ts`, `payUpkeep.ts`, `checkAttrition.ts`, `dismissCrew.ts`, `purchaseCapacity.ts`, `refreshCrewPool.ts`, `resolveBackgroundCrafting.ts` (including its `maxUnits` real-inventory-availability cap parameter, the same "core function never touches Inventory, caller passes in what's available" pattern `buildCitadel()` already established).
- [ ] **Parity Validation.** Corpus covers wage/capacity-cost curves per tier, the 48h upkeep grace period boundary (another fractional-elapsed-time comparison — same §3 risk class), background-crafting's real production math at the resolved 0.5/hour default *and* the explicit-`null`-override "not available" path, and the `maxUnits` cap correctly capping `unitsCompleted` below the elapsed-time-derived count.
- [ ] **Infrastructure Adapters.** None expected.
- [ ] **Presentation.** Rewrite `CrewScene` as a real Unity scene (hire/assign/pay-upkeep/dismiss/purchase-capacity actions).
- [ ] **Phase Integration.** Wire crew into the loop; confirm assigning crew to a craft action actually affects `craft()`'s output in the Unity build the same way it does in TypeScript.

---

## Sub-Phase D: Ships & Travel (incl. Scanner)

**Covers:** `ship.md`, `travel.md`. Both effectively fully as-built as of today — see the honest caveat below before treating this as zero-risk.

- [ ] **Honest pre-check, not a blocker but worth doing first:** `ship.md` itself flags several polish gaps that don't block porting but are worth resolving or consciously deferring before or during this sub-phase: no `STARTING_SHIP_FUEL_CAPACITY` application path (no new-game ship bootstrap exists in TS at all — decide whether Unity's own onboarding needs one, since there's no TS behavior to port for it), no regression test locking in "Blue is the first always-reachable-in-one-hop tier" (port the *code* as-is; this is a missing TS test, not missing TS behavior), and `resolveComponentRepair()`'s current caller (`ShipStatusScene`'s manual `> Check Repair` button) is a deliberate design choice to carry forward faithfully, not a gap to "fix" by making Unity's version automatic.
- [ ] **Schema.** Port `Ship`, `ShipComponent`, `ComponentCategory`, `Voyage`/`VoyageCargoItem`, `Scanner`/`ScannerPool`, `ShipCrewRole`, fuel/cargo-hold/speed/crew-slot tier tables, the 5 role-effect rate tables (Pilot tier table, Combat Engineer mitigation, Science Officer radius bonus, Crafter/Systems Engineer repair rates, Citadel Level 3 repair rate).
- [ ] **Simulation Core.** Port `calculateDistance.ts`, `calculateTravelTime.ts`, `calculateFuelCost.ts`, `deriveFuelCapacity.ts`, `deriveShipTier.ts`, `assembleShip.ts`, `initiateVoyage.ts`, `resolveArrival.ts`, `resolveEncounters.ts`, `resolveCombatChoice.ts`, `initiateCombat.ts`, `performScan.ts`, `purchaseShip.ts`, `purchaseScanner.ts`, `refreshShipyardPool.ts`, `refreshScannerPool.ts`, `refuelShip.ts` (including its Citadel-discount branch — needs `Planet.citadelLevel`/`ownedByPlayerId` from Sub-Phase A's schema), `getCrewSlotsForShip.ts`, `assignToShipRole.ts`, `resolveComponentRepair.ts` (including its Citadel Level 3 branch, same schema dependency). **Also port the pool-staleness check now wired into `getShipyardPool()`/`getScannerPool()`** (`src/presentation/shipsState.ts`) — a real fix landed this pass (`travel.md`'s own status note): compare elapsed time since the stored pool's `lastRefreshedAt` against `SHIPYARD_POOL_REFRESH_INTERVAL_HOURS`/`SCANNER_POOL_REFRESH_INTERVAL_HOURS`, re-roll via the refresh function when stale. This lives in the TS presentation/state layer, not `src/ships/`, so it's easy to miss porting if only the `src/ships/*.ts` file list above is checked — Unity's own state-management equivalent needs the same comparison, not just the pure pool-generation functions.
- [ ] **Parity Validation.** Corpus covers travel-time/fuel-cost across the galaxy's real coordinate range, the fuel-capacity-never-strands-a-route invariant, combat's weapon-tier-vs-opponent-threat formula, and the full Systems-Engineer/Crafter/Citadel-Level-3 repair-rate stacking matrix (mirror `tests/ships/resolveComponentRepair.test.ts`'s 16 cases directly — don't re-derive the stacking rules from the GDD prose, port the already-tested behavior).
- [ ] **Infrastructure Adapters.** None expected.
- [ ] **Presentation.** Rewrite `ShipyardScene`, `ShipAssemblyScene`, `ShipStatusScene` (including the `> Check Repair` action and per-component durability readout), and the travel/scanner-facing parts of `TradeMapScene` as real Unity scenes.
- [ ] **Phase Integration.** Wire ships/travel/crew-roles into the loop; confirm a voyage can actually be initiated, resolved, and (if a Systems Engineer or Citadel is involved) repaired in the Unity build; confirm this doesn't regress Sub-Phases A/B's parity.

---

## Sub-Phase E: Planet Ownership (Colonists + Citadels)

**Covers:** `planet-ownership.md`. Fully as-built now, including all 3 Citadel levels — nothing to exclude.

- [ ] **Schema.** `colonistCount`/`citadelLevel`/`ownedByPlayerId` (already scoped into Sub-Phase A's `Planet.cs` extension above — don't duplicate, just confirm those fields exist before this sub-phase starts), `CITADEL_LEVEL_BENEFITS` table, `MINIMUM_COLONISTS_TO_PRODUCE` constant. Port the `planetOwnershipState` persisted side-table pattern as its own save-data shape (mirrors `discoveredPlanetIds`) — **must not** bake these fields into whatever regenerates `Planet` from the galaxy seed, same rule the TS side enforces.
- [ ] **Simulation Core.** Port `transportColonists.ts`, `claimPlanet.ts`, `buildCitadel.ts`, `mergePlanetOwnership.ts`. The colonist gathering-gate itself lives in `getCurrentPlanetResources()` (Sub-Phase A) as a presentation-layer check in TS today, not inside the function — port that exact seam, don't "improve" it into the core function during translation (§6: no design changes during porting). Port `resolveComponentRepair()`'s Citadel Level 2/3 rate lookup (Sub-Phase D) exactly — don't re-derive "which level gets which rate" independently here; it's one function's job, not two.
- [ ] **Parity Validation.** Corpus covers the docking-required rejection for all three actions, the colonist-threshold gate, citadel level-sequencing (no skipping), the persistence round-trip (colonize/claim/build, reload from the same seed, confirm the side-table merge still shows correct state), and the refuel-discount/repair-rate lookups by citadel level (shared with Sub-Phase D's own corpus — don't duplicate, cross-reference).
- [ ] **Infrastructure Adapters.** None expected — reuses Phase 1's `SaveSystem` for the new side-table.
- [ ] **Presentation.** Add the `> Transport N Colonists` / `> Claim Planet` / `> Build Citadel to Level N` actions to whatever Unity scene covers `GatherScene`'s job (built in Sub-Phase A).
- [ ] **Phase Integration.** Confirm colonizing/claiming/building in the Unity build persists correctly across a reload, exactly like the TS regression test does; confirm a docked ship at an owned Level 2+ citadel actually gets the refuel discount and repair rate in the Unity build, not just the schema fields existing.

---

## Sub-Phase F: Encounters & Combat (incl. Travel Encounters)

**Covers:** `encounters-combat.md`. Fully as-built, zero blockers. Depends on Sub-Phase D (shares `resolveArrival()`'s entry point and ship/combat schema).

- [ ] **Schema.** Port `CombatEncounter`, `PendingCombat`, `EncounterResult`, encounter-type weight table, hazard cost-curve table, trigger-chance constants.
- [ ] **Simulation Core.** Confirm `resolveEncounters.ts`/`resolveCombatChoice.ts`/`initiateCombat.ts` (already listed in Sub-Phase D, since they live in `src/ships/`) are ported with this area's own test lens: the pending→resolved deferred-combat mechanism, opponent threat rolled once at detection never re-rolled at resolution, cargo never forfeited on any outcome.
- [ ] **Parity Validation.** Corpus covers the encounter-type weight distribution (structural/statistical, not exact-match, same as the TS suite's own "roughly X% across many trials" tests), the deferred-combat pending state surviving until a player choice resolves it, and the retreat-voyage mechanism.
- [ ] **Infrastructure Adapters.** None expected.
- [ ] **Presentation.** Build the Unity equivalent of the combat-choice UI (attack/flee) and the pending-combat indicator wherever `TradeMapScene` surfaces it today.
- [ ] **Phase Integration.** Confirm a forced/rolled encounter resolves correctly through the real Unity build end-to-end, confirming Sub-Phase D's parity still holds.

---

## Explicitly excluded / deferred (not part of this checklist)

- **Universe / Multiplayer** (`universe.md`) — fully designed, zero code on the TypeScript side, deliberately unscheduled until the project moves toward being a packaged app. Nothing to port yet on either side.
- **UI/UX polish parity** (debug/tuning panel, onboarding tooltip flow, settings screen, tier-color accessibility pass — Alpha Section 4) — not named in any sub-phase above because these are Phaser-specific presentation features, not simulation logic; whether/how they get a Unity equivalent is a presentation-design question for whoever builds each sub-phase's Presentation role, not a porting task with a TypeScript source of truth to translate.
- **Electron packaging** (Alpha Section 5) — has no Unity analog; Unity has its own native build/packaging pipeline, out of scope for this migration checklist entirely.

---

## Definition of "Unity Alpha Phase 2 Complete"

- Every sub-phase above (A through F) has a completed six-role roster (or five, where no new Infrastructure Adapter was needed) with its own Parity Validation and Phase Integration both reporting success, per `profitable-unity-migration-gdd.md` §6's non-negotiable numeric-parity standard.
- A player can complete the full loop — gather → refine → craft → trade → travel → crew → ships → colonize/claim a planet → combat — entirely inside the Unity build, using the real, existing content (`content/*.json`, consumed as-is, never re-authored).
- Every sub-phase's parity corpus still passes together, in one run, at the end — proving later sub-phases didn't silently regress earlier ones.
- The existing web/Electron TypeScript build (`src/`, `content/`) is provably untouched throughout — it remains live and deployable the entire time, per the GDD's own "not a cutover" framing.
- All TS-side prerequisites are already closed as of this checklist's current revision: Crew's documentation gap (§0) and Planet Ownership's cargo-storage question (repurposed into a Level 2 repair tier, Sub-Phase E) are both resolved — nothing left blocking any sub-phase above on the TypeScript side.
