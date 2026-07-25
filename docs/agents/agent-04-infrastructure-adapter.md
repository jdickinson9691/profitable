# Agent 4: Infrastructure/Adapter Agent

**Creation order:** Fourth. Independent of Agent 2/3's internals — can be built in parallel with them, but must exist before Agent 5 (Presentation) starts.

## Responsibility

Build the browser-API isolation layer required by the GDD's architectural mandate (Section 4): wrap every browser-specific capability (persistence, audio, and eventually networking) behind a single swappable adapter interface, so no other agent ever calls a browser API directly. This is what keeps the eventual Unity migration a port rather than a rewrite.

## Inputs

- GDD Section 4 (Technical Architecture / architectural mandate).
- `docs/profitable-design-questions.md` — Engine/Systems Architecture decisions on web-only capability isolation.

## Outputs

### `SaveSystem` interface
- `save(key: string, data: unknown): void`
- `load(key: string): unknown | null`
- One concrete implementation backed by `localStorage` for the MVP web build.
- No game logic may call `localStorage` directly anywhere else in the codebase — always through this interface.

### `AudioManager` interface
- `play(soundId: string): void`
- `stop(soundId: string): void`
- One concrete implementation backed by the Web Audio API for the MVP web build.
- No other agent may call Web Audio directly.

### (Stub only, not required for MVP functionality) `NetworkAdapter` interface
- A thin interface over WebSockets, per the decision to build this early even though multiplayer is out of scope, so it costs nothing now and avoids a rewrite later. A no-op/stub implementation is sufficient for the MVP — this does not need to do anything functional yet.

## Must NOT Do

- Must not implement any gameplay logic, quality/refining/crafting math, or rendering.
- Must not import anything from Agent 2 (Simulation Core) — this agent has no knowledge of game rules, only of persistence/audio/networking mechanics.
- Must not build DOM-based UI, URL/cookie-based state, or any other browser capability outside the three adapters above — those are explicitly to be avoided entirely, not wrapped (see GDD Section 4).

## Testing Requirements

- Confirm `SaveSystem.save()` followed by `SaveSystem.load()` round-trips data correctly.
- Confirm no other file in the codebase contains a direct `localStorage` or `Audio()`/Web Audio call outside this agent's own implementation files (a grep-based check is sufficient — this is an architectural constraint, not a subtle logic test).

## Definition of Done

- Every persistence or audio need anywhere else in the codebase goes through `SaveSystem` or `AudioManager`.
- A search for raw `localStorage` or Web Audio API calls outside this agent's files returns nothing.
- The interfaces are designed so that swapping the concrete implementation (e.g., to Unity's `PlayerPrefs` and audio system at migration time) requires changing only this agent's files, with zero changes to any call site elsewhere in the codebase.
