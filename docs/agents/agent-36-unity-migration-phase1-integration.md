# Agent 36: Unity Migration Phase 1 Integration Agent

**Creation order:** Last in Migration Phase 1. Depends on all five prior agents' completed outputs (31-35).

## Responsibility

Wire everything together and verify the full gather → refine → craft loop actually works end-to-end in Unity — using Agent 31's real content and schema, through Agent 35's scene, backed by Agent 32's simulation core, proven correct by Agent 33's parity suite. Mirrors Agent 7's original role for the MVP exactly (`docs/agents/agent-07-integration.md`): this agent's job is verification and integration, not new construction. It also confirms Agent 33's parity proof holds **end-to-end** — the same functions chained together (refine's output feeding craft's input), not just each one validated in isolation against its own recorded inputs.

## Inputs

All five prior agents' completed outputs:
- Agent 31: schema, constant tables, `ContentLoader`
- Agent 32: `RollQuality`, `Refiner.Refine`, `Crafter.Craft`, `TierColorResolver.GetTierColor`
- Agent 33: parity corpus and passing cross-language comparison suite
- Agent 34: infrastructure adapters (not exercised by Agent 35's minimal scope, so not exercised here either — see Must NOT Do)
- Agent 35: `MvpLoop.unity`, the four panel scripts, `GameContent`, `Inventory`

Also, directly: `tests/integration/mvpLoop.test.ts` — the original MVP integration test this agent's deterministic test mirrors. Its exact hand-calculated cases (not re-derived) are the cross-check this agent reuses, since a value already proven correct by a human review in the original TypeScript build is a stronger anchor than a freshly-invented one.

## Outputs

### 1. A deterministic, hand-calculated end-to-end test (EditMode)

`Assets/Tests/EditMode/IntegrationTests.cs` reuses `tests/integration/mvpLoop.test.ts`'s exact scenario — real `GameContent`-loaded content (not test fixtures), the same input qualities, the same tier choices, the same `QueueRandom` sequences, the same expected output values — chained so `Refiner.Refine`'s actual output (not a hand-typed copy of it) is fed directly into `Crafter.Craft`'s input. This proves two things at once: the C# port agrees with the already-proven-correct TypeScript values (a second, end-to-end data point alongside Agent 33's per-function parity corpus), and the refine-to-craft data flow through real `ResourceInstance`/`QualityMap` objects doesn't lose or corrupt anything in between.

### 2. A real click-through test (PlayMode)

`Assets/Tests/PlayMode/FullLoopClickThroughTest.cs` loads the actual `MvpLoop.unity` scene and invokes the actual `Button` components' `onClick` — nav buttons to switch panels, then Gather/Refine/Craft's real buttons — in the same sequence a player would click, not by instantiating panels in isolation the way Agent 35's `EditMode` tests do. Closes a real gap: Agent 35's own `PlayMode` test only confirmed the UI *builds*, never that clicking through it actually *runs* the loop. Gather results are genuinely random here (unlike the deterministic test above, which is the intentional split — see Must NOT Do), so this test asserts the loop *completes* (a definitive accept-or-reject outcome is logged, no exception is thrown) rather than a specific craft outcome, which real randomness can't guarantee either way.

### 3. Integration report

