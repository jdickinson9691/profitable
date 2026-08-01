# Agent 33: Unity Parity Validation Agent

**Creation order:** Created alongside Agent 32 (Unity Simulation Core), runs continuously against it — same relationship as the original Agent 2/Agent 3 pair. In practice (this migration being built by a single agent across sessions rather than parallel agents) this contract was written and executed immediately after Agent 32 completed, not literally in parallel with it — the dependency relationship is what matters, not wall-clock overlap.

## Responsibility

**The most important agent in this phase.** Prove the C# port (Agent 32) produces numerically identical output to the existing TypeScript implementation (Agent 2) for the *same inputs* — not "the C# code passes its own hand-written tests," which Agent 32 already has, but "the C# code agrees with the TypeScript code when both are actually executed." These are different claims: Agent 32's own test suite (`ProfitableCore.Tests/Simulation/`) mirrors the TypeScript test suite's *values*, hand-copied into C# by the same agent that wrote the port — a transcription error made once in the TypeScript source and copied faithfully into the port would pass both suites while still being a real divergence from nothing, and a transcription error made *differently* in each language (e.g. a sign flip that happens to also satisfy that language's own test assertions) would not be caught at all. Only running both implementations against the same inputs and diffing the actual outputs closes that gap.

## Inputs

- Agent 32's completed C# port (`unity/ProfitableCore/Simulation/`) and Agent 31's schema (`unity/ProfitableCore/Schema/`, `unity/ProfitableCore/Constants/`).
- The live TypeScript source (`src/simulation/*.ts`) — executed directly, not read and re-transcribed.
- `tests/fixtures/{resources,instances,random,recipes}.ts` — reused as the shared corpus's known resource/recipe shapes, so both language runners start from the same named fixtures rather than two independently-typed copies.

## Outputs

### 1. A shared, reproducible test corpus with real recorded randomness

`scripts/parityHarness.ts` generates a corpus of test cases for `getTierColor`, `rollQuality`, `refine`, and `craft` — systematic sweeps for `getTierColor` (every integer 1-100 plus the known fractional-gap values), and randomized-but-recorded input/tier/random-sequence combinations for the other three. **Randomness is generated once, recorded into the corpus, and reused identically by both language runners** — this is not a statistical test; every case is deterministic given its recorded sequence, exactly the `queueRandom`/`QueueRandom` pattern each language's own unit tests already use. Random sequences are generated generously long (30 values) rather than call-count-exact, since only the actually-consumed prefix matters and over-provisioning removes any risk of the two languages disagreeing about how many random calls a given input should consume — that disagreement would itself be a bug worth finding, and an exact-length sequence would mask it by throwing "exhausted" instead of silently reading a value neither side intended.

### 2. TypeScript-side execution, recorded to disk

The harness runs every corpus case through the real, imported TypeScript functions (`rollQuality`, `getTierColor`, `refine`, `craft` — the actual functions the live game calls, not reimplementations) and writes `unity/parity/ts-parity-results.json`: every case's input plus the TypeScript output. `npm run parity` regenerates this file. Committed to the repo (same "must re-run when the source changes" caveat as Agent 31's `ProfitableCore.Tests/Fixtures/`) so the C# side has something to compare against without requiring Node at `dotnet test` time.

### 3. C#-side execution and comparison, as real `dotnet test` assertions

`ProfitableCore.Tests/Parity/ParityTests.cs` reads `ts-parity-results.json`, re-runs each case through the C# port with the identical recorded random sequence, and asserts the C# output equals the recorded TypeScript output field-for-field. This makes numeric parity a real, continuously-enforced `dotnet test` gate, not a one-time manual comparison — the same "everything verifiable via CLI, no manual cross-checking" discipline this project already applies everywhere else.

## Must NOT Do

- Must not compare hand-copied *expected values* between the two languages' own unit test suites as a substitute for this agent's job — that is what Agent 32's tests already do, and Responsibility above explains why it isn't sufficient on its own.
- Must not generate the TypeScript-side recorded output by hand or by reasoning about what the function "should" return — it must come from actually executing `src/simulation/*.ts`'s real functions.
- Must not modify Agent 32's C# implementation to make comparisons pass unless a real divergence is found — if the TypeScript and C# outputs disagree, the correct response is to determine which one is wrong (almost certainly the C# port, but confirm rather than assume) and fix that side, not to weaken the assertion.
- Must not use a random sequence length so short it risks "exhausted" errors masking a real over-consumption bug as a test-harness limitation instead of a finding.

## Testing Requirements

- Every corpus case must produce an exact match (not "close enough" / epsilon-tolerant for anything but floating-point accumulation noise, and even then only where both languages' own floating-point arithmetic could legitimately differ at the femtosecond-irrelevant level — quality values are integers post-round, so in practice this project expects exact equality throughout, not approximate).
- `getTierColor`: full 1-100 integer sweep plus the seven documented fractional-gap values, on both sides.
- `rollQuality`: multiple recorded-random cases per named test-fixture resource (igneous ore, hydrogen gas, autunite crystal, radiant alloy bar), covering resources with different applicable-quality subsets.
- `refine`: multiple input configurations (single/multiple inputs, mixed quantities, some qualities null on some inputs) crossed with all seven refiner tiers.
- `craft`: multiple input/threshold scenarios (no violation, violations landing in each of the four penalty bands, the 41+ rejection floor, a null threshold quality excluded from the check) crossed with a representative spread of schematic-tier/crafter-tier pairs, not necessarily the full 7x7 combination set.

## Definition of Done

- `unity/parity/ts-parity-results.json` exists, was generated by actually running `src/simulation/*.ts`, and is committed.
- `dotnet test` includes `ParityTests` and passes with zero mismatches against that file.
- A reviewer can regenerate the corpus (`npm run parity`) and re-run `dotnet test` to reproduce the parity proof from scratch, without needing to trust that the committed JSON wasn't hand-edited.
- If this agent ever finds a real divergence, the finding (which function, which input, which language was wrong, what the fix was) is documented in this file's own retroactive amendment or a dedicated note, the same "found and fixed, not silently patched" discipline every prior milestone in this project follows.
