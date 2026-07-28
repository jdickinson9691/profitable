# tests

Primarily owned by the **Validation/Test Agent** (GDD §5.2, agent 3):
automated tests proving the Simulation Core Agent's output matches the
GDD's tables and formulas exactly — not just "it runs," but "it runs
correctly" (e.g. a gold-tier refiner narrows variance to -0.5%/+15% exactly,
not approximately). Must cover: quality roll distribution and clamping
(1–100), null/NA exclusion, refining formula at each refiner tier, refund
chance behavior, crafting formula at each crafter/schematic tier
combination, the threshold penalty curve including the hard floor at 41+
points below threshold, and the +18% combined ceiling cap.

This agent tests and reports only — it must never modify Simulation Core
logic to make a failing test pass.

Other agents own their *own* testing requirements per their contracts (e.g.
Agent 4's round-trip and browser-API-isolation checks) but their tests still
live under this shared top-level `tests/` tree, mirroring `src/`'s layout,
rather than each agent inventing its own test location.

**Running tests:** `npm test` runs `node --test`, which recursively
discovers `*.test.ts` files (Node's built-in type-stripping runs them
directly, no build step or transpiler needed — confirmed working on the
Node version this project targets). Mirror `src/`'s folder layout here
(e.g. `tests/simulation/refine.test.ts`) so each test file's home maps
obviously to the module it covers.

**Status:** every table row in GDD §3.2/§3.3 now has its own passing test
asserting the exact documented value, hardcoded independently of the
constant it checks (not derived from it — a table typo would be caught, not
silently rubber-stamped). `simulation/tierColor.test.ts` covers
`getTierColor`'s boundary table exactly (all 13 breakpoint values plus
out-of-range rejection). `simulation/rollQuality.test.ts` covers
range/integer correctness, null (not zero) exclusion, and exact behavior
under an injected deterministic random function. `simulation/refine.test.ts`
independently asserts every row of `TIER_VARIANCE` and `REFUND_CHANCE`
against literal GDD values, plus quantity-weighted straight averaging
(including null exclusion), the exact variance range at all 7 refiner
tiers, refund chance keyed to the *output* tier (including Gold's secondary
refund unit), and a no-failure smoke test. `simulation/craft.test.ts`
independently asserts every row of `SCHEMATIC_TIER_CONTRIBUTION`, plus the
+18% combined ceiling cap, the exact threshold penalty curve (all 5 bands +
the 41+ rejection floor), schematic forgiveness shifting the effective
points-below-threshold across a band boundary without ever fully
cancelling the penalty, an explicit order-of-operations check
(ceiling+variance before penalty, not after), null exclusion from the
threshold check, and the full MVP recipe end-to-end against a
hand-calculated value.

`fixtures/resources.ts` holds reusable `Resource` fixtures for the MVP
resources (Igneous Ore, Hydrogen Gas, Autunite Crystal, Radiant Alloy Bar);
`fixtures/instances.ts` builds `ResourceInstance`s from them;
`fixtures/recipes.ts` holds the MVP crafting recipe; `fixtures/random.ts`
provides `queueRandom()` for pinning down an exact sequence of random()
calls. None of this is authoritative content — just shapes for exercising
Agent 2's functions ahead of Agent 6's real config.

`adapters/saveSystem.test.ts` covers Agent 4's `SaveSystem` behavior: a
save/load round-trip, confirmation that `save()` actually writes through
the injected `StorageLike` backend (not a parallel structure), and `load()`
returning `null` for a missing key. `fixtures/storage.ts` provides
`createMemoryStorage()`, an in-memory stand-in for `localStorage`.

`adapters/audioManager.test.ts` covers `AudioManager`: `play()` creates and
starts a fresh voice, a second `play()` on the same sound stops the first
voice before starting a new one (real `AudioBufferSourceNode`s are
one-shot), `stop()` stops the active voice and is a safe no-op when nothing
is playing, and `play()` throws for an unregistered sound id.
`fixtures/audio.ts` provides `createTrackedRegistry()`, a fake
`SoundRegistry` whose voices record whether they were started/stopped.

`adapters/networkAdapter.test.ts` confirms the stub's three methods are
callable no-ops (that's the entire contract for MVP — no WebSocket-backed
implementation is required yet).

`adapters/browserApiIsolation.test.ts` is Agent 4's shared architectural
check (covers both `SaveSystem` and `AudioManager` in one pass rather than
duplicating the file-walk per adapter): walks `src/` via
`fixtures/sourceFiles.ts`'s `collectTsFiles()` and asserts nothing outside
`src/adapters/` references `localStorage`, `new Audio(`, or `AudioContext`
— a regression guard, not a one-time manual grep.

`simulation/loadContent.test.ts` covers `loadContent()`: a fully valid
MVP-shaped config parses into typed objects, an all-empty config is
accepted, an invalid item produces an error naming its section and index
(e.g. `resources[0]`), multiple invalid items across different sections are
*all* reported in one error (not just the first), and malformed/non-object
`rawConfig` is rejected.

`content/mvpContent.test.ts` covers Agent 6's testing requirements against
the *real* `content/` files (not synthetic fixtures): they load through the
real `loadContent()` with no errors, the null-quality branches are actually
exercised (Autunite Crystal/purity, Hydrogen Gas/durability), the crafting
threshold is a real violable value, the schematic tier is deliberately
neither Grey nor Gold, and every cross-referenced id (planet → resources,
recipes → resources, schematic → recipe) resolves to a real entry.

