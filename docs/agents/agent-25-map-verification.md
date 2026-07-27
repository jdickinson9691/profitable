# Agent 25: Map Verification Agent

**Creation order:** First in the Galactic Map milestone. Depends on the existing Agent 13 (Trading Presentation) and Agent 20/22 (Ships & Travel Core/Presentation) implementations — this agent audits them, it does not extend them.

## Responsibility

Audit the existing map implementation (Phase 3's trade layer + Phase 5's travel layer, one screen) against the four properties decided in the Galactic Map design pass. Produce evidence for each — not new production code, an audit.

## Inputs

- The existing, already-committed Agent 13 and Agent 20/22 implementations and their test suites (Agent 12, Agent 21).
- `profitable-map-gdd.md` Section 2.

## Outputs

A verification report (and, where feasible, small targeted test additions to existing suites — not a new parallel suite) covering:

### 2.1 — No advance warning for emergencies
- Inspect the emergency-triggering logic (wherever it lives from Phase 3). Confirm an emergency's effects apply immediately upon trigger, with no separate pre-warning delay or countdown anywhere in the code path.
- If a pre-warning delay is found, this is a **bug to report**, not a feature to remove unilaterally — flag it for Agent 26's confirmation report.

### 2.2 — No staleness, map data always live
- Confirm the map's rendering path for any discovered planet queries current `PlanetMarketState`/season/emergency data at render/display time — the same pattern already verified for `getGlobalPrice()` in Agent 12's test suite.
- Specifically check for any caching layer, snapshot, or "last fetched" timestamp gating what the map displays for a discovered planet. If found, report it — do not add a workaround silently.

### 2.3 — No scanner/probe mechanic
- Confirm discovery only ever transitions `discovered: false → true` via physical visitation (the existing Phase 2/3 mechanism) — search the codebase for any alternate discovery-range or remote-discovery code path. There should be none; a "no matches found" result is a **pass**, not an incomplete check.

### 2.4 — No new galaxy-wide view required
- This one isn't a code audit — confirm via manual review/playtest that the existing per-planet map screen remains navigable and legible at the current galaxy size (per Phase 2's fixed planet count). Document the planet count tested at, since "sufficient at current scale" is the actual claim being verified, not "sufficient at any scale."

## Must NOT Do

- Must not implement any of the four deferred future ideas (advance warning, staleness, scanner, new galaxy view) — this agent's job is to confirm their absence, not add small versions of them "for completeness."
- Must not modify Agent 13's or Agent 20/22's production logic to fix anything found — report findings to Agent 26 instead.
- Must not create a large new parallel test suite — prefer small, targeted additions to existing suites (Agent 12, Agent 21) where a gap in coverage is found, consistent with those suites already being the source of truth for this system's correctness.

## Definition of Done

- Written evidence exists for each of Sections 2.1–2.4, either a pointer to an existing passing test/code path that already covers it, or a newly added small test that does.
- Any discrepancy found is documented with enough detail (file, function, expected vs. actual) for Agent 26 to route it as a bug report against the correct upstream agent.
