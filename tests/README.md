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
reports either the rejection reason or the aggregate tier.

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
24's job). `regressionCheck.test.ts` re-runs the same hand-calculated
`refine()`/`craft()`/`generateGalaxy()`/`purchaseListing()`/`hireCrew()`
cases proven correct pre-Phase-5, confirming Agents 2, 8, 11, and 16
remain untouched now that ships & travel core exists alongside them.

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
