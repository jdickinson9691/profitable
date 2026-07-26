# Agent 10: Phase 2 Integration Agent

**Creation order:** Last in Phase 2. Depends on the Agent 1 amendment and Agents 8–9, plus the original MVP agents (2, 4, 5, 6, 7) as the baseline being integrated against.

## Responsibility

Wire Agent 8's generated galaxy into the existing MVP loop and verify the full gather → refine → craft loop still works end-to-end, now sourced from generated planets instead of the hardcoded Delta Rigelus. Verification and integration only — same spirit as the original Agent 7, not new construction.

## Inputs

- Agent 8's generation functions (`generateGalaxy`, `generatePlanet`).
- Agent 9's passing test suite, including the regression check.
- The original MVP agents' completed outputs (Agent 2's simulation core, Agent 4's adapters, Agent 5's scenes, Agent 6's original content, Agent 7's original integration report) as the baseline.

## Outputs

- A working build where:
  - A galaxy is generated from a seed (stored, per Section 2.8).
  - Gathering happens on a **generated** planet, with that planet's tier modifier and specialty bonus (if any) correctly affecting the `rollQuality()` result.
  - The gathered resource can still be refined and crafted using Agent 2's **unchanged** formulas.
- An integration report confirming Phase 2 GDD Section 1's Definition of Done is met.
- A gap list, each item attributed to the specific responsible party (the Agent 1 amendment, Agent 8, Agent 9, or an original MVP agent whose contract turns out not to have been fully met) — same attribution pattern as the original Agent 7's gap reporting.

## Must NOT Do

- Must not introduce new generation logic, new formulas, or new content to make integration work.
- **Must not modify Agent 2's `refine()` or `craft()`** to accommodate anything — if integration seems to require this, it means Section 2.6's boundary was violated upstream (most likely in Agent 8), and that's what gets reported, not patched here.
- Must not modify Agent 5's presentation scenes beyond what's needed to source planet data from Agent 8 instead of Agent 6's hardcoded Delta Rigelus content — this is an integration task, not a presentation redesign.

## Testing Requirements

- Run the full gather → refine → craft loop at least once end-to-end using a **generated** (not hardcoded) planet, with real (non-mocked) data.
- Confirm Agent 9's full test suite — including the regression check — still passes in the integrated build, not just in isolation.
- Hand-verify at least one example of a specialty planet's bonus correctly affecting a gather roll (pick a White-or-higher generated planet, confirm its specialty resource's roll reflects both the tier modifier and the +15 specialty bonus).
- Confirm the original MVP's hand-calculated refining/crafting test cases (from the original Agent 7's integration report) still pass unchanged.

## Definition of Done

- The full gather → refine → craft loop runs start to finish using a generated, seeded galaxy.
- At least one hand-verified specialty-bonus example is documented in the integration report.
- The original MVP's hand-calculated formula test cases still pass with zero deviation.
- Phase 2 GDD Section 1's Definition of Done is explicitly confirmed, in writing, as met — or a specific, attributable list of what's blocking it.
