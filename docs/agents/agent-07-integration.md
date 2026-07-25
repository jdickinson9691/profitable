# Agent 7: Integration Agent

**Creation order:** Last. Depends on all six prior agents' completed outputs.

## Responsibility

Wire everything together and verify the full MVP loop actually works end-to-end — using Agent 6's content, through Agent 5's scenes, backed by Agent 2's simulation core, on Agent 4's infrastructure, all conforming to Agent 1's schemas and proven correct by Agent 3's tests. This agent's job is verification and integration, not new construction.

## Inputs

All prior agents' completed outputs:
- Agent 1: schemas and constant tables
- Agent 2: simulation core functions
- Agent 3: passing test suite
- Agent 4: infrastructure adapters
- Agent 5: presentation scenes
- Agent 6: MVP content config

## Outputs

- A working, playable (or scriptable/testable) MVP build combining all six prior agents' work.
- An integration report confirming the GDD's Section 2 Definition of Done is met: a player (or test harness) can gather a resource with a random quality roll on Delta Rigelus, refine Igneous Ore + Autunite Crystal into a Radiant Alloy Bar at a chosen refiner tier, and craft that bar + Hydrogen Gas into an Ion-Forged Hull Plate at a chosen schematic + crafter tier — with output quality at every step matching the documented formulas, verifiable against known test inputs.
- A clear list of any gaps found, each attributed to the specific upstream agent whose contract wasn't fully met (e.g., "Agent 5's craft screen calls a function that doesn't exist in Agent 2's exports" or "Agent 6's schematic tier value doesn't match any tier in Agent 1's enum").

## Must NOT Do

- Must not introduce new game logic, new formulas, or new content to "make things work" — if something is missing or broken, this agent identifies which upstream agent's contract was not met and reports it, rather than patching around the gap itself.
- Must not modify Agent 2's formulas to match what Agent 5 expects, or vice versa — mismatches are integration bugs to report, not design decisions to make unilaterally.

## Testing Requirements

- Run the full gather → refine → craft loop at least once end-to-end with real (non-mocked) data from Agent 6, through real Agent 5 scenes, backed by real Agent 2 logic.
- Confirm Agent 3's full test suite still passes in the integrated build (not just in isolation).
- Confirm at least one hand-calculated expected value per formula (refining and crafting) matches the integrated build's actual output for a fixed random seed.

## Definition of Done

- The full gather → refine → craft loop runs start to finish using Delta Rigelus and the three MVP resources, with output matching hand-calculated expected values for at least one known test case per formula.
- GDD Section 2's Definition of Done is explicitly confirmed, in writing, as met — or a specific, attributable list of what's blocking it.
