# Profitable MVP — AI Agent Contracts

This folder breaks out each AI agent from the MVP Game Design Document (Section 5) into its own standalone contract file. Each file is self-contained: responsibility, inputs, outputs, explicit "must not do" boundaries, testing requirements, and a definition of done.

## Creation Order (each depends on the ones before it)

1. [`agent-01-data-schema.md`](agent-01-data-schema.md) — defines types, schemas, and constant tables. Everything else depends on this.
2. [`agent-02-simulation-core.md`](agent-02-simulation-core.md) — implements the actual quality/refining/crafting formulas as pure, framework-agnostic functions.
3. [`agent-03-validation-test.md`](agent-03-validation-test.md) — tests Agent 2's output against the documented tables. Created alongside Agent 2, runs continuously.
4. [`agent-04-infrastructure-adapter.md`](agent-04-infrastructure-adapter.md) — builds the `SaveSystem`/`AudioManager` browser-isolation adapters. Independent of Agents 2/3's internals.
5. [`agent-05-presentation.md`](agent-05-presentation.md) — builds the Phaser scenes (map, gather, refine, craft). Depends on Agents 2 and 4.
6. [`agent-06-content.md`](agent-06-content.md) — writes the actual MVP config data (resources, planet, recipes). Depends on Agent 1 only; can run in parallel with 2–5.
7. [`agent-07-integration.md`](agent-07-integration.md) — wires everything together and verifies the full MVP loop. Depends on all six prior agents.

## Phase 2: Galaxy & Planet Generation

MVP is complete; these extend the roster for the next milestone. Full scope: `profitable-phase2-gdd.md`.

8. [`agent-01-amendment-phase2-schema.md`](agent-01-amendment-phase2-schema.md) — **amendment to Agent 1**, not a new agent. Adds `PlanetType`, the planet tier modifier table, the resource subset percentage table, and the extended `Planet` type. Created first in Phase 2.
9. [`agent-08-galaxy-planet-generation.md`](agent-08-galaxy-planet-generation.md) — implements galaxy/planet generation as pure, framework-agnostic TypeScript. Depends on the Agent 1 amendment and Agent 2's existing `rollQuality`/`getTierColor`.
10. [`agent-09-phase2-validation-test.md`](agent-09-phase2-validation-test.md) — tests Agent 8's output against Phase 2's tables, and runs a regression check confirming Agent 2's `refine()`/`craft()` are untouched. Created alongside Agent 8, runs continuously.
11. [`agent-10-phase2-integration.md`](agent-10-phase2-integration.md) — wires generated planets into the existing MVP loop and verifies the full gather → refine → craft loop still works end-to-end. Created last.

## Phase 3: The Trading Loop

Phase 2 is complete; these extend the roster for the next milestone. Full scope: `profitable-phase3-gdd.md`.

12. [`agent-01-amendment-phase3-schema.md`](agent-01-amendment-phase3-schema.md) — **amendment to Agent 1**, not a new agent. Adds `Listing`, `PlanetMarketState`, `Wallet`, the trading tunable constants, and (a necessary completion) `Resource.itemTier`. Created first in Phase 3.
13. [`agent-11-trading-core.md`](agent-11-trading-core.md) — implements listing/purchase/drift/recovery/global-price/fee logic as pure, framework-agnostic TypeScript. Depends on the Agent 1 Phase 3 amendment.
14. [`agent-12-phase3-validation-test.md`](agent-12-phase3-validation-test.md) — tests Agent 11's output against Phase 3's rules, including the global-price invariant and a regression check confirming Agents 2 and 8 are untouched. Created alongside Agent 11, runs continuously.
15. [`agent-13-trading-presentation.md`](agent-13-trading-presentation.md) — builds the market/trade-map Phaser scenes. Depends on Agent 11 and Agent 4's existing adapters.
16. [`agent-14-trading-content.md`](agent-14-trading-content.md) — writes base price and planet buy/sell preference config data. Depends on the Agent 1 Phase 3 amendment only; can run in parallel with Agents 11–13.
17. [`agent-15-phase3-integration.md`](agent-15-phase3-integration.md) — wires the trading loop into the existing gather → refine → craft loop and verifies the full extended loop end-to-end. Created last.

## Cross-Cutting Rules (apply to every agent, not just one)

These rules aren't restated in full in every file, but every agent above is bound by them:

- **No agent hardcodes a number that already exists in Agent 1's output.** If a value needs to change, it changes in exactly one place — Agent 1's constant tables.
- **No agent reaches "downward" past its declared inputs.** For example, the Presentation Agent (5) may call Simulation Core's (2) public functions, but must never read Simulation Core's internal/private helpers, and must never import the Content Agent's (6) raw JSON directly — it goes through Simulation Core's loading path instead.
- **Every agent's output must be independently reviewable against its own Definition of Done**, without requiring a reviewer to understand any other agent's internals. This is what makes each contract a real contract rather than a loose task description — a human or an orchestrating agent should be able to check any single agent's work in isolation.
- **Mismatches between agents are integration bugs, not license to freelance.** If Agent 5 expects a function Agent 2 doesn't provide, that gap gets reported (by Agent 7, or by whichever agent discovers it) and attributed to the responsible agent — it does not get silently patched around by whichever agent hits the mismatch first.
- **(Phase 2) The planet-agnostic boundary is non-negotiable.** Agent 2's `refine()` and `craft()` must never be modified to accommodate planet data — planet tier's mechanical effect is gathering-only, by deliberate design (see `profitable-phase2-gdd.md` Section 2.6). Any agent whose work seems to require touching these functions must stop and report a design conflict rather than resolve it unilaterally.
- **(Phase 3) The same boundary extends to trading.** Nothing in the trading roster may modify Agent 2's `refine()`/`craft()` or Agent 8's galaxy/planet generation logic to accommodate market data — trading reads/writes its own new data shapes only (see `profitable-phase3-gdd.md` Section 5). No agent implements market manipulation *detection* logic; that's explicitly deferred to whenever multiplayer is in scope.

## Relationship to the GDD

This folder is a breakout of `profitable-mvp-gdd.md` Section 5 (AI Agent Development Plan). The GDD remains the source of truth for the *systems* being built (Section 3: Core Systems Reference) and the *content* being used (Section 3.4: MVP Content) — these agent files reference those sections rather than duplicating all of the underlying design rationale, which lives in `profitable-design-questions.md`.
