# Agent 18: Crew Presentation Agent

**Creation order:** Fourth in Phase 4. Depends on Agent 16 (Crew Core) and Agent 4 (Infrastructure/Adapter, unchanged since the MVP). Should not start until both exist and Agent 17's core tests are passing.

## Responsibility

Build the Phaser scenes for crew management: browsing/hiring from a planet's crew pool, assigning crew to active crafts, viewing idle/background status, and dismissal. This agent owns everything the player sees and clicks for crew — and nothing else.

## Inputs

- Agent 16's public functions (`refreshCrewPool`, `hireCrew`, `assignToCraft`, `resolveBackgroundCrafting`, `payUpkeep`, `checkAttrition`, `dismissCrew`) — called, never duplicated or reimplemented.
- Agent 4's `SaveSystem` and `AudioManager` interfaces — used for any persistence or sound, never bypassed.
- Agent 5's and Agent 13's existing scenes and this agent's new scenes must coexist in the same Phaser game instance without conflicting scene keys or state.

## Outputs

- **Crew hiring screen** (at a planet's market, alongside Agent 13's trading UI): lists the current `PlanetCrewPool`, shows each candidate's tier/profession/cost, lets the player hire (calls `hireCrew`) up to their current capacity.
- **Crew management screen:** lists the player's current crew, shows each member's status (idle/active), assigned craft if active, upkeep/wage status, and lets the player assign a crew member to a craft (calls `assignToCraft`), check on idle members' background production (calls `resolveBackgroundCrafting`), or dismiss (calls `dismissCrew`).
- **Capacity display:** shows current capacity usage (`baseCapacity + purchasedSlots` vs. crew count) and an option to purchase additional capacity.

## Must NOT Do

- Must not reimplement or duplicate any crew logic locally — always call Agent 16's functions.
- Must not call `localStorage` or Web Audio directly — must go through Agent 4's adapters.
- Must not build any DOM-based UI — all crew UI renders inside the Phaser canvas, same rule as every prior presentation agent.
- Must not display or imply any random-chance crew loss mechanic in the UI (e.g., no "risk of losing this crew member" messaging) — Section 2.7 explicitly has no such mechanic; the UI must not suggest one exists.
- Must not read Agent 16's internal/private helpers directly.

## Testing Requirements

- Manual or scripted playtest: hiring a crew member, assigning them to an active craft, and observing simultaneous progress alongside the player's own craft must exactly match what Agent 16 actually computed — no presentation-layer math.
- Confirm checking on an idle crew member's background production displays a result consistent with Agent 16's `resolveBackgroundCrafting` output, not a locally-estimated value.
- Confirm no DOM UI elements exist anywhere in the new crew scenes.

## Definition of Done

- A player can browse a planet's crew pool, hire a crew member (within capacity), assign them to an active craft alongside the player's own simultaneous craft, check on an idle member's background production, and dismiss a crew member.
- Every displayed value is sourced directly from Agent 16's function outputs — never recalculated in the presentation layer.
- All persistence/audio in these scenes goes through Agent 4's adapters exclusively.