`data/schemas.test.ts` covers Agent 1's JSON-schema testing requirement:
loads every `src/data/schemas/*.schema.json` file into one Ajv instance and
confirms each accepts a real MVP-shaped example and rejects invalid data —
including the two cases the contract names explicitly (a quality value of
101, a negative threshold), plus schema-specific cases (unknown/missing
object keys, an invalid enum value, a zero-quantity recipe input,
`thresholdQuality` without a matching `thresholdValue`).

`presentation/inventory.test.ts` covers the pure inventory module: empty
creation, immutable `addBatch()`, `totalQuantity()` summing only the
requested resource, `consume()` removing a batch exactly, splitting a batch
when only part is needed, FIFO ordering (oldest batch consumed first,
preserving each batch's own rolled qualities), leaving other resources'
batches untouched, throwing when there isn't enough, a no-op at amount 0,
and (Phase 3) `removeBatchAt()` removing exactly the batch at a given index
without touching a same-resource batch with different qualities, and not
mutating its input.

`presentation/display.test.ts` covers the pure display-formatting helpers:
`formatQualityRoll()`/`formatQualityLabel()` map every dimension to its
value+tier (preserving `null` as `N/A`, not `0`), `describeRefineResult()`
mentions a refund only when units were actually refunded (singular vs.
plural), `computeAggregateTier()` averages only non-null dimensions and
returns `null` when every dimension is null, and `describeCraftResult()`
reports either the rejection reason or the aggregate tier. **Travel
Encounters (Agent 22) addition:** `describeEncounter()` formats a
trade-opportunity as a currency grant, a discovery with its resolved name
and aggregate tier (falling back to the raw `resourceId` when no name is
given), and a passed hazard distinctly from a failed one (with its cost).
**Combat (Agent 22) addition:** `describePendingCombat()` reports only the
opponent's threat tier, nothing else; `describeCombatResolution()` reports
a win/flee with no damage or crew mention, a lose with the weapon's
current tier and the affected crew member's tier, and confirms both notes
are omitted entirely (not padded with "none") when no weapon is installed
or no crew was affected.

`presentation/loadMvpContent.test.ts` confirms the bundled-JSON-import path
(distinct from `content/mvpContent.test.ts`'s fs-read path, since this is a
different loading mechanism — Vite/Node native JSON import attributes vs.
reading files off disk) loads the real content with no errors and caches
across repeated calls.

`integration/mvpLoop.test.ts` is Agent 7's own verification, distinct from
Agent 3's unit tests: it reads the *real* `content/*.json` files (not
fixtures), loads them through the real `loadContent()`, and confirms a
hand-calculated expected value for both `refine()` and `craft()` against
that real content, at a fixed random seed — proving Agent 6's specific
values, through Agent 1's schemas, produce correct results in Agent 2's
formulas with no gap hiding in the wiring. Also confirms a resource can be
gathered on the real Delta Rigelus with a real `rollQuality()` call.

`integration/phase3Loop.test.ts` is Agent 15's own verification, same
relationship to Agent 12's unit tests that `mvpLoop.test.ts` had to Agent
3's: real `content/*.json` and `content/trading*.json`, a real generated
galaxy (`generateGalaxy()`, not a fixture), and the real Agent 11 trading
functions, chained gather → refine → craft → list → purchase in one test —
including confirming the crafted item's real rolled qualities survive all
the way to the buyer's copy, not just each phase's own qualities in
isolation. A separate test hand-verifies one complete pricing example
(3 units bought against a real base price of 5cr → exactly `5 × 1.02³ =
5.30604`, with fee/proceeds split exactly 18/0.9/17.1) and another
hand-verifies the global-price invariant against 3 real generated planets
independently drifted to different prices (not Agent 12's synthetic
randomized states), confirming the exact expected buy/sell values and that
neither ever beats the best real planet price. A final test re-asserts the
same hand-calculated MVP/Phase 2 cases proven elsewhere, as this agent's
own regression marker.

`integration/phase4Loop.test.ts` is Agent 19's own verification, same
relationship to Agent 17's unit tests that `phase3Loop.test.ts` had to
Agent 12's. Chains hire → assign (simultaneously with the player's own
independent `craft()` call) → idle background-check → upkeep payment →
attrition-vs-dismissal in one test, using a real generated galaxy and a
real `refreshCrewPool()`-produced pool — confirming the actively-assigned
crew member's craft and the player's own craft are computed completely
independently (different crafter tiers, no shared state), that
`checkAttrition()` correctly does *not* trigger on time and *does* trigger
exactly past the grace period boundary, and that dismissal works as the
alternative exit path. A dedicated test hand-verifies one complete
background-production example (a known `lastCheckedAt` of 0, a known
5-hour elapsed time, 5 completed units matching an explicit 1-unit/hour
rate exactly) — **explicitly flagged**, per this agent's own testing
requirement, that `BACKGROUND_IDLE_OUTPUT_RATE` is still `null` at
integration time (Phase 4 GDD §2.1a remains an open design question), so
the example supplies an override purely to prove the elapsed-time-
derivation/capping/unit-computation mechanism is correct, not to claim a
final balanced rate. A final test re-asserts the same hand-calculated
MVP/Phase 2/Phase 3 cases proven elsewhere, as this agent's own regression
marker.

