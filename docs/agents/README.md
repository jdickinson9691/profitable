# Agent Contracts — Index

The MVP is built by 7 specialized agents, each with a narrow responsibility
and an explicit **contract**: what it reads, what it must produce, what it
must never do, and its definition of done. Contracts exist so agents can
work independently without stepping on each other's output, and so a human
(or an orchestrating agent) can verify each agent's work against a fixed
spec rather than free-form review. Full rationale lives in
`docs/profitable-design-questions.md`; the build plan/formulas live in
`docs/profitable-mvp-gdd.md`.

## Creation order

Each agent depends on artifacts from the one(s) before it — this order is
not arbitrary, it mirrors the dependency chain of the architecture itself.

1. **Data Schema Agent** (`agent-01-data-schema.md`) — types, JSON schemas,
   all constant tables from GDD Section 3. Everything else depends on this.
   Produces shapes/constants only, no logic.
2. **Simulation Core Agent** (`agent-02-simulation-core.md`) —
   `rollQuality`, `getTierColor`, `refine`, `craft` as pure,
   framework-agnostic functions. Zero Phaser/DOM/browser API.
3. **Validation/Test Agent** (`agent-03-validation-test.md`) — created
   alongside #2, runs continuously. Tests Agent 2's output against GDD
   Section 3's documented tables exactly. Reports discrepancies; never
   patches Agent 2 itself.
4. **Infrastructure/Adapter Agent** (`agent-04-infrastructure-adapter.md`)
   — `SaveSystem`, `AudioManager`, stub `NetworkAdapter`. Independent of
   Agents 2/3's internals; must exist before Agent 5.
5. **Presentation Agent** (`agent-05-presentation.md`) — Phaser/PixiJS
   scenes (map, gather, refine, craft). Depends on Agents 2 and 4. Never
   duplicates formula logic; never touches browser APIs directly; no DOM UI.
6. **Content Agent** (`agent-06-content.md`) — writes the actual MVP config
   data (GDD Section 4's resources/planet/recipes) as JSON validated
   against Agent 1's schemas. Data-only, no code.
7. **Integration Agent** (`agent-07-integration.md`) — created last. Wires
   everything together, verifies the full MVP loop, and attributes any gap
   to the specific upstream agent whose contract wasn't met. Does not
   introduce new logic or content to patch around problems.

## Cross-cutting rules (bind every agent)

- **No agent hardcodes a number that already exists in Agent 1's output.**
  Change it in exactly one place.
- **No agent reaches "downward" past its declared inputs** (e.g.,
  Presentation may call Simulation Core's public functions, but never its
  internals, and never Content's raw JSON directly).
- **Every agent's output must be independently reviewable against its own
  Definition of Done**, without needing to understand any other agent's
  internals.
- **Mismatches between agents are integration bugs, not license to
  freelance** — report and attribute, don't silently patch around.
