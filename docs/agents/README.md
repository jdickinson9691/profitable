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

Phase 2 is complete; these extend the roster for the trading milestone. Full scope: `profitable-phase3-gdd.md`.

12. [`agent-01-amendment-phase3-schema.md`](agent-01-amendment-phase3-schema.md) — **amendment to Agent 1**, not a new agent. Adds `Listing`, `PlanetMarketState`, `Wallet` types and the tunable pricing/fee/expiry constants. Created first in Phase 3.
13. [`agent-11-trading-core.md`](agent-11-trading-core.md) — implements listing creation/purchase, drift/recovery, global price derivation, fee deduction, and self-trade prevention as pure, framework-agnostic TypeScript. Depends on the Phase 3 schema amendment.
14. [`agent-12-phase3-validation-test.md`](agent-12-phase3-validation-test.md) — tests Agent 11 against Phase 3's rules, including a global-price invariant stress test and a regression check against Agents 2/8. Created alongside Agent 11, runs continuously.
15. [`agent-13-trading-presentation.md`](agent-13-trading-presentation.md) — builds the market and trade map Phaser scenes. Depends on Agent 11 and Agent 4.
16. [`agent-14-trading-content.md`](agent-14-trading-content.md) — writes base price and initial planet market preference config data. Depends on the Phase 3 schema amendment only; can run in parallel with 11–13.
17. [`agent-15-phase3-integration.md`](agent-15-phase3-integration.md) — wires the trading loop into the existing gather → refine → craft loop and verifies the extended loop end-to-end. Created last.

## Phase 4: Crew Crafters

Phase 3 is complete; these extend the roster for the crew milestone. Full scope: `profitable-phase4-gdd.md`.

18. [`agent-01-amendment-phase4-schema.md`](agent-01-amendment-phase4-schema.md) — **amendment to Agent 1**, not a new agent. Adds `CrewMember`, `CrewCapacity`, `PlanetCrewPool` types and the tunable wage/capacity/upkeep/refresh constants. Created first in Phase 4.
19. [`agent-16-crew-core.md`](agent-16-crew-core.md) — implements hiring, assignment, background/idle catch-up resolution, upkeep, and attrition as pure, framework-agnostic TypeScript. Depends on the Phase 4 schema amendment and Agent 2's `craft()`.
20. [`agent-17-phase4-validation-test.md`](agent-17-phase4-validation-test.md) — tests Agent 16 against Phase 4's rules, including a simultaneity test and a regression check against Agents 2/8/11. Created alongside Agent 16, runs continuously.
21. [`agent-18-crew-presentation.md`](agent-18-crew-presentation.md) — builds the crew hiring and management Phaser scenes. Depends on Agent 16 and Agent 4.
22. [`agent-19-phase4-integration.md`](agent-19-phase4-integration.md) — wires crew hiring/assignment/background production into the existing extended loop and verifies it end-to-end. Created last.

## Phase 5: Ships & Travel

Phase 4 is complete; these extend the roster for the ships-and-travel milestone. Full scope: `profitable-phase5-gdd.md`.