`galaxy/` covers Agent 8 (Galaxy/Planet Generation Core) and Agent 9
(Phase 2 Validation/Test) together, the same relationship Agent 3 had to
Agent 2 during the MVP. `agent9PhaseValidation.test.ts` specifically
closes the two Agent 9 requirements Agent 8's own bundled tests only
partially covered: each of the 7 tier modifiers (Grey through Gold)
applied exactly through `rollQualityOnPlanet()` (not just the constant
table's values, which `data/phase2Constants.test.ts` already asserts), and
the Planet Type hard filter confirmed across 200 generated planets rather
than one hand-picked example (a Gas Giant never producing the solid-only
resource, a Terrestrial never producing the gas-only resource). `seededRandom.test.ts` covers determinism (same
seed → identical sequence, different seeds → different sequences), the
[0,1) range, and that `generateRandomSeed()` varies per call.
`generatePlanet.test.ts` tests each decomposed stage independently:
`rollPlanetTier` boundaries (mirroring `getTierColor`'s own boundary
tests), `choosePlanetType`'s uniform distribution, `getEligibleResources`'
hard filter (never a refined/crafted resource for any Planet Type),
`computeSubsetCount`'s exact per-tier percentage and its `max(1, ...)`
floor with a small pool, `selectResourceSubset`'s reserved-slot rule
(White+ always gets exactly one specialty, Grey never does, the specialty
is never crowded out even at count 1, never duplicated into the remaining
slots), and full `generatePlanet()` determinism/id-scheme/throw-on-no-
eligible-resources. `generateGalaxy.test.ts` covers exact planet count,
same-seed reproducibility, unique ids, and the generate-and-return-a-seed
path. `rollQualityOnPlanet.test.ts` covers the tier modifier, the
Green-is-neutral case, the specialty bonus stacking additively (not
replacing) on top of the tier modifier, clamping at 100, null preservation
for non-applicable qualities, and a no-tier (pre-Phase-2) planet applying
zero modifier — identical output to calling `rollQuality()` directly.
`regressionCheck.test.ts` re-runs the exact hand-calculated `refine()`/
`craft()` cases already proven correct pre-Phase-2, as a dedicated marker
that Phase 2's hard boundary (GDD §2.6) held — neither function was
touched.

`data/phase2Constants.test.ts` covers the Agent 1 Phase 2 amendment's
testing requirements: every row of `PLANET_TIER_MODIFIER`,
`RESOURCE_SUBSET_PERCENTAGE`, and `PLANET_TYPE_ELIGIBILITY` asserted
independently against Phase 2 GDD §2 (same non-circular pattern as the MVP
tables), an explicit check that Green — not Grey — is the tier modifier's
neutral point (the one detail that inverts every other tier table's
convention), and a hard-filter check (Gas Giant never lists Solid as
eligible). `data/schemas.test.ts` gained matching schema-level tests: a
fully Phase-2-populated planet, a null `specialtyResourceId` (Grey-tier
planets), an invalid `planetType` value, and a `position` missing a
coordinate. `content/mvpContent.test.ts` gained an explicit
backward-compatibility test confirming the real, unmodified Delta Rigelus
record (zero Phase 2 fields) still loads through the extended schema.

`data/phase3Constants.test.ts` covers the Agent 1 Phase 3 amendment's
tunable constants: `LISTING_EXPIRY_HOURS`, `BASELINE_DRIFT_PERCENT`,
`PRICE_FLOOR_PERCENT`/`PRICE_CEILING_PERCENT`,
`GLOBAL_MARKET_MARKUP_PERCENT`/`GLOBAL_MARKET_DISCOUNT_PERCENT`,
`TRANSACTION_FEE_PERCENT`, and `GLOBAL_LISTABLE_MAX_ITEM_TIER`/
`MAX_ITEM_TIER`, each asserted independently against Phase 3 GDD §2 exactly
(same non-circular pattern as the MVP/Phase 2 tables), plus an explicit
check that tiers 6-7 fall above the global-listable ceiling while tier 5
does not. `data/schemas.test.ts` gained matching schema-level tests: valid/
invalid `itemTier` on `resource.schema.json` (in range, out of range, and a
pre-Phase-3 resource with no `itemTier` still validating unchanged), a
planet-market and a global-market `listing.schema.json` example, the
contract's explicitly-named negative-`pricePerUnit` rejection, an invalid
`location` value, `planetMarketState.schema.json` accepting a valid state
and rejecting a zero `basePrice`, and `wallet.schema.json` accepting a valid
wallet and rejecting negative `credits`.

`data/phase4Constants.test.ts` covers the Agent 1 Phase 4 amendment's
tunable constants. Unlike Phase 2/3, the design doc gives almost no
example numbers here, so these tests check structural invariants rather
than hardcoded "expected" values nobody specified: `BASE_CREW_CAPACITY` is
a small positive integer, the capacity expansion curve actually makes each
slot cost more, `CREW_HIRE_COST_BY_TIER`/`CREW_WAGE_BY_TIER` each cover all
7 tiers and strictly increase by tier, wage is always cheaper than hire
cost at every tier, every timing tunable is positive, and
`ELAPSED_TIME_CAP_HOURS` falls within the one documented example range
(24-48 hours). A dedicated test confirms `BACKGROUND_IDLE_OUTPUT_RATE` is
explicitly `null` — the one constant the amendment's contract forbids
guessing — rather than silently defaulted to some fraction.
`data/schemas.test.ts` gained matching schema-level tests: a valid tier
3-5 crew member (`profession: null`), a valid tier 6-7 crew member with a
profession set, an active-vs-idle example, rejection of a non-positive
`wageAmount` and an invalid `status`, valid tier 3-5/6-7 `crewCandidate`
examples and a missing-tier rejection, a valid/rejecting `crewCapacity`
record, and a `planetCrewPool` example (including one whose nested
`availableHires` entry is itself invalid, confirming the `$ref` catches it).

`data/phase5Constants.test.ts` covers the Agent 1 Phase 5 amendment's
tunable constants, same structural-invariant approach as Phase 4's:
`DISTANCE_TO_TRAVEL_HOURS_PER_UNIT` is a small positive number,
`SHIP_TIER_SPEED_MODIFIER` covers all 7 tiers with Grey pinned to exactly
`1.0` (baseline) and each successive tier strictly shortening travel time,
`SHIPYARD_POOL_SIZE_PER_PLANET`/`SHIPYARD_POOL_REFRESH_INTERVAL_HOURS` are
positive, and `SHIP_PURCHASE_COST_BY_TIER` covers all 7 tiers and strictly
increases by tier. `data/schemas.test.ts` gained matching schema-level
tests: `componentCategory.schema.json`'s 4-value enum,
`qualityRoll.schema.json` accepting a full roll with a null dimension and
rejecting a `0` value (never valid), a valid `shipComponent` and rejection
of an invalid category, a fully-assembled `ship` (all 4 slots filled), the
amendment's own explicitly-named ship-under-construction case (all 4
slots `null`), rejection of a missing `ownerId`, a valid `shipCandidate`
(no `ownerId` field), a `shipyardPool` example whose nested candidate is
invalid (confirming the `$ref` catches it, same as Phase 4's crew pool
correction), a `voyage` with real cargo and with an empty cargo array,
rejection of a zero-quantity cargo entry, and a valid/invalid
`componentRecipe` link. Every `ship`-shaped example also carries a
`currentPlanetId` (see `src/data/types/README.md`'s Agent 20 section for
why it's required), including a dedicated test rejecting a `Ship` missing it.

`data/travelEncountersConstants.test.ts` covers the Agent 1 Travel
Encounters amendment's tunable constants, same structural-invariant
approach: `ENCOUNTER_CHECK_WINDOW_HOURS`/`ENCOUNTER_TRIGGER_CHANCE` are
positive (the latter a real probability), `ENCOUNTER_TYPE_WEIGHTS` covers
exactly the 3 encounter types, all positive, summing to 1, with hazard
strictly the lowest, the trade-opportunity credit range is real and
positive, `HAZARD_PASS_THRESHOLD` falls within the 1-100 roll range,
`HAZARD_SHIP_TIER_MODIFIER` covers all 7 tiers with Grey pinned to exactly
`+0` (the floor, not a penalty — unlike `PlanetTierModifier`'s Green-
neutral convention) and each tier strictly increasing the bonus, and
`HAZARD_FAILURE_COST_CURVE` is asserted to mirror `PENALTY_CURVE`'s exact
band boundaries (minus the 0-points/reject bands, neither of which apply
to a failure-only curve) with a strictly escalating, never-null
multiplier. `data/schemas.test.ts` gained matching schema-level tests:
`voyage.schema.json` accepting a voyage with no `encounters` field at all
(backward compatibility with pre-amendment persisted data), one of each
encounter type, an empty `encounters` array, rejection of an invalid
`type` value, and rejection of an outcome shape that doesn't match its
own declared `type`.

`data/scannerConstants.test.ts` covers the Agent 1 Scanner/Probe
amendment's tunable constants, same structural-invariant approach:
`SCANNER_POOL_SIZE_PER_PLANET`/`SCANNER_POOL_REFRESH_INTERVAL_HOURS` are
positive, `SCANNER_PURCHASE_COST_BY_TIER` covers all 7 tiers strictly
increasing by tier, `SCANNER_BASE_SCAN_RADIUS` is a positive real
distance, and `SCANNER_TIER_RADIUS_BONUS` covers all 7 tiers with Grey
pinned to exactly `+0` (the floor, not a penalty) and each tier strictly
increasing the bonus. `data/schemas.test.ts` gained matching schema-level
tests: a valid owned `Scanner` and rejection of one missing `ownerId`, a
valid `ScannerCandidate` (no `ownerId` field) and rejection of one
missing `tier`, and a valid/invalid-nested-candidate `scannerPool`
example (confirming the `$ref` to `scannerCandidate.schema.json` catches
it, same pattern as Phase 4/5's crew/ship pool corrections).

`data/combatConstants.test.ts` covers the Agent 1 Combat amendment's 3 new
standalone tunable constants, same structural-invariant approach:
`ARRIVAL_COMBAT_CHECK_CHANCE` is a real probability distinct from
`ENCOUNTER_TRIGGER_CHANCE`, `COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT`
is a real fraction, `COMBAT_CREW_UNAVAILABLE_DURATION_HOURS` is positive,
and a dedicated confirmation that `TIER_VARIANCE` (the shared refiner/
crafter table) is what Combat's variance formula reuses — no second,
combat-specific variance table exists anywhere.

**Agent 20 Combat Core amendment:** `data/travelEncountersConstants.test.ts`'s
`ENCOUNTER_TYPE_WEIGHTS` test was updated again, now that this amendment
set the real (no longer `0`) `combat` weight — it asserts all 4 types are
positive and sum to 1, and that `combat` is strictly the rarest of all
four (below `hazard`, itself still below `tradeOpportunity`/`discovery`).
The original three types' assertions needed no numeric changes at all: the
new weight was carved out by scaling all three down *proportionally*, which
preserves their ratio to each other exactly. `ships/resolveEncounters.test.ts`
and `ships/resolveArrival.test.ts` needed mechanical call-site updates
(destructuring `.encounters` off `resolveEncounters()`'s new
`EncounterResolution` return shape; one extra queued random value on two
`resolveArrival()` calls, for the new arrival-triggered combat check) —
no assertions or expected values changed, only how the return value is
reached. `data/schemas.test.ts`
gained matching schema-level tests: `voyage.schema.json` accepting a
voyage with no `isRetreat` field at all (backward compatibility),
`isRetreat: true`, and rejection of a non-boolean value; `crewMember.schema.json`
accepting no `unavailableUntil` field at all (backward compatibility), an
explicit `null`, and a real timestamp, plus rejection of a negative one;
and 6 new `combatEncounter.schema.json` cases — a valid pending/
travel-triggered encounter, a valid resolved/arrival-triggered one
(`windowIndex: null`), all three `outcome` values, rejection of an
invalid `triggerContext`, rejection of an invalid `outcome`, and rejection
of a record with the `outcome` key missing entirely (must be explicit
`null` while pending, never absent).

`ships/refreshScannerPool.test.ts` and `ships/purchaseScanner.test.ts`
cover the Agent 20 Scanner amendment's pool/purchase functions, same
pattern as `refreshShipyardPool.test.ts`/`purchaseShip.test.ts`: pool size,
determinism given a seed, non-determinism without one, unique candidate
ids, tiers drawn from the shared 7-tier breakpoint table, exact
tier-scaled cost deduction, candidate removal from the pool, ownership
transfer, and rejection of a not-in-pool candidate or insufficient funds.

`ships/performScan.test.ts` covers the Agent 20 Scanner amendment's scan
action and all four of Agent 21's guardrail tests: rejection when the
ship isn't docked at the given planet, rejection when the docked planet
isn't yet discovered, rejection when no scanner is owned, the effective
radius (base + tier bonus) hand-verified at 3 tiers, an exact
inside/outside boundary case, proof that owning both a lower- and
higher-tier scanner uses only the higher one's radius rather than summing
both (a planet placed strictly between the two possible radii), and the
exact set of newly-discovered planets for a known layout (skipping
already-discovered planets). The 4 guardrail tests: a before/after
snapshot diff proving `performScan()` never changes any `Planet` field
other than `discovered` (and never mutates its input in place),
`deriveShipTier()` producing identical output before and after an actual
`purchaseScanner()` call for the same ship's owner, a source-grep
confirming no Scanner-amendment file references `resolveEncounters()`/
`EncounterResult`, and a source-grep confirming neither `resolveArrival.ts`
nor `initiateVoyage.ts` references `performScan` or `Planet.discovered` at
all (no automatic/passive discovery exists anywhere).

`ships/` covers Agent 20 (Ships & Travel Core) and Agent 21 (Phase 5
Validation/Test) together, the same relationship Agent 16 had to Agent 17.
`deriveShipTier.test.ts` covers the straight-average-of-installed-tiers
formula against hand-calculated midpoint values (including a mixed-tier
case), that a `null` slot is excluded from the average rather than
penalizing the ship, and the documented zero-components fallback to
`Grey`. `assembleShip.test.ts` covers installing into a slot, that
`ship.tier` is recomputed (never stale) after every assembly change,
replacing an existing component, and rejection when a component's
category doesn't match its target slot. `refreshShipyardPool.test.ts`
covers the exact pool size, determinism given a seed, unique candidate
ids, and — across 20 generated pools — that every candidate's own
`tier` and all 4 of its generated components' tiers agree exactly, per
the contract's "components generated to match the resulting tier"
requirement. `purchaseShip.test.ts` covers the exact tier-scaled cost
deduction, the resulting `Ship`'s exact shape (owned by the buyer,
located at the shipyard's planet), rejection for a candidate not in the
pool, and rejection on insufficient funds. `calculateTravelTime.test.ts`
is Agent 21's explicitly-required hand-calculated example: a 3-4-5
right-triangle route (distance exactly 500) matched against the literal
formula, plus confirmation that a higher-tier ship is strictly faster on
the same route, that only 2D distance is ever used, and rejection when
either planet lacks a generated `position` (e.g. pre-Phase-2 content like
Delta Rigelus). `initiateVoyage.test.ts` covers the exact `arrivesAt`
computation, correct id propagation, cargo passthrough (supporting the
Phase 3 remote-sale mechanic), and — Agent 21's other explicitly-required
test — that a ship-tier change *after* departure does not retroactively
alter an already-locked-in `arrivesAt`. `resolveArrival.test.ts` covers
the early-resolution rejection (explicit, per the contract), success
exactly at `arrivesAt`, that the ship's `currentPlanetId` updates to the
destination, and that cargo is only ever reported once actually
arrived — proving the mechanism the Phase 3 remote-sale connection
depends on (full end-to-end wiring through a real `Listing` is Agent
24's job). **Travel Encounters amendment additions:** a regression test
confirming `resolveArrival()` called without the new optional
`destinationPlanet`/`resources` parameters (every pre-amendment call
site) is byte-for-byte unaffected (`encounters` simply `[]`), a second
regression test confirming arrival timing/cargo/ship delivery are
identical whether or not encounters actually resolve, and an integration
test confirming `resolveArrival()`'s `encounters` output matches a direct
`resolveEncounters()` call with the same inputs exactly — proving real
delegation, not a parallel reimplementation. **Combat amendment
additions:** the byte-for-byte regression test above also now asserts
`pendingCombats` defaults to `[]` (same gating as `encounters`); a
dedicated test confirms the arrival-triggered check (isolated from the
window mechanism by forcing every window to miss) creates a pending
`CombatEncounter` with `triggerContext: "arrival"` and `windowIndex:
null`; and a mixed test confirms a window-detected combat and an
arrival-detected combat can both be reported from the same call.

`resolveEncounters.test.ts` (Travel Encounters amendment) covers Agent 20's
new `resolveEncounters()` against the GDD's own Section 2 rules: the
per-window trigger roll uses `ENCOUNTER_TRIGGER_CHANCE` exactly (boundary-
tested, not approximately), a voyage spanning N windows gets N independent
rolls (not one for the whole voyage) — including a voyage shorter than one
full window still getting exactly one, a statistical check (3000 trials)
confirming the type-split distribution matches `ENCOUNTER_TYPE_WEIGHTS`
with hazard genuinely least common, `tradeOpportunity`'s exact credits
amount from a known roll plus a range check across many trials,
`discovery`'s output matching an *independent* direct `rollQuality()` call
with the same resource and random sequence (proving delegation, not
reimplementation) plus graceful handling of an empty eligible pool, a
dedicated many-trials negative test proving discovery **never** sets
`discovered: true` on the planet it's given (snapshot-compared before/
after — the single most important test in this file, per the amendment's
own contract), `hazard`'s pass/fail roll correctly shifted by the ship's
own tier (an identical raw roll fails for Grey but passes for Gold), the
failure-cost curve matching its escalating shape exactly at 5
points-below-threshold values, and a passed hazard producing zero currency
deduction. **Combat amendment additions:** a dedicated test confirms a
type-split roll landing on `combat` produces a pending `CombatEncounter`
(not an `EncounterResult`) with the correct `id`/`triggerContext`/
`windowIndex`/`opponentThreatTier`, and does not resolve an outcome; a
mixed-scenario test confirms a combat detection in one window doesn't
affect a `tradeOpportunity` resolving synchronously in another (the two
output channels — `encounters` and `pendingCombats` — are independent);
and an explicit test confirms `isRetreat: true` returns immediately with
*zero* `random()` calls of any kind (using a `random` that throws if
called at all, not just checking that nothing happened to trigger).

`initiateCombat.test.ts` covers the Combat amendment's shared detection
helper directly: the returned `CombatEncounter` is always `pending` with
`outcome: null`; `id`/`voyageId`/`triggerContext`/`windowIndex` pass
through exactly (including the arrival case's `windowIndex: null`); and
`opponentThreatTier` is a 1-100 roll through the shared tier breakpoint
table, consuming exactly one `random()` call (boundary-tested at both
ends of the range, not approximately).

`resolveCombatChoice.test.ts` covers Agent 20's resolution function
against Combat GDD Section 2.5 exactly: flee resolves unconditionally
with zero `random()` calls and no mutation; attack-win at a structurally
one-sided tier pairing (Gold vs. Grey, worst-case roll on both sides
still wins) and at an exact tie (identical tier, identical roll — ties
favor the player, same `>=` convention as `resolveHazard()`); attack-lose
at a structurally one-sided pairing confirms the weapon's `durability`
reduced by exactly `COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT`, its tier
correctly recomputed via the real 5-quality aggregation (a genuine tier
drop, not a durability-only shortcut), the ship's own derived tier
following it, one randomly-chosen owned crew member's `unavailableUntil`
set to exactly `currentTime + COMBAT_CREW_UNAVAILABLE_DURATION_HOURS`,
and a retreat voyage to the original voyage's `originPlanetId` carrying
cargo unchanged; a zero-owned-crew case proves the crew consequence is
skipped gracefully (no crew-pick `random()` call consumed, not just "no
crew got picked"); a no-weapon-installed case proves the Grey fallback
and that damage is skipped entirely; a null-durability case proves the
value is never coerced to 0; and a dedicated test proves
`opponentThreatTier` is read from the encounter, never re-rolled at
resolution — two encounters sharing the same stored tier resolve
identically given the same 2-value random sequence, which would throw
"exhausted" if a hidden third roll existed. A separate test confirms
`resolveCombatChoice()` throws (not a rejection union) when called on an
already-resolved encounter — a caller/programming error, same precedent
as `assembleShip()`'s category-mismatch check.

`regressionCheck.test.ts` re-runs the same hand-calculated
`refine()`/`craft()`/`generateGalaxy()`/`purchaseListing()`/`hireCrew()`
cases proven correct pre-Phase-5, confirming Agents 2, 8, 11, and 16
remain untouched now that ships & travel core exists alongside them.
`loadShipsContent.test.ts` mirrors `trading/loadTradingContent.test.ts`'s
exact coverage pattern (valid config, empty array, one-invalid-item error
naming section+index, missing required array, non-object input) for the
necessary-completion `componentRecipes` content-loading path.

`content/shipsContent.test.ts` covers Agent 23's testing requirements
against the *real* `content/componentRecipes.json` file (not synthetic
fixtures): it loads through the real `loadShipsContent()` with no errors,
every component category (weapon/engine/shield/cargoHold) has exactly one
recipe link, every link resolves to a real recipe and a real output
resource (no dangling references), and — the contract's own explicit
Definition of Done — every component recipe is actually craftable
end-to-end via the real `craft()` using only existing resources.

`integration/phase5Loop.test.ts` is Agent 24's own verification, same
relationship to Agent 21's unit tests that `phase4Loop.test.ts` had to
Agent 17's. Chains purchase-a-ship (from a real generated shipyard pool) →
craft-and-install one real component per category (using Agent 23's actual
`componentRecipes.json` link data) → confirm the resulting derived tier →
a hand-verified travel-time example (the expected value independently
derived from the two real generated planets' `{x,y}` positions and the
documented constants, not by calling `calculateTravelTime()` a second
time) → initiate a voyage → confirm resolving before `arrivesAt` is
rejected and the ship doesn't move → resolve exactly at `arrivesAt` and
confirm the ship's `currentPlanetId` updates. A dedicated test confirms
the Phase 3 remote tier 6-7 sale connection: since no shipped MVP resource
reaches tier 6-7 (same limitation `content/tradingContent.test.ts`'s tier
restriction coverage already works around), it constructs a synthetic
tier-6 fixture, carries it as real `Voyage` cargo, confirms resolving
early does nothing, and confirms a real `Listing` is only constructed
(via `createListing()`, called by the test itself standing in for the
caller `resolveArrival()`'s own contract names) *after* a successful
`resolveArrival()` — never before — while also confirming that same
tier-6 item still correctly fails a `"global"` listing attempt (the Phase
3 restriction remains in force; a remote sale only ever targets one
specific planet's market). A final test re-asserts the same
hand-calculated MVP/Phase 2/Phase 3/Phase 4 cases proven elsewhere, as
this agent's own regression marker.

`crew/` covers Agent 16 (Crew Core) and Agent 17 (Phase 4 Validation/
Test) together, the same relationship Agent 9 had to Agent 8 and Agent 12
to Agent 11. `refreshCrewPool.test.ts` covers the exact pool size,
determinism given a seed (and genuine variation without one), unique
candidate ids, and — across 50 generated pools, not one hand-picked
example — that tier 6-7 candidates always have a profession and tier 3-5
never do. `hireCrew.test.ts` covers the exact tier-scaled cost deduction,
the resulting `CrewMember`'s exact shape, rejection for a candidate not in
the pool, rejection at capacity, and rejection on insufficient funds.
`assignToCraft.test.ts` covers the status/`assignedCraftId` transition and
confirms the crafted output matches the same hand-calculated value already
proven in `tests/trading/regressionCheck.test.ts` (Green crafter tier +
Blue schematic), proving `craft()` is called for real, not reimplemented.
`simultaneity.test.ts` is Agent 17's explicit requirement: the player's
own craft plus three differently-tiered crew members' crafts are computed
in the same pass and produce three genuinely distinct results — proving
nothing is silently serialized into a single-crafter-at-a-time queue.
`resolveBackgroundCrafting.test.ts` covers the not-yet-available path
(the real default, since `BACKGROUND_IDLE_OUTPUT_RATE` is `null`), that
`lastCheckedAt` still advances even then, the exact unit-count computation
when a rate is supplied, that elapsed time comes only from the two real
timestamps (no caller-supplied duration exists to override it with), and
that a simulated week-long absence is still capped at
`ELAPSED_TIME_CAP_HOURS` rather than credited in full. `payUpkeep.test.ts`
covers the not-due/paid/insufficient-funds paths and the exact wage
deduction. `checkAttrition.test.ts` covers the grace-period boundary
exactly (not before, not after), that the clock runs from `lastPaidAt` not
`hiredAt`, and that repeated calls with identical inputs always produce
the identical result (no hidden randomness anywhere in attrition).
`dismissCrew.test.ts` covers success for the real owner and rejection for
a non-owner. `purchaseCapacity.test.ts` (added during Agent 18 — see
`src/crew/README.md`'s note on why this function lives in Agent 16's
module) covers the exact base cost for the first purchased slot, that
each successive slot costs more per the documented multiplier curve, and
rejection on insufficient funds. `regressionCheck.test.ts` re-runs the
same hand-calculated `refine()`/`craft()`/`generateGalaxy()`/
`purchaseListing()` cases proven correct pre-Phase-4, confirming Agents
2, 8, and 11 remain untouched now that crew core exists alongside them.

`simulation/aggregateTier.test.ts` is a light direct check at the layer
that now owns `computeAggregateTier()` (moved from `src/presentation/`, see
that file's own comment) — `presentation/display.test.ts` still covers it
too, via `display.ts`'s re-export, so this isn't duplicate coverage of the
same call path.

`trading/` covers Agent 11 (Trading Core) and Agent 12 (Phase 3 Validation/
Test) together, the same relationship Agent 9 had to Agent 8.
`createListing.test.ts` covers the tier 6-7 global-listing rejection (and
that tiers 1-5 work on both markets), a missing `itemTier` treated as
unrestricted, `marketTier` matching a hand-calculated
straight-average-to-tier value, `expiresAt` derived from
`LISTING_EXPIRY_HOURS`, and trade attribution. `purchaseListing.test.ts`
covers self-trade rejection (tested explicitly and directly, per the
contract's own instruction not to just infer it from other tests), partial
purchases decrementing without closing, a purchase that exhausts quantity
closing the listing, the flat fee deducted exactly and confirmed to net
zero against `totalPaid` (neither paid to buyer nor seller), the
required/forbidden pairing of a `PlanetMarketState` with planet vs. global
listings, and that a planet purchase triggers `applyDrift` in the `'buy'`
direction. `drift.test.ts` covers `applyDrift`'s exact per-unit percentage,
that successive units diminish rather than move linearly, the floor/ceiling
holding under a 1000-unit stress test, and `applyRecovery`'s exact
gap-decay formula in both directions (including that it approaches but
never overshoots `basePrice`). `globalPrice.test.ts` covers the exact
markup/discount arithmetic, that only matching `itemId` entries are
considered, the explicit no-planet-trades-this-item case, and the
contract's "critical invariant" test — 200 randomized planet-price states
each for buy and sell, confirming the global price never structurally
beats the best live planet price. `expireListings.test.ts` covers the
planet-market held-for-pickup case, the global-market return-to-inventory
case, an unexpired listing being left alone, and an already-sold-out
listing having nothing to return. `regressionCheck.test.ts` re-runs the
same hand-calculated `refine()`/`craft()` cases proven correct pre-Phase-3
plus a `generateGalaxy()` same-seed-reproduces-same-galaxy check, confirming
Agents 2 and 8 remain untouched now that trading core exists alongside
them. `loadTradingContent.test.ts` mirrors `simulation/loadContent.test.ts`'s
exact coverage pattern (valid config, all-empty config, one-invalid-item
error naming section+index, multiple-invalid-items-across-sections, missing
required array, non-object input) for Agent 11's Phase 3 content-loading
path.

`season.test.ts` / `emergency.test.ts` cover the bug fix for the two trade-
map layers that were never actually implemented in the original Phase 3
build (see `src/trading/README.md`'s own note). `season.test.ts` covers
`getCurrentSeason()` cycling through all 4 seasons in order as time advances
by `SEASON_CYCLE_HOURS`, determinism given fixed inputs, planets landing in
different seasons at the same instant (their own seed-derived phase
offsets), `getSeasonalEffect()` returning `null` for no categories, picking
a cheap/premium pair from only the given categories (distinct when ≥2
available, the same category for both when only 1 exists), and
`getSeasonalPriceMultiplier()`'s exact swing math. `emergency.test.ts`
covers the documented duration-never-exceeds-check-interval invariant,
`null` for no categories, determinism, an observed trigger rate close to
`EMERGENCY_TRIGGER_CHANCE` across 500 independent planets (structural, not
exact), a deterministic search for a triggering `(planetId, window)` pair
to prove the emergency is active from the *very first instant* of its
window (no advance-warning delay anywhere in the calculation) and ends
exactly at `endsAt` (present the millisecond before, gone at or after), and
`getEmergencyPriceMultiplier()`'s exact premium math. Both are wired into
`TradeMapScene` for display/classification only — see
`src/presentation/README.md`'s own note on how that's kept independent of
the real, trade-driven `currentPrice`.

`content/tradingContent.test.ts` covers Agent 14's testing requirements
against the *real* `content/tradingBasePrices.json` and
`content/planetMarketPreferences.json` files (not synthetic fixtures): they
load through the real `loadTradingContent()` with no errors, every MVP
resource has a base price, base prices are internally consistent (each
output tier's price exceeds its raw-input cost combined — hand-verified for
both Radiant Alloy Bar and Ion-Forged Hull Plate), every referenced resource
id in the preference config resolves to a real resource (no dangling
references), all 4 Planet Types have a preference entry, and
`resources.json`'s `itemTier` values reflect the raw(1) < refined(2) <
crafted(3+) pipeline-depth ordering.

`integration/mapVerification.test.ts` is Agent 25's own verification evidence
for the Galactic Map milestone (`docs/profitable-map-gdd.md` Section 6) —
unlike every other `integration/*.test.ts` file, most of this one audits
for the *absence* of things rather than chaining a working feature
end-to-end, mirroring `adapters/browserApiIsolation.test.ts`'s own "scan
`src/` for a forbidden pattern" shape. Confirms `discovered: true` is
written in exactly the documented sites — `presentation/galaxyState.ts`
(the two documented bootstrap overrides) and, since the Scanner/Probe
Core amendment landed, `ships/performScan.ts` too (a third, deliberately
sanctioned writer — Scanner GDD §2.3's own Definition of Done; unlike
Travel Encounters' discovery type, which stays forbidden from ever
touching this field, confirmed by a dedicated assertion that
`resolveEncounters.ts` still never matches `discovered:\s*true`) — and
that `src/ships/resolveArrival.ts` itself never references
`discovered` at all (Ships Core correctly stays out of Galaxy-data
mutation — discovery-by-travel is presentation-layer wiring: a persisted
`discoveredPlanetIds` side-table in `galaxyState.ts`, not a mutation of any
`Planet.discovered` field, which is why this assertion still holds after
that bug was fixed). Full correctness coverage for `performScan()` itself
lives in `ships/performScan.test.ts`, per its own guardrail tests above —
this file only confirms the write-site inventory stays exactly as
documented. Confirms `getGlobalPrice()` reads live state with no
internal caching (two calls with different market-state inputs return
different, non-memoized results) and that `PlanetMarketState` carries no
staleness/timestamp field. Two tests have now flipped from "absence" to
"presence": the `season`/`emergency` check originally asserted zero
matches anywhere (documenting the gap this milestone found — see
`src/trading/README.md`'s own note), and now asserts the opposite, that
`src/trading/season.ts`/`emergency.ts` exist and are actually wired into
`TradeMapScene`, once that gap was fixed. The `scanner`/`probe` check
similarly originally asserted zero matches anywhere (documenting the
Galactic Map milestone's own finding that scanner/probe was a
recorded-but-deferred idea, not yet decided), and now asserts that
`data/types/scanner.ts` exists, once `profitable-scanner-gdd.md` locked
the design and the Agent 1 schema amendment landed — full correctness
coverage for the rest of that amendment (Agent 20/21/22/28) lives in
their own dedicated test files as each lands, the same relationship this
file already has with `trading/season.test.ts`/`emergency.test.ts`.
Full correctness coverage for the season/emergency fix itself lives in
the dedicated `trading/season.test.ts`/
`emergency.test.ts` files above — this file only confirms the wiring, per
its own "small targeted addition, not a new parallel suite" scope. See the
GDD's Sections 6-7 for the full narrative report, including the one
remaining open item (a live-measured canvas-overflow finding that isn't
covered by an automated test — Phaser scenes aren't exercised by
`node:test`, see the note below).

**Manual playtest:** `src/presentation`'s scenes (Phaser, canvas-rendered)
aren't exercised by `node:test` — see `src/presentation/README.md` for how
the full gather → refine → craft loop, including the threshold-penalty and
craft-rejection-rollback branches, was verified live against a running
`npm run dev` instance in a real browser.

**Import specifiers:** use the literal `.ts` extension (not `.js`) for
relative imports in test/source files — Node's native type-stripping on this
project's Node version resolves the specifier as-is against the filesystem,
it does not remap `.js` to a sibling `.ts` file the way `tsc`-then-run does.
`tsconfig.json` sets `allowImportingTsExtensions` to match.
