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
batches untouched, throwing when there isn't enough, and a no-op at
amount 0.

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
