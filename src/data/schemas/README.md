# src/data/schemas

Owned by the **Data Schema Agent** (GDD §5.2, agent 1).

JSON Schema files used to validate config data (in `content/`) against the
shapes defined in `src/data/types`. The Content Agent's output must validate
against these before it's considered done (GDD §5.2, agent 6).

**Status:** one schema per `src/data/types` shape that Agent 6 will actually
author config instances of: `resource.schema.json`, `recipe.schema.json`
(crafting), `refiningRecipe.schema.json`, `schematic.schema.json`,
`planet.schema.json`, plus `quality.schema.json`/`tierColor.schema.json` as
shared enums referenced via `$ref` from the others. Validated with
[ajv](https://ajv.js.org) — see `tests/data/schemas.test.ts`, which loads
every file here into one Ajv instance and asserts each accepts its
real MVP-shaped example and rejects the specific invalid cases this
agent's contract calls out (a quality value of 101, a negative threshold).

**Note for whoever imports ajv elsewhere:** under this project's
`"moduleResolution": "NodeNext"`, ajv v8's default export doesn't type-check
(`import Ajv from "ajv"` fails with "not constructable" — a known ajv v8 /
NodeNext typing gap). Use the named import instead: `import { Ajv } from
"ajv"`.

These schemas are also the validation backbone of `src/simulation/loadContent.ts`
(Agent 2's content-loading path) — imported there as static JSON modules and
compiled into the same kind of Ajv instance used by this folder's own tests.
Reading the actual config JSON off disk is still the caller's job (Agent
6/7); `loadContent()` takes already-parsed JSON in.

**Phase 2 amendment:** `planetType.schema.json` (new) plus `planet.schema.json`
updated with 5 new optional properties (`planetType`, `tier`, `position`,
`specialtyResourceId`, `discovered`) — optional specifically so existing
MVP content validates unchanged (verified against the *real* Delta Rigelus
record in `tests/content/mvpContent.test.ts`, not just a synthetic example).
`loadContent.ts` registers `planetType.schema.json` in its Ajv instance
since `planet.schema.json` now `$ref`s it.

**Phase 3 amendment:** `listing.schema.json`, `planetMarketState.schema.json`,
and `wallet.schema.json` (new) for the 3 trading types, plus
`resource.schema.json` updated with one new optional property, `itemTier`
(integer 1-7) — see `src/data/types/README.md` for why this was a necessary
completion rather than something the Phase 3 GDD named directly. These 3 new
schema files are **not** registered in `loadContent.ts`'s `SECTIONS` list —
`Listing`/`Wallet` are runtime state created by player actions, not static
config Agent 6/14 author ahead of time, so they don't belong to that
content-loading pipeline. `tests/data/schemas.test.ts` still covers all
three directly (it loads every `*.schema.json` file in this directory
automatically via `readdirSync`, not an explicit list), per the amendment's
own testing requirement to validate representative valid/invalid examples
for each new type — including the explicitly-named negative-`pricePerUnit`
rejection case.

**Agent 14 additions:** `itemBasePrice.schema.json` and
`planetMarketPreference.schema.json` (new) — necessary completions for the
2 content shapes Agent 14's contract asks for but nothing had defined; see
`src/data/types/README.md`. Registered in `src/trading/loadTradingContent.ts`
(Agent 11's content-loading path, mirroring `loadContent.ts`'s pattern),
not `loadContent.ts` itself — these are Phase 3 trading content, not MVP
content. Covered by `tests/trading/loadTradingContent.test.ts` (synthetic
examples) and `tests/content/tradingContent.test.ts` (the real
`content/tradingBasePrices.json`/`planetMarketPreferences.json` files).

**Phase 4 amendment:** `crewMember.schema.json`, `crewCapacity.schema.json`,
and `planetCrewPool.schema.json` (new) for the 3 crew types — same
"not registered in any content-loading pipeline" situation as Phase 3's
`Listing`/`Wallet`: crew records are runtime state Agent 16 creates
(hiring, pool refresh), not static config, and there's no Phase 4 Content
agent at all (crew pools are procedurally rolled, per the GDD). Covered
directly by `tests/data/schemas.test.ts` (auto-discovered, same as every
other schema here) with valid tier-3-5 (`profession: null`) and tier-6-7
(`profession` set) examples, an active-vs-idle example, and rejection
cases for a non-positive `wageAmount` and an invalid `status` value.
`planetCrewPool.schema.json`'s `availableHires` array `$ref`s
`crewMember.schema.json` directly, so an invalid nested crew member is
caught the same way an invalid nested object would be anywhere else.
