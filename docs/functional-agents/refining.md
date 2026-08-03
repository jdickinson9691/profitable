# Functional Agent: Refining

**Status: existing system, documented as-built.** Consolidates the refining-relevant slice of Agent 2 (formula) and Agent 5 (presentation).

## Responsibility

Turn raw mined resource batches into a refined output, applying refiner-tier variance and a tier-based refund chance on consumed inputs.

## Inputs

- `ResourceInstance[]` (`src/data/types/resourceInstance.ts`) — the raw batches being consumed, each carrying its own rolled `qualities` from Mining (`mining.md`, renamed from "Gathering" this session).
- `RefiningRecipe` content (`content/refiningRecipes.json`, loaded via `loadContent()` — `src/simulation/loadContent.ts`) — each recipe's fixed `inputs`/`outputResourceId`/`outputQuantity`. Recipe selection/matching is Presentation's job (`RefineScene`); `refine()` itself never reads recipe content, only pre-resolved `ResourceInstance[]`.
- `TierColor` (the refiner tier) — a free UI selection (`RefineScene`'s own `selectedTier` state), never derived from a ship or crew member.

## Outputs

### `computeBaseAverages(inputs)` — `src/simulation/refine.ts`
`(inputs: ResourceInstance[]) => QualityMap`. Straight average of each quality dimension across all inputs, weighted by quantity, never toward best/worst. A quality is excluded from the average on any input where it's `null`, and is `null` in the result only if it's `null` on every input.

### `refine(inputs, refinerTier, random?)` — `src/simulation/refine.ts`
`(inputs: ResourceInstance[], refinerTier: TierColor, random: RandomFn = Math.random) => RefineResult`. Computes base averages, rolls **one shared variance value** (`TIER_VARIANCE[refinerTier]`, `src/data/constants/tierVariance.ts`: Grey ±10%/+10%, narrowing toward Gold at -0.5%/+15% — the exact per-tier bounds A1's "does Gold feel meaningfully more consistent" playtest question tests) applied proportionally to every quality dimension (not rolled independently per quality — "this refining action came out uniformly a bit lucky or unlucky"), clamps each to 1-100. Derives an `outputTier` via a straight-average-of-final-values proxy through `getTierColor()` (refined items display each quality's own tier individually, so this proxy exists only to key refund chance, not for display). Rolls a refund chance per consumed unit via `getRefundChance(outputTier)` (`src/simulation/refundChance.ts`) — higher output tier, better refund odds. Returns `{ qualities, outputTier, refundUnits }`.

### `RefineScene` — `src/presentation/scenes/RefineScene.ts`
Recipe picker (2-column list, `content.refiningRecipes`) + refiner-tier picker (`renderTierSelector`, shared with Crafting/Ship Assembly) + `> Refine` button. On click: checks input quantities via `hasEnoughInputs()`, consumes them, calls `refine()`, adds `outputQuantity` (plus any `refundUnits`) to inventory, displays the roll.

## Must NOT Do

- Must not accept a `Planet` parameter or read planet data anywhere in `refine.ts` — the planet-agnostic boundary (`profitable-phase2-gdd.md` §2.6) applies here exactly as it does to `craft()`.
- Must not derive `refinerTier` from anything but a free UI selection — no crew, ship, or planet dependency, confirmed by `RefineScene`'s own `selectedTier` being independent local state. **Confirmed still true after Ship Crew Roles (`ship.md`)** — its `Crafter` effect gives a crew bonus keyed off `CrewMember.profession`, but the locked profession table (`profitable-alpha-content-roster.md` §6: Weaponsmith/Engineer/Shield Technician/Cargo Specialist/Artisan) has no Refiner-equivalent entry, so there's no profession a crew bonus could key off here even if this boundary were relaxed — an asymmetry with Crafting worth naming explicitly rather than leaving for a future reader to wonder whether it's an oversight.
- Must not roll each quality dimension independently — one shared `varianceRoll` applied proportionally to all 5, by design (a refining action is uniformly lucky/unlucky, not per-stat lucky).
- Must not implement rendering/DOM/browser-API code in `refine.ts`, `tierVariance.ts`, or `refundChance.ts`.

## Testing Requirements

- `computeBaseAverages()`: correct quantity-weighted average; a quality `null` on every input stays `null`; a quality `null` on only some inputs is excluded from those inputs' contribution, not treated as 0.
- `refine()`: variance roll lands within `TIER_VARIANCE[refinerTier]`'s bounds; the same roll is applied proportionally across all 5 qualities (not independently); output clamps to 1-100; refund chance scales with `outputTier` per `getRefundChance()`'s table; deterministic under injected `random`.
- Regression: `craft()`, `rollQuality()`/`rollQualityOnPlanet()` provably unaffected.

## Definition of Done

- A player can select any refining recipe, pick a refiner tier, and refine — consuming the exact recipe inputs, producing the exact `outputQuantity` (plus any refund), with quality/tier variance visibly narrower at higher refiner tiers.
- Every displayed roll/refund is sourced directly from `refine()`'s return value — never recalculated in `RefineScene`.
- `refine()` remains provably planet-agnostic and crew/ship-agnostic — zero references to `Planet`, `Ship`, or `CrewMember` anywhere in its file.
