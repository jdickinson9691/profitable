# tests

Owned by the **Validation/Test Agent** (GDD §5.2, agent 3).

Automated tests proving the Simulation Core Agent's output matches the
GDD's tables and formulas exactly — not just "it runs," but "it runs
correctly" (e.g. a gold-tier refiner narrows variance to -0.5%/+15% exactly,
not approximately). Must cover: quality roll distribution and clamping
(1–100), null/NA exclusion, refining formula at each refiner tier, refund
chance behavior, crafting formula at each crafter/schematic tier
combination, the threshold penalty curve including the hard floor at 41+
points below threshold, and the +18% combined ceiling cap.

This agent tests and reports only — it must never modify Simulation Core
logic to make a failing test pass.

**Running tests:** `npm test` runs `node --test`, which recursively
discovers `*.test.ts` files (Node's built-in type-stripping runs them
directly, no build step or transpiler needed — confirmed working on the
Node version this project targets). Mirror `src/`'s folder layout here
(e.g. `tests/simulation/refine.test.ts`) so each test file's home maps
obviously to the module it covers.

**Status:** `simulation/tierColor.test.ts` covers `getTierColor`'s boundary
table exactly (all 13 breakpoint values plus out-of-range rejection).
`simulation/rollQuality.test.ts` covers range/integer correctness, null (not
zero) exclusion for both MVP resources with a non-applicable quality
(Hydrogen Gas/durability, Autunite Crystal/purity), and exact behavior under
an injected deterministic random function. `simulation/refine.test.ts` covers
quantity-weighted straight averaging (including null exclusion), the exact
variance range at all 7 refiner tiers, refund chance keyed to the *output*
tier rather than the inputs' base tier (including Gold's secondary refund
unit), and a no-failure smoke test. `fixtures/resources.ts` holds reusable
`Resource` test fixtures for the three MVP resources (Igneous Ore, Hydrogen
Gas, Autunite Crystal); `fixtures/instances.ts` builds `ResourceInstance`s
from them; `fixtures/random.ts` provides `queueRandom()` for pinning down an
exact sequence of random() calls. None of this is authoritative content —
just shapes for exercising Agent 2's functions ahead of Agent 6's real
config. Everything else in Agent 3's coverage list (crafting formula) is
still outstanding.

**Import specifiers:** use the literal `.ts` extension (not `.js`) for
relative imports in test/source files — Node's native type-stripping on this
project's Node version resolves the specifier as-is against the filesystem,
it does not remap `.js` to a sibling `.ts` file the way `tsc`-then-run does.
`tsconfig.json` sets `allowImportingTsExtensions` to match.
