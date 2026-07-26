# Agent 2: Simulation Core Agent

**Creation order:** Second. Depends on Agent 1 (Data Schema). Precedes Agents 3–7.

## Responsibility

Implement the actual game logic: quality roll generation, the refining formula, and the crafting formula — as plain, framework-agnostic TypeScript. This is the most consequential agent in the project: it's the layer that must survive a future migration to Unity untouched, so it must have zero dependency on Phaser/PixiJS, the DOM, or any browser API.

## Inputs

- Agent 1's type definitions and constant tables (imported, never re-derived or hardcoded).
- GDD Section 3.2 (Refining Formula) and 3.3 (Crafting Formula) for the exact step-by-step logic to implement.

## Outputs

Pure functions, each taking typed data in and returning typed data out, with no side effects and no framework objects:

### `rollQuality(resource: Resource): QualityRoll`
- For each of the 5 qualities applicable to the given resource, roll a random integer 1–100.
- For qualities marked N/A on that resource (per Agent 1's `Resource` type), return `null` — never `0`.
- Must be seedable/deterministic for testing (accept an optional RNG seed or injectable random function).

### `getTierColor(value: number): TierColor`
- Maps a 1–100 quality value to its color tier per the breakpoint table. Must handle exact boundary values correctly (40 → Grey, 41 → White, etc.).

### `refine(inputs: ResourceInstance[], refinerTier: TierColor): RefineResult`
1. Compute `base_avg` = straight average of input qualities, weighted by quantity only (not by best/worst).
2. Apply ±10% base variance, adjusted asymmetrically by `refinerTier` per the shared variance table (narrows negative side more than it extends positive side).
3. Roll refund chance per consumed input unit, keyed to the *output* tier the roll lands on (not the input tier).
4. Refining never fails — always produces a valid output at 100% base yield, plus any refund.
5. Any quality that is `null` on all inputs must be excluded from the average entirely — never treated as 0.

### `craft(inputs: ResourceInstance[], recipe: Recipe, schematicTier: TierColor, crafterTier: TierColor): CraftResult`
1. `base_avg` = straight average of input qualities (same rule as refining).
2. Ceiling raise: crafter tier (via the shared variance table) + schematic tier (via the schematic contribution table), summed additively, then capped at +18% combined — not the raw arithmetic sum.
3. Variance roll around the raised ceiling, narrowed by crafter tier + schematic tier (additive).
4. Threshold penalty, applied **last**, after steps 1–3 produce a raw value: for each input below the recipe's recommended quality threshold, apply the penalty curve, softened (not bypassed) by the schematic's forgiveness percentage. If any input is 41+ points below its threshold, reject the craft (input rejected, not just penalized).
5. Clamp final result to 1–100.
6. If a recipe references a quality that is `null`/N/A on a given input, that quality reference must be excluded from the threshold check and from the formula entirely — it must never be treated as a failing/zero value.

### `loadContent(rawConfig: unknown): { resources: Resource[], recipes: Recipe[], schematics: Schematic[], planets: Planet[] }`
- **Added to close a contract gap** discovered during MVP build-out: Agent 5 and Agent 6's contracts both reference "Agent 2's loading path" for content, but no such function was originally defined here. This is that function.
- Takes already-read raw JSON (matching Agent 1's schemas) in, and returns the typed `Resource`/`Recipe`/`Schematic`/`Planet` objects the rest of Simulation Core and Presentation consume — parsing/validation logic only.
- **No file I/O inside this function.** Reading the JSON off disk/network is the caller's job (or a thin wrapper elsewhere); this function's contract is data-in, typed-data-out, consistent with every other function in this agent.
- This is the path Agent 5 must use to access Agent 6's content — Agent 5 must never import or parse Agent 6's raw JSON files directly (see Agent 5's Must NOT Do).

## Must NOT Do

- Must not import or reference Phaser, PixiJS, the DOM, `localStorage`, Web Audio, or any browser API.
- Must not hardcode any constant already defined by Agent 1 — always import from there.
- Must not implement rendering, input handling, save/load, or audio.
- Must not silently treat a `null` quality as `0` anywhere in the formulas — this is a correctness-critical rule, not a style preference.

## Testing Requirements (owned by Agent 3, but this agent must be built to support it)

- All functions must be pure and deterministic given a fixed seed, so Agent 3 can assert exact expected outputs rather than statistical ranges alone.
- Functions must expose enough granularity (e.g., separate the "roll" step from the "clamp" step if feasible) that Agent 3 can test each formula stage independently.

## Definition of Done

- `rollQuality`, `getTierColor`, `refine`, `craft`, and `loadContent` are implemented exactly per GDD Sections 3.2–3.3 (and the loading-path amendment above).
- Given the MVP content (Igneous Ore, Hydrogen Gas, Autunite Crystal, the Radiant Alloy Bar recipe, and the Ion-Forged Hull Plate recipe), all functions run correctly end-to-end with no unhandled `null` cases.
- `loadContent` correctly parses Agent 6's config JSON into typed objects with no errors or missing fields, and is the only sanctioned path other agents use to access content.
- Zero imports from any rendering, DOM, or browser-API library anywhere in this agent's files.
