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
