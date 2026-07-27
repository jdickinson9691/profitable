# Agent 22: Ships & Travel Presentation Agent

**Creation order:** Fourth in Phase 5. Depends on Agent 20 (Ships & Travel Core) and Agent 4 (Infrastructure/Adapter, unchanged since the MVP). Should not start until both exist and Agent 21's core tests are passing.

## Responsibility

Build the Phaser scenes for ships and travel: a shipyard/purchase screen, a ship assembly screen (swap components), and the map's new travel layer (destination selection, computed travel time, voyage-in-progress display). This agent owns everything the player sees and clicks for ships and travel — and nothing else.

## Inputs

- Agent 20's public functions (`refreshShipyardPool`, `purchaseShip`, `assembleShip`, `deriveShipTier`, `calculateTravelTime`, `initiateVoyage`, `resolveArrival`) — called, never duplicated or reimplemented.
- Agent 4's `SaveSystem` and `AudioManager` interfaces — used for any persistence or sound, never bypassed.
- Agent 5's, Agent 13's, and Agent 18's existing scenes and this agent's new scenes must coexist in the same Phaser game instance without conflicting scene keys or state.
- Phase 3's existing trade map scene (Agent 13) — this agent extends it with a travel layer, per Section 2.6's "same map, extended" decision; it does not build a second map.

## Outputs

- **Shipyard screen** (at a planet's market, alongside Agent 13's trading UI and Agent 18's crew UI): lists the current `ShipyardPool`, shows each candidate ship's derived tier and installed components, lets the player purchase (calls `purchaseShip`).
- **Ship assembly screen:** shows the player's owned ship(s), each component slot (weapon/engine/shield/cargo hold), lets the player swap in a crafted component (calls `assembleShip`), and displays the resulting derived tier live as components change.
- **Map travel layer:** extends the existing trade map (Agent 13) — for each discovered planet, displays computed travel time (calls `calculateTravelTime`) using the player's current ship, lets the player select a destination and initiate a voyage (calls `initiateVoyage`), and shows voyage-in-progress status (time remaining until `arrivesAt`).

## Must NOT Do

- Must not reimplement or duplicate any tier-derivation, travel-time, or voyage logic locally — always call Agent 20's functions.
- Must not call `localStorage` or Web Audio directly — must go through Agent 4's adapters.
- Must not build any DOM-based UI — all UI renders inside the Phaser canvas, same rule as every prior presentation agent.
- Must not build a second, separate map screen — the travel layer extends Agent 13's existing trade map scene, per Section 2.6.
- Must not display or imply any encounter/combat mechanic during travel — Section 2.9 explicitly has none; the UI must not suggest one exists (e.g., no "risk of encounter" messaging).
- Must not read Agent 20's internal/private helpers or Agent 23's raw content JSON directly.

## Testing Requirements

- Manual or scripted playtest: purchasing a ship, assembling components, and observing the derived tier update must exactly match what Agent 20 actually computed — no presentation-layer math.
- Confirm the displayed travel time for a given route/ship matches Agent 20's `calculateTravelTime` output exactly.
- Confirm initiating a voyage and checking back after the arrival time correctly shows the ship/cargo delivered, sourced from `resolveArrival`.
- Confirm no DOM UI elements exist anywhere in the new scenes, and confirm the travel layer is visually part of the existing map scene, not a separate screen.

## Definition of Done

- A player can browse a shipyard, purchase a ship, assemble/swap its components and see the tier update live, select a discovered destination on the map, see an accurate travel time, initiate a voyage, and see it resolve correctly on arrival.
- Every displayed value is sourced directly from Agent 20's function outputs — never recalculated in the presentation layer.
- All persistence/audio in these scenes goes through Agent 4's adapters exclusively.
