# Functional Agent: Crafting

**Status: existing system, documented as-built.** Consolidates the crafting-relevant slice of Agent 2 (formula) and Agent 5 (presentation).

## Responsibility

Turn refined/raw resource inputs plus a recipe into a finished item, applying crafter-tier variance, schematic-tier bonuses, and a threshold-quality penalty curve — the single unified crafting formula every ship component and general crafted good in the game goes through.

**See also `docs/functional-agents/ship.md`'s Ship Crew Roles section — `craft()` stays fully crew-agnostic, confirmed on review, not just assumed.** `ship.md`'s new `Crafter` role effect could plausibly have needed a `craft()`-formula amendment (its original description read that way before being corrected this pass), but the actual decision splits into two effects, neither of which touches `craft()`: 4 of the 5 professions get a ship-component *repair* effect (a `ship.md`/Systems-Engineer-shaped mechanic, nothing to do with crafting output), and `Artisan`'s general-crafting discount reduces `CraftScene`'s required input quantity entirely upstream, before `craft()` is ever called. `craft()`'s signature, inputs, and formula below are unaffected by any of it.

## Inputs

- `ResourceInstance[]`, matched **positionally** against `recipe.inputs` (`recipes-schematics.md`).
- `Recipe` — specifically each input slot's optional `thresholdQuality`/`thresholdValue`.
- `schematicTier: TierColor` — resolved upstream via `resolveSchematicTier()` (`recipes-schematics.md`); `craft()` itself never looks up a `Schematic`.
- `crafterTier: TierColor` — a free UI selection (`CraftScene`'s `selectedCrafterTier`), same independence as Refining's refiner tier.
- `computeBaseAverages()` (`refining.md`) — reused directly, never reimplemented.

## Outputs

### `craft(inputs, recipe, schematicTier, crafterTier, random?)` — `src/simulation/craft.ts`
`(inputs, recipe, schematicTier, crafterTier, random = Math.random) => CraftResult`. In order:
1. Base averages via the shared `computeBaseAverages()`.
2. Combined ceiling raise = `min(crafterVariance.positive + schematic.ceilingRaise, COMBINED_CEILING_CAP)` (`src/data/constants/schematicTier.ts`) — schematic and crafter tier both push the ceiling up, capped.
3. Combined negative bound = `min(crafterVariance.negative + |schematic.varianceNarrowing|, 0)` — schematic narrows the downside back toward zero, never past it (a true ceiling, never negative-turned-positive).
4. One shared roll (mirrors `refine()`) applied proportionally to all 5 qualities: `raisedCeiling * (1 + rollFraction)`.
5. **Threshold penalty, applied last.** For every recipe input slot with a threshold, `pointsBelow = max(thresholdValue - actualValue, 0)`; the single **worst** (largest) points-below across all thresholded slots governs — never summed, never averaged. A `null`/N/A quality on the matching input is excluded from the check entirely (never an automatic failure). **`> 40` points below is a hard rejection** (`{ accepted: false, reason }`) — the recipe is never applied at all, no partial output.
6. `effectivePointsBelow = worstPointsBelow * (1 - schematic.penaltyForgiveness)` — a schematic **softens but never fully erases** the penalty. Multiplier via `getPenaltyMultiplier()` (`src/simulation/penaltyCurve.ts`, 5 bands from 1.0 at zero violation down through a steep late band; handles fractional `effectivePointsBelow` values correctly per that file's own boundary-fix history).
7. Final quality = `clamp(round(preThreshold * multiplier), 1, 100)`. Returns `{ accepted: true, qualities }`.

### `CraftScene` — `src/presentation/scenes/CraftScene.ts`
Recipe picker (limited to the 13 **general** recipes — `recipes-schematics.md`'s `ComponentRecipe` link table excludes the 16 component recipes, `ship.md`'s Assembly domain) + crafter-tier picker + `> Craft` button. Displays the resolved schematic tier (including the "no schematic owned" — really "no schematic exists for this recipe" — label). On rejection, consumed inputs are refunded to inventory (a rejected craft never happened). **Built (`ship.md`'s Ship Crew Roles, `Artisan`):** when the active ship (`getShipRoster()[0]`) has an assigned Artisan (`shipRole: "Crafter"`, `profession: "Artisan"`), `CraftScene` reduces the displayed/required input quantity for a general recipe by `ARTISAN_MATERIAL_DISCOUNT_BY_TIER` for the Artisan's own crew tier — rounded down, never below 1 unit — applied identically to the status display and the actual `consume()` call, before `craft()` is ever invoked. `craft()` itself is untouched.

## Must NOT Do

- Must not accept a `Planet` parameter or read planet data — same planet-agnostic boundary as Refining.
- Must not sum or average threshold violations across multiple thresholded slots — the single worst slot governs, by design.
- Must not treat a `null`/N/A quality on a thresholded input as an automatic failure or as 0 — excluded from the check entirely.
- Must not let schematic forgiveness fully erase a threshold penalty, even at 100% forgiveness on a small violation — `getPenaltyMultiplier()`'s band structure guarantees this; must not be "fixed" to allow a 1.0 multiplier for any real (>0) violation.
- Must not implement rendering/DOM/browser-API code in `craft.ts` or `penaltyCurve.ts`.
- **Must not add a crew/`CrewMember` parameter to `craft()`, or read any crew data inside `craft.ts`** — confirmed on review against `ship.md`'s Ship Crew Roles: the `Crafter` role's effects (repair for 4 professions, an input-quantity discount for Artisan) neither one reaches into `craft()`'s formula. If a future change ever needs `craft()` itself to read crew data, that's new scope requiring its own design-questions entry, not something to add here quietly.

## Testing Requirements

- `craft()`: threshold rejection triggers at exactly `>40` points below, not `>=40`; the worst of several thresholded slots governs, verified with a multi-slot recipe; a `null` quality on a thresholded slot is excluded, not failed; schematic ceiling raise and variance narrowing both cap correctly (`COMBINED_CEILING_CAP`, never-past-zero negative bound); output never exits 1-100.
- `getPenaltyMultiplier()`: every band boundary (including fractional `effectivePointsBelow` values from non-Grey schematic forgiveness) resolves to the correct multiplier; the zero-violation band (`{0,0}`) never matches a real (>0) violation.
- Regression: `refine()`, `resolveSchematicTier()` provably unaffected.
- Regression: `craft()`'s full existing test suite passes unmodified whether or not an Artisan is assigned to the active ship — the "never reaches craft() itself" guarantee (`ship.md`), verified here too, not only there.

## Definition of Done

- A player can select any general recipe, pick a crafter tier, and craft — seeing the schematic-tier bonus (if any) reflected in a higher ceiling/narrower downside, and a real, escalating-but-never-total penalty when an input is below a recipe's threshold.
- A craft attempt more than 40 points below any threshold is rejected outright, inputs untouched.
- Every displayed result is sourced directly from `craft()`'s return value — never recalculated in `CraftScene`.
- `craft()` remains provably crew-agnostic — zero references to `CrewMember` or any ship-crew concept anywhere in `craft.ts`, matching `refine()`'s own existing crew-agnostic guarantee.
