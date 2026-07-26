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
