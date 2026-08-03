# Functional Agent: Mining

**Renamed from "Gathering" this pass — terminology only, going forward.** "Mining" is the intended player-facing and design vocabulary from here on; **the real, already-built source code still says "gather" everywhere** (`GatherScene.ts`, `rollQualityOnPlanet.ts`'s callers, nav labels, UI button text) and is deliberately left untouched by this rename — a docs-first change, matching this whole folder's "contracts before code" discipline. Every code identifier cited below (`GatherScene`, `rollQuality()`, etc.) is the literal current name; treat this file's prose ("mine", "mining", "minable") as the target vocabulary a future implementation pass should rename the code to, not a claim that the rename has happened yet.

**Status: existing system, documented as-built — including the Planet Resource Generation change, now built.** Consolidates the mining-relevant slice of Agent 2 (base quality roll), Agent 8 (planet tier/specialty modifier) plus its Planet Resource Generation amendment, and Agent 5 (presentation). Quality rolling moved to `planet.md`, per `profitable-design-questions.md`'s "Planet Resource Generation" entry — this file's job is now "read whatever `planet.md` already fixed for this resource on this planet, right now, and add it to inventory," not roll anything itself. `rollQuality()`/`rollQualityOnPlanet()` stay real, unchanged functions this file still documents (nothing about their own formula changed) — `rollQualityOnPlanet()`'s parameter type was narrowed (`Planet` → `Pick<Planet, "tier" | "specialtyResourceId">`) to support calling it before a full `Planet` object exists, a signature widening with no behavior change. `GatherScene` (`src/presentation/scenes/GatherScene.ts`) now reads `getCurrentPlanetResources()` once per visit instead of rolling at click time.

**See also `docs/functional-agents/planet-ownership.md`** — Colonist-Driven Production adds a precondition in front of `getCurrentPlanetResources()` (a planet must be sufficiently colonized before it's minable at all, the two bootstrap planets excepted). **This file requires zero changes to honor that gate** — found on review, and worth stating plainly rather than leaving implicit: because this file already reads every gameplay value exclusively through `getCurrentPlanetResources()` (never `Planet`'s static fields directly), an uncolonized planet reporting an empty `producibleResourceIds` automatically means zero mine buttons render, with no new code path needed here. A concrete payoff of the "single source of truth" discipline this file already followed before Colonist-Driven Production existed.

## Responsibility

Turn a player's click into an inventory batch, using whatever fixed quality `planet.md`'s `getCurrentPlanetResources()` currently reports for that resource on that planet. Mining itself is now a deterministic read + inventory write — no roll happens in this file's own action path anymore.

## Inputs

- `Resource` type — specifically `applicableQualities`.
- **`getCurrentPlanetResources(planet, resources, now, isStartingPlanet?)` — `planet.md`, built.** The authoritative source for a planet's current `producibleResourceIds`/`specialtyResourceId`/`resourceQualities`. `GatherScene` calls this instead of reading `Planet`'s static fields directly, so a resource reset (`planet.md`) is reflected immediately on next visit, not just at generation time. **The colonist gate is not yet built** (`planet-ownership.md`'s pending `Colonist-Driven Production` amendment) — once it lands, an uncolonized planet will report an empty `producibleResourceIds` through this same function, with zero code change needed here (see the note below).
- `getCurrentPlanet()` (`src/presentation/currentPlanet.ts`) — resolves the player's current location; never reimplemented here. **Once Colonist-Driven Production lands, must return the merged, side-table-aware `Planet` object** (`planet.md`'s own Must-Not-Do) — not yet a real risk today, since `colonistCount` doesn't exist as a concept in the codebase yet.
- `content.resources` (`src/presentation/gameState.ts`) — the loaded resource catalog.

## Outputs

### `rollQuality(resource, random?)` — `src/simulation/rollQuality.ts`
Unchanged. `(resource: Resource, random: RandomFn = Math.random) => QualityRoll`. The universal base roll every quality-producing system either calls or wraps. **No longer called from the mine action path** — its only caller relevant to this file is now `planet.md`'s `generateResourcesForCycle()`, via `rollQualityOnPlanet()` below.

### `rollQualityOnPlanet(resource, planet, random?)` — `src/galaxy/rollQualityOnPlanet.ts`
Unchanged formula (base roll + `PLANET_TIER_MODIFIER` + `SPECIALTY_QUALITY_MODIFIER`, clamped 1-100). **Ownership of *when* this is called moves to `planet.md`** — it now runs once per resource per generation/reset cycle (`planet.md`'s `generateResourcesForCycle()`), never once per mine click. This file still documents the formula itself since it's the mechanical heart of "how a planet's tier/specialty shapes a resource's quality," even though the call site is no longer here.

### `GatherScene` — `src/presentation/scenes/GatherScene.ts` — **built**
One `> Gather <ResourceName>` button (current code/UI text — a future rename would read `> Mine <ResourceName>`) per `getCurrentPlanetResources(planet, resources, now, isStartingPlanet).producibleResourceIds` entry — read once per `create()`, threaded through to every button/display, never recomputed mid-visit. On click: **reads** the same call's `resourceQualities[resource.id]` (no `RandomFn`, no roll) → `addBatch()` into the global player inventory (`src/presentation/inventory.ts`) → result text shows the (fixed) quality. Header shows the planet's tier and, if non-Grey, its specialty resource name — both still read from the live `getCurrentPlanetResources()` call, since a reset can change the specialty too.

## Must NOT Do

- **Must not call `rollQualityOnPlanet()` (or `rollQuality()`) directly from `GatherScene` or any other mine-action code path** — that call now belongs exclusively to `planet.md`'s generation/reset-cycle logic. A mine action that rolls its own quality is a regression to the old, now-superseded behavior, not a valid shortcut.
- Must not modify `rollQuality()` to accommodate planet data — the planet-agnostic boundary holds exactly as before; nothing about this change touches that.
- Must not extend planet tier's effect into refining or crafting — still scoped to mining (now: to a planet's fixed resource generation) only.
- Must not cap or scope inventory by ship — unchanged, still global/unscoped/uncapped per `ship.md`'s Cargo Hold Capacity decision.
- Must not read `Planet.producibleResourceIds`/`resourceQualities` directly for anything gameplay-visible — always go through `getCurrentPlanetResources()` so a reset is honored, and so the colonist gate (once built) will be too, per `planet.md`'s own Must-Not-Do.
- **Must not add a separate colonist/ownership check anywhere in this file once Colonist-Driven Production exists** — the gate will be fully enforced by `getCurrentPlanetResources()` returning an empty `producibleResourceIds`; duplicating that check here would be a second, redundant source of truth for the exact thing `planet-ownership.md` will own.
- Must not implement rendering/DOM/browser-API code in `rollQuality.ts` or `rollQualityOnPlanet.ts`.

## Testing Requirements

- `rollQuality()`/`rollQualityOnPlanet()`: existing coverage (1-100 bounds, tier/specialty modifier correctness, determinism) is unchanged and still owned here, even though the call site moved.
- `GatherScene`: mining the same resource from the same planet twice in the same session (same reset cycle) returns **identical** quality both times — verified via `tests/galaxy/planetResourceCycle.test.ts`'s determinism coverage.
- Mining after a simulated reset cycle boundary returns the **new** cycle's fixed quality, not the stale one — covered by `getCurrentPlanetResources() diverges once now crosses into a later cycle`.
- **Pending, once Colonist-Driven Production is built:** an uncolonized planet renders zero mine buttons; the same planet after colonization renders its normal set, with zero code change of its own, purely through `getCurrentPlanetResources()`.
- Regression: `refine()`/`craft()` are provably unaffected by any change here — confirmed via full suite (591 tests, zero failures).

## Definition of Done

- A player standing on any planet can mine any of that planet's currently-producible resources (per `getCurrentPlanetResources()`) and see the exact same quality every time, until that planet's next reset cycle changes it. **Built and verified.**
- Every displayed value in `GatherScene` is sourced directly from `getCurrentPlanetResources()`'s output — never rolled, never recalculated, in the presentation layer. **Built.**
- `rollQuality()`/`rollQualityOnPlanet()` remain provably planet-agnostic / correctly planet-modified respectively, exactly as before — this change moved *when* they're called, never *what* they compute. **Built.**
- **Pending:** an uncolonized planet (other than the two bootstrap planets) shows no minable resources at all, once Colonist-Driven Production lands — entirely a consequence of reading through `getCurrentPlanetResources()`, no new logic needed here when it does.
