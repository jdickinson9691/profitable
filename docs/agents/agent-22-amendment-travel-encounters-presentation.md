# Agent 22 (Amendment): Ships & Travel Presentation — Travel Encounters Additions

**Status:** Amendment to the existing Agent 22 (`agent-22-ships-travel-presentation.md`), not a new agent. Every existing scene Agent 22 built is unchanged — this file documents what's added.

**Creation order:** Fourth, after the Agent 20 and Agent 21 amendments are passing.

## Responsibility

Display encounter results as part of the existing voyage-arrival UI. No new screen — an addition to the arrival display Agent 22 already built.

## Inputs

- The Agent 20 amendment's `Voyage.encounters` field (populated by `resolveArrival()`).
- Agent 22's existing voyage-arrival display logic, which this amendment extends.

## Outputs

- **Encounter summary on the existing arrival screen:** for each `EncounterResult` in `voyage.encounters`, display a short outcome line — e.g., "Encountered a trader en route: +150 Credits" for trade-opportunity, "Found derelict cargo: [item, quality]" for discovery, "Navigational hazard: passed" or "Navigational hazard: -[amount] Credits" for hazard. Sourced entirely from `EncounterResult` data — no re-computation.
- If `voyage.encounters` is empty, no encounter section is shown — an uneventful trip stays uneventful in the UI, not padded with a "nothing happened" message.

## Must NOT Do

- Must not build a new screen or scene — this is an addition to the existing arrival display within Agent 22's current scenes.
- Must not compute or re-derive any encounter outcome locally — display only what `Voyage.encounters` already contains.
- Must not build any interactive UI for encounters (no "accept/decline" buttons, no choice prompts) — Section 2.3 is explicit that resolution is automatic; the UI only reports what already happened.
- Must not call `localStorage` or Web Audio directly — must go through Agent 4's adapters, same rule as every presentation agent.
- Must not build any DOM-based UI.

## Testing Requirements

- Manual or scripted playtest: complete a voyage with at least one encounter of each type (may require seeding/forcing outcomes for testing purposes) and confirm the displayed summary matches `Voyage.encounters` exactly.
- Confirm a zero-encounter voyage's arrival screen shows no encounter section at all.

## Definition of Done

- The existing voyage-arrival screen correctly displays encounter outcomes for all three types when present, and shows nothing extra when `voyage.encounters` is empty.
- Every displayed value is sourced directly from `Voyage.encounters` — never recalculated in the presentation layer.
