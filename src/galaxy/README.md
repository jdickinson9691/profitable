# src/galaxy

Owned by the **Galaxy/Planet Generation Core Agent** (Phase 2 GDD §4,
`docs/agents/agent-08-galaxy-planet-generation.md`).

Pure, framework-agnostic TypeScript implementing galaxy and planet
generation — the Phase 2 equivalent of what `src/simulation` was for the
MVP. Same architectural mandate: zero Phaser/PixiJS/DOM/browser API. Calls
`src/simulation`'s `getTierColor()`/`rollQuality()`/`clamp()` rather than
reimplementing them; imports the Agent 1 Phase 2 amendment's types/tables
rather than hardcoding anything.

- `seededRandom.ts` — `createSeededRandom(seed)`, a small self-contained
  deterministic PRNG (string hash + mulberry32, not a new dependency),
  returning the same `RandomFn` shape used throughout the project so it
  plugs directly into `rollQuality`/`refine`/`craft` with no changes to any
  of them. `generateRandomSeed()` is the one place real `Math.random()` is
  appropriate — producing the seed everything else derives from.
- `generatePlanet.ts` — decomposed into independently-testable stages per
  Agent 8's own contract requirement: `rollPlanetTier`, `choosePlanetType`,
  `getEligibleResources`, `computeSubsetCount`, `selectResourceSubset` (the
  reserved-slot rule), orchestrated by `generatePlanet(seed, position,
  resources)`.
- `generateGalaxy.ts` — `generateGalaxy(planetCount, resources, seed?)`, a
  fixed finite array of planets (not streaming/infinite), returning the
  seed used (generated if none supplied) so the caller can store it for
  reproducibility.
- `rollQualityOnPlanet.ts` — the gathering integration point. Wraps
  `rollQuality()` rather than modifying it: rolls normally, then adds the
  planet's tier modifier (+ specialty bonus, if applicable) and clamps.
  Safe to call on a planet with no `tier` at all (pre-Phase-2 content,
  e.g. Delta Rigelus) — applies zero modifier in that case.

**Extensions beyond Agent 8's literally-specified signatures, documented
rather than silently made:**

- `generateGalaxy`/`generatePlanet` both take a `resources: Resource[]`
  parameter that isn't in the contract's stated signatures. Without it,
  the subset-selection algorithm (Phase 2 GDD §2.3-2.5) has no way to know
  which resources exist — the same kind of necessary completion as the
  MVP's `loadContent()`/`RefiningRecipe` additions.
- **Category-vocabulary reconciliation.** `PLANET_TYPE_ELIGIBILITY` uses
  the GDD's own broad categories ("Solid"/"Gas"/"Crystal"), while
  `Resource.category` stays a free-form string (e.g. "radioactive
  crystal", "refined-metal") per the MVP's `Resource` type — a gap flagged
  when the Agent 1 amendment was built. Resolved here via case-insensitive
  substring matching (`getEligibleResources`), which correctly includes
  raw resources whose category names the broad category as a substring.
  Bug fix (found auditing the alpha playtest seed): the substring match
  alone is not sufficient to exclude refined/crafted outputs, once the
  content roster grew past the original 2 refined/crafted items --
  `content/README.md`'s own "category = own id" convention for those
  outputs means a self-referential category string can accidentally
  contain a broad category substring by name coincidence (e.g.
  "master-crystal-array" contains "crystal"). `getEligibleResources()` now
  also requires `itemTier === 1` (defaulting missing `itemTier` to 1, same
  convention `createListing.ts`'s `tradeableResources` filter already
  uses), closing this regardless of naming. See that function's own
  comment in `generatePlanet.ts` for the 3 real resources this affected.
- **Position generation** (Phase 2 GDD §2.7) has no specified range or
  distribution. Defaulted to uniform random within an arbitrary bounded
  square (±1000 on each axis, see `generateGalaxy.ts`'s `POSITION_RANGE`)
  — cheap to change later since nothing besides display/travel (both
  post-MVP) reads position values yet.
- `generatePlanet()` throws if a rolled Planet Type has zero eligible
  resources in the given catalog. GDD §2.4's `max(1, ...)` floor is only a
  real guarantee if every Planet Type has *at least one* eligible resource
  to begin with — a content/catalog invariant the design assumes, not
  something the formula alone can enforce. Failing loudly here beats
  silently violating `planet.schema.json`'s `minItems: 1` downstream.

**The hard boundary (Phase 2 GDD §2.6):** `src/simulation/refine.ts` and
`craft.ts` are untouched — confirmed via `git status` showing zero changes
to either file across this agent's entire implementation, and via
`tests/galaxy/regressionCheck.test.ts` re-running the exact same
hand-calculated cases already proven correct pre-Phase-2.
