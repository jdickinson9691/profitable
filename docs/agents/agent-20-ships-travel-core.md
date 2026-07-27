# Agent 20: Ships & Travel Core Agent

**Creation order:** Second in Phase 5 (after the Agent 1 amendment). Depends on the Agent 1 Phase 5 amendment and on Agent 2's `craft()`/`getTierColor()`. Precedes Agents 21–24.

## Responsibility

Implement ship assembly and tier derivation, shipwright pool refresh/purchase, and travel-time calculation/voyage resolution, as plain, framework-agnostic TypeScript. Same architectural mandate as Agents 2, 8, 11, and 16: zero dependency on Phaser, the DOM, or any browser API.

## Inputs

- Agent 1's Phase 5 amendment (types and constants — imported, never hardcoded).
- Agent 2's `craft()` (called for component crafting — components are ordinary crafted items, no reimplementation) and `getTierColor()` (called for tier derivation).
- Phase 5 GDD Section 2 for the exact rules.

## Outputs

### `deriveShipTier(ship: Ship): TierColor`
- Computes the **straight average** of installed component tiers (Section 2.3), then maps through `getTierColor()` — does not reimplement tier-mapping logic.
- Must handle missing components (`null` slots) sensibly — e.g., excluded from the average, or the ship is treated as incomplete/unratable until all four slots are filled. Whichever rule is chosen, it must be explicit and documented in code, not silently ambiguous.

### `refreshShipyardPool(planetId, seed?): ShipyardPool`
- Rolls new ship candidates via the same 7-tier breakpoint table used everywhere else, with components generated to match the resulting tier.
- Respects the tunable pool size and refresh interval from Agent 1's amendment.

### `purchaseShip(shipId, playerId): Ship | PurchaseError`
- Removes the ship from its `ShipyardPool` and transfers ownership to the player, deducting the appropriate cost (cost curve is a tunable, same pattern as NPC crew acquisition).

### `assembleShip(ship: Ship, componentId: string, slot: ComponentCategory): Ship`
- Installs a crafted `ShipComponent` (from Agent 2's `craft()` output) into the specified slot, replacing whatever was there.
- Recomputes `ship.tier` via `deriveShipTier()` after every assembly change — the tier must never be stale relative to installed components.

### `calculateTravelTime(originPlanet: Planet, destinationPlanet: Planet, ship: Ship): number`
- Computes **Euclidean distance** between the two planets' `{x, y}` positions (Section 2.7/2.8) — do not add a third dimension.
- Scales raw distance into a travel-time value using Agent 1's tunable distance-scaling constant.
- Applies the ship-tier speed modifier (Section 2.4) using `ship.tier` — the **derived** tier, not any single component's tier.

### `initiateVoyage(shipId, originPlanetId, destinationPlanetId, cargo, currentTime): Voyage`
- Computes `arrivesAt` via `calculateTravelTime()` at departure time — do not recompute mid-voyage if ship tier changes after departure (a voyage's arrival time is locked in at initiation).
- Must support carrying cargo, specifically to support the Phase 3 remote tier 6-7 sale mechanic (an item traveling to a discovered planet as part of a market sale).

### `resolveArrival(voyageId, currentTime): ArrivalResult`
- Only resolves once `currentTime >= voyage.arrivesAt` — must not allow early resolution.
- Delivers the ship and any cargo to the destination planet. For cargo tied to a Phase 3 remote sale, this is the point where that listing becomes active at the destination planet market (per Phase 3's Section 2.8 decision).

## Must NOT Do

- **Must not touch `refine()`/`craft()` internals (Agent 2), galaxy/planet generation (Agent 8), trading logic (Agent 11), or crew logic (Agent 16) in any way** — same hard boundary established in Phase 2 and extended through every phase since. This agent *calls* `craft()` and `getTierColor()`; it never alters what they do.
- Must not implement combat, encounters, or any travel-hazard mechanic — Section 2.9 explicitly defers this.
- Must not add a `z` coordinate or any 3D distance calculation — Section 2.7 is explicit that coordinates stay 2D.
- Must not hardcode any constant already defined by the Agent 1 Phase 5 amendment.
- Must not implement rendering, input, save/load, or audio.

## Testing Requirements (owned by Agent 21, but this agent must be built to support it)

- All functions must be pure and deterministic given fixed inputs and a fixed `currentTime`/seed.
- `deriveShipTier`, `calculateTravelTime`, and voyage initiation/resolution must be independently testable from each other.

## Definition of Done

- `deriveShipTier`, `refreshShipyardPool`, `purchaseShip`, `assembleShip`, `calculateTravelTime`, `initiateVoyage`, and `resolveArrival` are implemented exactly per Phase 5 GDD Section 2.
- Ship tier is provably always recomputed after any component change — never stale.
- Travel time correctly reflects both distance and ship tier, verified against a hand-calculated example.
- A voyage cannot resolve before its `arrivesAt` time, verified against an early-resolution attempt.
- Agent 2's, Agent 8's, Agent 11's, and Agent 16's functions are provably unchanged (diff or full re-run of their existing test suites with zero deviation).
- Zero imports from any rendering, DOM, or browser-API library anywhere in this agent's files.