23. [`agent-01-amendment-phase5-schema.md`](agent-01-amendment-phase5-schema.md) — **amendment to Agent 1**, not a new agent. Adds `ComponentCategory`, `ShipComponent`, `Ship`, `ShipyardPool`, `Voyage` types and the tunable distance/speed/pool constants. Created first in Phase 5.
24. [`agent-20-ships-travel-core.md`](agent-20-ships-travel-core.md) — implements ship tier derivation, shipyard pool/purchase, travel-time calculation, and voyage initiation/resolution as pure, framework-agnostic TypeScript. Depends on the Phase 5 schema amendment and Agent 2's `craft()`/`getTierColor()`.
25. [`agent-21-phase5-validation-test.md`](agent-21-phase5-validation-test.md) — tests Agent 20 against Phase 5's rules, including a hand-calculated travel-time check and a regression check against Agents 2/8/11/16. Created alongside Agent 20, runs continuously.
26. [`agent-22-ships-travel-presentation.md`](agent-22-ships-travel-presentation.md) — builds the shipyard, ship assembly, and map travel-layer Phaser scenes (extending Agent 13's existing map, not a new one). Depends on Agent 20 and Agent 4.
27. [`agent-23-ships-travel-content.md`](agent-23-ships-travel-content.md) — writes example component recipes (one per category). Depends on the Phase 5 schema amendment only; can run in parallel with 20–22.
28. [`agent-24-phase5-integration.md`](agent-24-phase5-integration.md) — wires component crafting through ship assembly, purchase, travel, and voyage resolution into the existing extended loop, and confirms Phase 3's deferred remote-sale travel mechanic now works for real. Created last.

## Cross-Cutting Rules (apply to every agent, not just one)

These rules aren't restated in full in every file, but every agent above is bound by them:

- **No agent hardcodes a number that already exists in Agent 1's output.** If a value needs to change, it changes in exactly one place — Agent 1's constant tables.
- **No agent reaches "downward" past its declared inputs.** For example, the Presentation Agent (5) may call Simulation Core's (2) public functions, but must never read Simulation Core's internal/private helpers, and must never import the Content Agent's (6) raw JSON directly — it goes through Simulation Core's loading path instead.
- **Every agent's output must be independently reviewable against its own Definition of Done**, without requiring a reviewer to understand any other agent's internals. This is what makes each contract a real contract rather than a loose task description — a human or an orchestrating agent should be able to check any single agent's work in isolation.
- **Mismatches between agents are integration bugs, not license to freelance.** If Agent 5 expects a function Agent 2 doesn't provide, that gap gets reported (by Agent 7, or by whichever agent discovers it) and attributed to the responsible agent — it does not get silently patched around by whichever agent hits the mismatch first.
- **(Phase 2) The planet-agnostic boundary is non-negotiable.** Agent 2's `refine()` and `craft()` must never be modified to accommodate planet data — planet tier's mechanical effect is gathering-only, by deliberate design (see `profitable-phase2-gdd.md` Section 2.6). Any agent whose work seems to require touching these functions must stop and report a design conflict rather than resolve it unilaterally.
- **(Phase 3) The same boundary extends to Trading.** Nothing in Phase 3 may modify Agent 2's `refine()`/`craft()` or Agent 8's galaxy/planet generation logic to accommodate market data. Trading reads from and writes to its own new data shapes, never reaching into the simulation core's internals. No agent implements market manipulation *detection* logic — explicitly deferred to whenever multiplayer is built (see `profitable-phase3-gdd.md` Section 2.11).
- **(Phase 4) The same boundary extends to Crew.** Nothing in Phase 4 may modify Agent 2's `refine()`/`craft()` internals, Agent 8's generation logic, or Agent 11's trading logic to accommodate crew data — Crew Core *calls* `craft()` multiple times simultaneously but never alters what it does. No agent implements combat, travel-hazard, poaching, or any random/permadeath crew-loss mechanic — explicitly deferred to a future travel/danger milestone that doesn't exist yet (see `profitable-phase4-gdd.md` Section 2.7).
- **(Phase 5) The same boundary extends to Ships & Travel.** Nothing in Phase 5 may modify Agent 2's `refine()`/`craft()`, Agent 8's generation logic, Agent 11's trading logic, or Agent 16's crew logic to accommodate ship/travel data. No agent implements encounters, combat, or any travel-hazard mechanic — explicitly deferred (see `profitable-phase5-gdd.md` Section 2.9). The Phase 3 remote tier 6-7 sale mechanic must resolve through a real `Voyage`, not a stub — Agent 24's integration report must confirm this connection actually works.

## Relationship to the GDD

This folder is a breakout of `profitable-mvp-gdd.md` Section 5 (AI Agent Development Plan). The GDD remains the source of truth for the *systems* being built (Section 3: Core Systems Reference) and the *content* being used (Section 3.4: MVP Content) — these agent files reference those sections rather than duplicating all of the underlying design rationale, which lives in `profitable-design-questions.md`.
