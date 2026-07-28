# Agent 22 (Amendment): Ships & Travel Presentation — Combat Additions

**Status:** Amendment to the existing Agent 22, not a new agent.

**Creation order:** Fourth, after the Agent 20 and Agent 21 Combat amendments are passing.

## Responsibility

Present a pending combat encounter's attack/flee choice, and display the resulting outcome — the first genuinely interactive prompt anywhere in the encounter system.

## Inputs

- The Agent 20 amendment's `resolveCombatChoice()`.
- Agent 22's existing voyage-arrival and travel-encounter display logic (Travel Encounters amendment), which this extends.

## Outputs

- **Pending combat prompt:** when a `CombatEncounter` with `status: 'pending'` exists for the player (from either trigger context), display it with a binary choice — Attack / Flee. No other input, no additional UI beyond this choice.
- **Outcome display:** after `resolveCombatChoice()` resolves, show the result — win (no consequence shown, trip continues), lose (redirect notice + component damage + crew unavailability, if applicable), flee (redirect notice only). Sourced entirely from the resolved `CombatEncounter` and the mutation results — never recomputed locally.
- **Retreat voyage visibility:** the resulting retreat voyage should be visible in the same voyage-tracking UI as any normal voyage — it's a real `Voyage`, not a special hidden state.

## Must NOT Do

- Must not resolve combat locally or predict/preview the outcome before the player chooses — the choice must be presented with the outcome genuinely undetermined from the UI's perspective until `resolveCombatChoice()` returns.
- Must not offer any choice beyond Attack/Flee, or any pre-combat customization/preparation step.
- Must not display or imply multi-round combat, real-time mechanics, or any consequence beyond what Agent 20's amendment actually produces.
- Must not call `localStorage` or Web Audio directly.
- Must not build any DOM-based UI or a new screen — integrate into existing voyage/arrival UI.

## Testing Requirements

- Manual or scripted playtest: trigger a combat encounter (seeded/forced for testing), choose Attack, confirm the win/lose display matches `resolveCombatChoice()`'s actual output. Repeat for Flee.
- Confirm a lose outcome's displayed component/crew consequences match the actual mutations exactly.
- Confirm the retreat voyage appears correctly in existing voyage UI.

## Definition of Done

- A player can see a pending combat encounter, choose Attack or Flee, and see an accurate outcome display for all three possible results.
- Every displayed value is sourced directly from Agent 20's function outputs — never recalculated in the presentation layer.