This document's own Definition of Done section, filled in after running both tests, confirming the migration GDD's Section 2 equivalent (Migration Phase 1's "prove numeric parity... before anything else proceeds") is met — or a specific, attributable list of what's blocking it, naming the responsible upstream agent per finding.

## Must NOT Do

- Must not introduce new game logic, new formulas, or new content to "make things work" — a gap found here is reported and attributed to the specific upstream agent whose contract wasn't fully met, not patched around directly in this agent's own files (same rule as Agent 7's own Must-Not-Do).
- Must not modify Agent 32's formulas to match what Agent 35 expects, or vice versa — mismatches are integration bugs to report, not design decisions to make unilaterally.
- Must not exercise Agent 34's `SaveSystem`/`AudioManager` — Agent 35's own contract deliberately keeps `Inventory` session-only and never wires persistence/audio in (see `agent-35-unity-mvp-presentation.md`'s Must-Not-Do), so there is nothing of Agent 34's for this integration pass to exercise yet. Not a gap; that wiring is later migration-phase scope.
- Must not assert an exact craft accept/reject outcome in the real-click PlayMode test — gather rolls are genuinely random there, unlike the deterministic EditMode test, and asserting a specific outcome would make the test flaky by construction, not more rigorous.

## Testing Requirements

- Run the full gather → refine → craft loop at least once end-to-end with real (non-mocked) data — real `content/*.json` via `GameContent`, real `Refiner.Refine`/`Crafter.Craft`, chained so refine's actual output object is craft's actual input.
- Confirm the exact hand-calculated values `tests/integration/mvpLoop.test.ts` already established (Gold-tier refine of 2x Igneous Ore + 1x Autunite Crystal at uniform quality 60 → White-tier output, all qualities 60, 0 refund; Blue-schematic + Gold-crafter craft of that output + Hydrogen Gas → accepted, all qualities 71) reproduce exactly in the C# port.
- Confirm all existing suites still pass together, not just in isolation: `dotnet test` (`ProfitableCore.Tests`), Unity `EditMode`, and Unity `PlayMode`.
- Run the real click-through test and confirm it completes without exception, with a definitive logged outcome.

## Definition of Done

- The full gather → refine → craft loop runs start to finish in Unity, both as a deterministic hand-calculated proof and as a real click-through of the actual scene.
- Migration Phase 1's own stated goal — "prove numeric parity against the existing TypeScript test suite before anything else proceeds" (`profitable-unity-migration-gdd.md` Section 2) — is explicitly confirmed met, in writing, below.
- `dotnet test`, Unity `EditMode`, and Unity `PlayMode` all pass together as one verification sweep, not just individually across separate sessions.

---

## Integration report

**Migration Phase 1's Definition of Done is met.** All five agents' outputs (31-35) integrate correctly; the full gather → refine → craft loop runs start to finish in Unity, proven two ways:

1. **Deterministically**, reusing `tests/integration/mvpLoop.test.ts`'s exact hand-calculated scenario against the real `content/*.json` (via `GameContent`), with `Refiner.Refine`'s actual output object chained into `Crafter.Craft`'s input — not two independently-asserted halves. Reproduces the same values the original TypeScript integration test already established: Gold-tier refine of 2x Igneous Ore + 1x Autunite Crystal (uniform quality 60) → White-tier output, all qualities 60, 0 refund; that output + Hydrogen Gas crafted at Blue schematic + Gold crafter → accepted, all qualities 71. Exact match, both languages, chained end-to-end — not just per-function (Agent 33's scope) but through the real data flow between them.
2. **Interactively**, by loading the real `MvpLoop.unity` scene and invoking the real `Button` components' `onClick` in play-through order (nav → Gather ×4 clicks → nav → Refine → nav → Craft), confirming the loop completes with a definitive logged outcome and no exceptions. Run 4 times total (across two sessions) with independently-random gather rolls each time — consistently passes regardless of which side of the durability threshold the roll lands on, confirming this isn't a coincidentally-passing flaky test.

**No gaps found.** No upstream agent's contract was violated; nothing needed patching to make the pieces fit. One real, worth-naming finding surfaced during Agent 35 (not this agent) and is already fixed and committed: `CraftPanel` originally didn't return consumed materials to `Inventory` on a rejected craft, diverging from `CraftScene.ts`'s established "a rejected craft never happened" behavior — found by checking the TypeScript source directly, fixed before Agent 35's own commit landed.

**Full verification sweep, run together:**
- `dotnet test` (`ProfitableCore.Tests`): 504/504 passed.
- Unity `EditMode` (`Unity.exe -batchmode -runTests -testPlatform EditMode`): 27/27 passed (24 from Agent 35 + 3 new `IntegrationTests`).
- Unity `PlayMode` (`Unity.exe -batchmode -runTests -testPlatform PlayMode`): 2/2 passed, confirmed stable across 4 independent runs.
- `npm test` (the original TypeScript suite, unaffected by this migration): 563/563 passed.

**Migration Phase 1 is complete.** `rollQuality`, `getTierColor`, `refine`, `craft`, and `loadContent` are all ported to C#, proven numerically identical to the TypeScript source (Agent 33's 343-case parity corpus plus this agent's end-to-end chain), running in a real Unity scene a player can open and click through. Migration Phase 2+ (Galaxy/Planets → Trading → Crew → Ships/Travel → the four deferred gaps) is out of this document's scope — see `profitable-unity-migration-gdd.md` Section 2.
