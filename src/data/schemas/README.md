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
`planetCrewPool.schema.json`'s `availableHires` array originally `$ref`d
`crewMember.schema.json` directly, per the amendment's own pseudocode.

**Agent 16 correction:** `crewCandidate.schema.json` (new) and
`planetCrewPool.schema.json` updated to `$ref` it instead of
`crewMember.schema.json` for `availableHires` — see
`src/data/types/README.md`'s Agent 16 section for why (an unhired pool
candidate can't satisfy `CrewMember`'s required hire-specific fields).
Covered directly by `tests/data/schemas.test.ts`: valid tier-3-5/tier-6-7
`crewCandidate` examples, a missing-tier rejection, and a `planetCrewPool`
example whose nested candidate is invalid, confirming the `$ref` still
catches it.

**Phase 5 amendment:** `componentCategory.schema.json` (new 4-value enum),
`shipComponent.schema.json`, `ship.schema.json`, `shipyardPool.schema.json`,
and `voyage.schema.json` (new) for the core Phase 5 types — same
not-in-any-content-pipeline situation as Phase 4's crew schemas (ship/
voyage records are runtime state Agent 20 creates, and there's no
separate Content pipeline consuming them). Also `qualityRoll.schema.json`
(new) — the first schema in this project to validate a full 5-key
`QualityRoll` object (each quality independently `null` or an integer
1-100); `ShipComponent.qualities` is the first schema-validated type that
needed one, since prior phases' schema-validated types (`Listing`, etc.)
only ever stored a derived `marketTier`, never the full underlying
quality data.

**Agent 20 correction (mirroring Agent 16's `CrewCandidate` precedent
exactly):** `shipCandidate.schema.json` (new) and `shipyardPool.schema.json`
updated to `$ref` it instead of `ship.schema.json` for `availableShips` —
an unpurchased shipyard candidate has no real `ownerId` yet, so it can't
satisfy `Ship`'s required fields. Covered by `tests/data/schemas.test.ts`:
a fully-assembled `Ship` (all 4 component slots filled), a ship-under-
construction example (all 4 slots `null` — the amendment's own
explicitly-named test case), rejection of a missing `ownerId`, a valid
`ShipCandidate` (no `ownerId` field at all), and a `shipyardPool` example
whose nested candidate is invalid, confirming the `$ref` still catches it.

**`componentRecipe.schema.json` (new)** — validates the necessary-
completion link table described in `src/data/types/README.md`'s Phase 5
section (`Recipe` itself is confirmed sufficient and stays unmodified;
this small schema validates the separate `recipeId` → `ComponentCategory`
mapping instead). `voyage.schema.json` covers both a voyage carrying real
cargo and one with an empty cargo array, plus rejection of a
zero-quantity cargo entry.

**Agent 20 correction:** `ship.schema.json` gained a required
`currentPlanetId` property, found while implementing Agent 20 (not
during the amendment itself) — see `src/data/types/README.md`'s Agent 20
section for why. Every existing `ship.schema.json` test was updated to
include it, plus a new explicit rejection test for a `Ship` missing it.

**Travel Encounters (Non-Combat) amendment:** `voyage.schema.json` gained
one new **optional** property, `encounters` — an array of the 3
`EncounterResult` variants (`tradeOpportunity`/`discovery`/`hazard`),
expressed inline via `oneOf` with a `const` discriminant per branch
(mirroring `cargo`'s own existing "inline the item shape, don't create a
separate `voyageCargoItem.schema.json`" precedent, rather than a new
standalone file). Deliberately optional, not required — see
`src/data/types/README.md`'s note on why a persisted pre-amendment
`Voyage` must still validate unchanged. No new type files needed schemas
of their own: `EncounterResult` follows this project's established
"Result" convention (like `CraftResult`/`ArrivalResult`, neither of which
has a schema either) since it's a function-outcome shape, not standalone
persisted content — it only gets schema coverage here because it's
embedded inside `Voyage`, which is. Covered by
`tests/data/schemas.test.ts`: a voyage with no `encounters` field at all
(backward compatibility), one of each encounter type, an empty array,
rejection of an invalid `type` value, and rejection of an outcome shape
that doesn't match its own declared `type` (a `discovery` entry carrying
a hazard-shaped `outcome`).

**Scanner/Probe amendment:** `scanner.schema.json` and `scannerPool.schema.json`
(new) for the 2 core Scanner types — same not-in-any-content-pipeline
situation as Phase 4/5's crew/ship schemas (scanner records are runtime
state Agent 20 creates via pool refresh/purchase, and there's no separate
Content pipeline consuming them). Also `scannerCandidate.schema.json`
(new), same **necessary correction** as Agent 16's `crewCandidate.schema.json`
and Agent 20's `shipCandidate.schema.json`: `scannerPool.schema.json`'s
`availableScanners` `$ref`s it instead of `scanner.schema.json` — an
unpurchased scanner pool entry has no real `ownerId` yet, so it can't
satisfy `Scanner`'s required fields. Covered by `tests/data/schemas.test.ts`:
a valid owned `Scanner`, rejection of a `Scanner` missing `ownerId`, a
valid `ScannerCandidate` (no `ownerId` field at all), rejection of a
`ScannerCandidate` missing `tier`, and a `scannerPool` example whose
nested candidate is invalid, confirming the `$ref` still catches it.

**Combat amendment:** `combatEncounter.schema.json` (new) — same
not-in-any-content-pipeline situation as `scanner.schema.json`/
`shipyardPool.schema.json`: a `CombatEncounter` is runtime state Agent 20
creates (at detection time) and later mutates (at resolution time), not
static config. Unlike `EncounterResult` (embedded only, no schema of its
own), `CombatEncounter` gets a standalone schema because it must persist
independently across its own pending -> resolved lifecycle, the same
"stored, not just embedded-and-discarded" situation `Scanner`/`ShipyardPool`
are already in. `outcome` is `required` even though it's nullable --
explicitly `null` while pending, never simply absent, so a record missing
the key entirely is rejected (`tests/data/schemas.test.ts`'s dedicated
case for this). Also `voyage.schema.json` gained one new **optional**
boolean property, `isRetreat`, and `crewMember.schema.json` gained one new
**optional, nullable** integer property, `unavailableUntil` -- both
deliberately optional for the same backward-compatibility reason
`encounters` was: a `Voyage`/`CrewMember` persisted before this amendment
shipped has neither field at all. Covered by `tests/data/schemas.test.ts`:
backward compatibility (no field present), the real-value case, and a
rejection case for each new property, plus 6 `combatEncounter.schema.json`
cases (valid pending/travel, valid resolved/arrival with `windowIndex:
null`, all three `outcome` values, an invalid `triggerContext`, an invalid
`outcome`, and the missing-`outcome`-field rejection above).
