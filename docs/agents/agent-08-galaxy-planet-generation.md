# Agent 8: Galaxy/Planet Generation Core Agent

**Creation order:** Second in Phase 2 (after the Agent 1 amendment). Depends on the Agent 1 amendment and on Agent 2's existing `rollQuality()`/`getTierColor()`. Precedes Agents 9–10.

## Responsibility

Implement galaxy and planet generation as plain, framework-agnostic TypeScript — the Phase 2 equivalent of what Agent 2 was for the MVP. Same architectural mandate: zero dependency on Phaser, the DOM, or any browser API, since this must also survive the eventual Unity migration untouched.

## Inputs

- Agent 1's Phase 2 amendment (types and constant tables — imported, never re-derived or hardcoded).
- Agent 2's `rollQuality()` and `getTierColor()` — called for the actual quality-roll and tier-mapping work, never reimplemented.
- `profitable-phase2-gdd.md` Section 2 for the exact rules to implement.

## Outputs

### `generateGalaxy(planetCount: number, seed?: string): { seed: string, planets: Planet[] }`
- If no seed is given, generate one and return it as part of the result — the caller is responsible for storing it if reproducibility is wanted.
- Produces a fixed, finite array of `planetCount` planets. Not a streaming/infinite generator.

### `generatePlanet(seed: string, position: { x: number, y: number }): Planet`
1. Roll planet tier: random 1-100 mapped through the existing tier breakpoint table via `getTierColor()` — do not reimplement tier-mapping logic here.
2. Assign Planet Type: random choice among `Terrestrial | SuperEarth | Neptunian | GasGiant`. Exact distribution isn't specified in the design — uniform random is the default unless told otherwise.
3. Determine eligible resource categories from Planet Type via Agent 1's lookup table.
4. Compute resource subset count: `max(1, ceil(percentage × eligible_count))` using Agent 1's percentage-by-tier table.
5. **If tier is White or higher:** select exactly one specialty resource from the eligible pool **first**, before filling the rest of the subset. Grey-tier planets get `specialtyResourceId: null` and no specialty selection step at all.
6. Fill the remaining `count - 1` slots (or full `count` for Grey) via uniform random draw from the eligible pool, **excluding** the already-selected specialty so it's never picked twice.
7. Set `discovered: false` (the starting planet's `discovered: true` override is Agent 10's integration concern, not this agent's).
8. Set `name` to a placeholder scheme (e.g., `"Planet-{id}"}`) — real name generation is out of scope for Phase 2.

### Planet tier's effect on gathering (integration point, not a new formula)
- The planet tier quality modifier and specialty bonus are **applied when a gather action calls `rollQuality()` for a resource on a specific planet** — not baked into `rollQuality()` as a hidden side effect that changes its behavior for MVP callers who don't pass a planet.
- If applying the modifier requires changing `rollQuality()`'s signature, the change must be **additive/backward-compatible** (e.g., an optional planet-modifier parameter defaulting to no modifier) — existing MVP call sites must continue to work unchanged.

## Must NOT Do

- **Must not touch `refine()` or `craft()` in any way.** This is the single hardest boundary in Phase 2 — planet tier's mechanical effect is gathering-only, per the locked design decision. If something seems to require changing these functions, stop and report it as a design conflict rather than resolving it unilaterally.
- Must not import or reference Phaser, PixiJS, the DOM, `localStorage`, Web Audio, or any browser API.
- Must not hardcode any constant already defined by the Agent 1 amendment.
- Must not implement rendering, input handling, save/load, or audio.
- Must not implement real procedural name generation, discovery-state behavior, or any market/travel logic — all explicitly out of scope for Phase 2.

## Testing Requirements (owned by Agent 9, but this agent must be built to support it)

- All functions must be pure and deterministic given a fixed seed, so Agent 9 can assert exact expected outputs, the same requirement Agent 2 had to meet for Agent 3.
- `generateGalaxy()` and `generatePlanet()` must expose enough granularity that Agent 9 can independently test tier assignment, Planet Type assignment, subset selection, and specialty selection as separate stages.

## Definition of Done

- Given a fixed seed, `generateGalaxy()` produces an identical galaxy on every call.
- Every generated planet's tier, Planet Type, resource subset, and specialty (if any) conform exactly to Phase 2 GDD Section 2's rules.
- `refine()` and `craft()` are provably unchanged from their MVP behavior — confirmable via a diff or by re-running Agent 3's original MVP test suite with zero modifications and zero failures.
- Zero imports from any rendering, DOM, or browser-API library anywhere in this agent's files.
