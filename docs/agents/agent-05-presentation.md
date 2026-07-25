# Agent 5: Presentation Agent

**Creation order:** Fifth. Depends on Agent 2 (Simulation Core) and Agent 4 (Infrastructure/Adapter). Should not start until both exist.

## Responsibility

Build the Phaser/PixiJS scenes for the MVP loop: a map screen (trivial, since there's only one hardcoded planet for MVP), and simple animated screens for resource collection (gathering), refining, and crafting. This agent owns everything the player sees and clicks — and nothing else.

## Inputs

- Agent 2's public functions (`rollQuality`, `getTierColor`, `refine`, `craft`) — called, never duplicated or reimplemented.
- Agent 4's `SaveSystem` and `AudioManager` interfaces — used for any persistence or sound, never bypassed.
- GDD Section 3.4 (MVP Content) for what's actually being displayed: Delta Rigelus (the planet), Igneous Ore / Hydrogen Gas / Autunite Crystal (resources), the Radiant Alloy Bar refining recipe, and the Ion-Forged Hull Plate crafting recipe.

## Outputs

- **Map screen:** shows Delta Rigelus as the only location. Can be a single static screen for MVP — no travel, no other planets, no modifiers.
- **Gather screen:** a simple animated interaction that, on player action, calls `rollQuality()` for a chosen resource and displays the resulting quality values and their tier colors.
- **Refine screen:** lets the player select gathered resources as refining inputs, calls `refine()` with a chosen refiner tier, and animates/displays the result (including any refund).
- **Craft screen:** lets the player select a refined item and secondary input, a schematic tier, and a crafter tier, calls `craft()`, and animates/displays the resulting item's quality and aggregate color tier.

## Must NOT Do

- Must not reimplement or duplicate any formula logic locally (e.g., must not compute quality tiers or refining outcomes in a Phaser scene directly — always call Agent 2's functions).
- Must not call `localStorage` or Web Audio directly — must go through Agent 4's `SaveSystem`/`AudioManager`.
- Must not build any DOM-based UI (HTML/CSS overlays) — all UI must render inside the Phaser/PixiJS canvas.
- Must not use URL parameters, cookies, or browser routing for game state.
- Must not read Agent 2's internal/private helpers or Agent 6's raw JSON content files directly — content should be accessed through Agent 2's loading path, not read independently.

## Testing Requirements

- Manual or scripted playtest: clicking through gather → refine → craft using only this agent's scenes produces displayed numbers that exactly match what Agent 2 actually computed (no presentation-layer math discrepancies).
- Confirm no DOM UI elements are used anywhere (a quick audit of the codebase for HTML/CSS-based UI components should return nothing).

## Definition of Done

- A player can complete the full gather → refine → craft loop using only this agent's scenes.
- Every displayed value (quality numbers, tier colors, refund/penalty outcomes) is sourced directly from Agent 2's function outputs — never recalculated in the presentation layer.
- All persistence/audio in these scenes goes through Agent 4's adapters exclusively.
