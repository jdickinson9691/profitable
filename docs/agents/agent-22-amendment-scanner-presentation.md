# Agent 22 (Amendment): Ships & Travel Presentation — Scanner/Probe Additions

**Status:** Amendment to the existing Agent 22, not a new agent. Every existing scene (including the Travel Encounters amendment's arrival-summary display) is unchanged.

**Creation order:** Fourth, after the Agent 20 and Agent 21 Scanner amendments are passing.

## Responsibility

Display a scanner listing at the market, and a "Scan" action while docked, using only the Agent 20 amendment's functions.

## Inputs

- The Agent 20 amendment's `refreshScannerPool()`, `purchaseScanner()`, `performScan()`.
- Agent 22's existing shipyard screen (the natural place for a scanner listing, given both are market-pool purchases) and the existing "docked at a planet" UI context.

## Outputs

- **Scanner listing:** shown alongside or near the existing shipyard screen's ship listings — displays available scanners from `ScannerPool`, their tier, and cost; lets the player purchase (calls `purchaseScanner`).
- **Scan action:** available while the player is docked at a discovered planet with a scanner owned. Triggers `performScan()` and displays the resulting `newlyDiscovered` planets to the player (e.g., added to a "newly discovered" list or highlighted on the map).
- **Owned-scanner display:** shows which scanner(s) the player owns and their tier, so the "highest tier is used" rule (from Agent 20) is legible to the player rather than a hidden backend detail.

## Must NOT Do

- Must not reimplement or duplicate radius/distance calculation locally — always call `performScan()`.
- Must not build a new screen for the scanner listing — integrate into the existing shipyard-adjacent market UI.
- Must not display or suggest any passive/automatic discovery — the UI must make clear that scanning is a deliberate action the player triggers, not something that happens automatically during travel.
- Must not display any connection to Travel Encounters or to map data freshness — none exists, and the UI should not imply otherwise.
- Must not call `localStorage` or Web Audio directly.
- Must not build any DOM-based UI.

## Testing Requirements

- Manual or scripted playtest: purchase a scanner, dock at a discovered planet, trigger a scan, and confirm the displayed newly-discovered planets match `performScan()`'s actual output exactly.
- Confirm the UI correctly reflects "highest-tier scanner used" when the player owns more than one.

## Definition of Done

- A player can browse and purchase a scanner, and — while docked — trigger a scan and see accurate results.
- Every displayed value is sourced directly from Agent 20's function outputs — never recalculated in the presentation layer.
