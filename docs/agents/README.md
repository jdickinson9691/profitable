# Profitable MVP — AI Agent Contracts

This folder breaks out each AI agent from the MVP Game Design Document (Section 5) into its own standalone contract file. Each file is self-contained: responsibility, inputs, outputs, explicit "must not do" boundaries, testing requirements, and a definition of done.

**This folder is the chronological build record — it stays as written, nothing here is rewritten or renumbered.** For a given system's *current* contract (what it does today, not what it looked like when first built), check `docs/functional-agents/` first — a newer, feature-organized companion that's kept in sync with the real code as it changes. Not every system has a file there yet (crew, notably, doesn't); fall back to this folder when it doesn't.

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

## Galactic Map

Phase 5 is complete. Unlike every prior phase, this milestone's design questions all resolved to "the existing system already does this" — so this is a **verification phase, not a construction phase**. No schema amendment, no Core/Presentation/Content agents. Full scope: `profitable-map-gdd.md`.

29. [`agent-25-map-verification.md`](agent-25-map-verification.md) — audits the existing Phase 3 (trade layer) and Phase 5 (travel layer) implementation against four decided properties (no advance emergency warning, no map staleness, no scanner mechanic, existing map sufficient at current scale). Produces evidence, not new production code.
30. [`agent-26-map-confirmation.md`](agent-26-map-confirmation.md) — produces the final milestone report, confirms none of the four deferred future ideas were implemented, and routes any gap found to the correct upstream agent as a bug report. Created last.

## Travel Encounters (Non-Combat)

The first of four deliberately-deferred gaps being picked up now that the original development order is fully built (sequencing: Scanner → **Encounters** → Combat → Multiplayer). Unlike prior phases, this is implemented entirely as **amendments to existing agents** (1, 20, 21, 22) plus one small confirmation agent — no new Core/Presentation/Content agents, since the feature plugs directly into `resolveArrival()`. Full scope: `profitable-travel-encounters-gdd.md`.

31. [`agent-01-amendment-travel-encounters-schema.md`](agent-01-amendment-travel-encounters-schema.md) — **amendment to Agent 1**. Adds `EncounterType`, `EncounterResult`, extends `Voyage` with an `encounters` field, and the six tunable constants. Created first.
32. [`agent-20-amendment-travel-encounters-core.md`](agent-20-amendment-travel-encounters-core.md) — **amendment to Agent 20**. Adds `resolveEncounters()`, called from within the existing `resolveArrival()` as an additive step — arrival timing, cargo, and ship delivery are unchanged.
33. [`agent-21-amendment-travel-encounters-test.md`](agent-21-amendment-travel-encounters-test.md) — **amendment to Agent 21**. Tests trigger mechanics, type split, all three outcome types, and — critically — a negative test proving discovery encounters never set `discovered: true`, plus a regression check on `resolveArrival()`'s existing behavior. Created alongside the Agent 20 amendment.
34. [`agent-22-amendment-travel-encounters-presentation.md`](agent-22-amendment-travel-encounters-presentation.md) — **amendment to Agent 22**. Adds encounter result display to the existing voyage-arrival screen — no new scene.
35. [`agent-27-travel-encounters-confirmation.md`](agent-27-travel-encounters-confirmation.md) — confirms the Definition of Done and explicitly confirms no combat, no interactive resolution, and no reopened "no scanner"/"arrival time locked" decisions anywhere in the amendments. Created last.

## Scanner/Probe

The second of four deliberately-deferred gaps — picked up after Travel Encounters, since it was the item originally skipped. Same amendment pattern: no new Core/Presentation/Content agents, since the feature plugs into Agent 20's existing market-pool and distance-math infrastructure. Full scope: `profitable-scanner-gdd.md`.

36. [`agent-01-amendment-scanner-schema.md`](agent-01-amendment-scanner-schema.md) — **amendment to Agent 1**. Adds `Scanner`, `ScannerPool` types and four tunable constants. Created first.
37. [`agent-20-amendment-scanner-core.md`](agent-20-amendment-scanner-core.md) — **amendment to Agent 20**. Adds `refreshScannerPool()`, `purchaseScanner()`, `performScan()` — mirrors the existing shipyard pattern and reuses `calculateTravelTime()`'s distance math. `performScan()` may only ever modify a planet's `discovered` field.
38. [`agent-21-amendment-scanner-test.md`](agent-21-amendment-scanner-test.md) — **amendment to Agent 21**. Tests scan radius/boundary correctness, highest-tier-only stacking, and four guardrail tests: no `Planet` field other than `discovered` is ever touched, `deriveShipTier()` is unaffected, no automatic discovery exists, and no code path references Travel Encounters. Created alongside the Agent 20 amendment.
39. [`agent-22-amendment-scanner-presentation.md`](agent-22-amendment-scanner-presentation.md) — **amendment to Agent 22**. Adds a scanner market listing and a docked "Scan" action to the existing shipyard-adjacent screen — no new scene.
40. [`agent-28-scanner-confirmation.md`](agent-28-scanner-confirmation.md) — confirms the Definition of Done and all eight guardrails (no fifth component, ship tier unaffected, no passive discovery, no staleness/Encounters interaction, no stray `Planet` field mutation, core agents unmodified). Created last.

## Combat

The third of four deliberately-deferred gaps, and the largest amendment in this project so far — it introduces the first genuinely interactive, deferred-resolution mechanic (pending combat encounters awaiting a player's attack/flee choice), a real architectural break from every prior encounter type's fully-synchronous resolution. Still implemented as amendments (1, 20, 21, 22) plus a confirmation agent — no new Core/Presentation/Content agents. Full scope: `profitable-combat-gdd.md`.

41. [`agent-01-amendment-combat-schema.md`](agent-01-amendment-combat-schema.md) — **amendment to Agent 1**. Extends `EncounterType` to include `combat`, adds `CombatEncounter`, extends `Voyage` (`isRetreat`) and `CrewMember` (`unavailableUntil`). Created first.
42. [`agent-20-amendment-combat-core.md`](agent-20-amendment-combat-core.md) — **amendment to Agent 20**. Adds combat detection at both trigger points (travel window, planet arrival), the pending→resolved deferred resolution flow via `resolveCombatChoice()`, and the component-durability/crew-unavailability mutations. Must not alter `resolveArrival()`'s existing synchronous behavior for the other three encounter types.
43. [`agent-21-amendment-combat-test.md`](agent-21-amendment-combat-test.md) — **amendment to Agent 21**. Tests detection, the pending/resolved state transition, all three outcomes, and — most critically — a regression check proving the other three encounter types' synchronous behavior is completely unaffected, including in mixed scenarios. Created alongside the Agent 20 amendment.
44. [`agent-22-amendment-combat-presentation.md`](agent-22-amendment-combat-presentation.md) — **amendment to Agent 22**. Adds the attack/flee prompt — the first interactive UI in the encounter system — and outcome display.
45. [`agent-29-combat-confirmation.md`](agent-29-combat-confirmation.md) — confirms the Definition of Done and all nine guardrails, with particular scrutiny on the regression check given this amendment's size and novelty. Created last.

## Alpha Content Authoring

Combat is complete; Multiplayer's design is resolved but deliberately deferred (see `profitable-design-questions.md`). The project pivoted to Alpha — `docs/product-alpha.md`'s Section 1 (Content Authoring), detailed in `docs/profitable-alpha-content-roster.md`. Unlike every milestone above, this one's amendment docs were written **retroactively**: the content and code were implemented first (commit `2fae2d5`), and a validation pass afterward found that three of the changes crossed into other agents' domains without a preceding contract doc — a real process deviation from this project's own established discipline. See `agent-30-alpha-content-confirmation.md` for the full account.

46. [`agent-01-amendment-alpha-content-schema.md`](agent-01-amendment-alpha-content-schema.md) — **amendment to Agent 1** (written retroactively). Adds `TIER_6_7_PROFESSIONS`, closing `profession.ts`'s previously-open taxonomy question.
47. [`agent-16-amendment-alpha-content-core.md`](agent-16-amendment-alpha-content-core.md) — **amendment to Agent 16** (written retroactively). `refreshCrewPool()` rolls a real profession from `TIER_6_7_PROFESSIONS` instead of a placeholder.
48. [`agent-22-amendment-alpha-content-presentation.md`](agent-22-amendment-alpha-content-presentation.md) — **amendment to Agent 22** (written retroactively). `ShipAssemblyScene` lists every recipe per component category (4, per the roster) instead of only the first.
49. [`agent-30-alpha-content-confirmation.md`](agent-30-alpha-content-confirmation.md) — validates commit `2fae2d5` against the roster (content fidelity: exact, no drift) and against this project's process rules (one real deviation found — code changes without preceding contract docs — named, attributed, and remediated via the three amendments above).

The content-only parts of this milestone (60 resources, 39 recipes, 24 schematics, updated trading/market-preference data) are Agent 6/14/23's continued content-authoring role and don't need their own new numbered agent — see `content/README.md`'s "Alpha" section for that detail.

## Unity Migration Phase 1 — complete

Running in parallel with the Alpha checklist (`docs/product-alpha.md`), not sequentially after it — see `CLAUDE.md` Section 6 for how the two tracks relate. Full scope: `docs/profitable-unity-migration-gdd.md`. Ports the MVP core loop to C#/Unity; the existing web/Electron build is not modified by this work.

**Numbering note:** originally drafted as Agents 30-35 on the assumption that Agent 29 (Combat Confirmation) was the last number used. That was stale — Agent 30 was already Alpha Content Authoring's confirmation agent (immediately below). Renumbered 31-36.

50. [`agent-31-unity-data-schema.md`](agent-31-unity-data-schema.md) — ports Agent 1's MVP-scope base types and constant tables to C#, plus a `ContentLoader` consuming the existing JSON content files as-is. No Unity Editor dependency — builds and tests via `dotnet build`/`dotnet test` alone. Created first.
51. [`agent-32-unity-simulation-core.md`](agent-32-unity-simulation-core.md) — ports `rollQuality`, `getTierColor`, `refine`, `craft` to C#, exactly, including the already-fixed integer-boundary-vs-fractional-input logic (`loadContent` excluded — Agent 31's own `ContentLoader` already covers it). Depends on Agent 31.
52. [`agent-33-unity-parity-validation.md`](agent-33-unity-parity-validation.md) — proves the C# port numerically agrees with the existing TypeScript implementation for the same inputs. Created alongside Agent 32, runs continuously.
53. [`agent-34-unity-infrastructure-adapters.md`](agent-34-unity-infrastructure-adapters.md) — ports `SaveSystem`/`AudioManager` interfaces to Unity-specific implementations. Independent of 32/33.
54. [`agent-35-unity-mvp-presentation.md`](agent-35-unity-mvp-presentation.md) — builds minimal Unity scenes for gather/refine/craft, calling Agent 32's ported functions only. Depends on Agent 32 and Agent 34.
55. [`agent-36-unity-migration-phase1-integration.md`](agent-36-unity-migration-phase1-integration.md) — wires everything together and verifies the full gather→refine→craft loop in Unity, confirming Agent 33's parity proof holds end-to-end. Created last.

## Unity Migration Phase 2 — Sub-Phase A (Galaxy, Planet, Mining) complete

Full scope/readiness computation: `docs/functional-agents/build.md`; the followable task list: `docs/unity-migration-phase2-checklist.md`. All six roles are done.

38. [`agent-38-unity-galaxy-planet-schema.md`](agent-38-unity-galaxy-planet-schema.md) — extends Agent 31's `Planet` with the Phase 2+ fields (`PlanetType`, `Tier`, `Position`, etc.) and the galaxy/planet-generation constant tables. Depends on Agent 31. Created first in Sub-Phase A.
39. [`agent-39-unity-galaxy-planet-simulation-core.md`](agent-39-unity-galaxy-planet-simulation-core.md) — ports `SeededRandom`, `GalaxyGenerator`, `PlanetGenerator`, `ResourceSubsetSelector`, `PlanetQualityRoller`, `PlanetResourceCycle` to C#, exactly. Depends on Agent 38.
40. [`agent-40-unity-galaxy-planet-parity-validation.md`](agent-40-unity-galaxy-planet-parity-validation.md) — proves the C# port agrees with the real TypeScript output end-to-end (real 60-resource content catalog, not synthetic fixtures), including real 50-planet-scale galaxy generation. Created alongside Agent 39, runs continuously.
41. [`agent-41-unity-galaxy-planet-presentation.md`](agent-41-unity-galaxy-planet-presentation.md) — rewrites `MapPanel`/`GatherPanel` against a real generated galaxy (`GalaxyState.cs`), replacing Phase 1's static Delta Rigelus content; quality is now read once per visit instead of rolled per click. Depends on Agent 39/40.
42. [`agent-42-unity-galaxy-planet-mining-integration.md`](agent-42-unity-galaxy-planet-mining-integration.md) — confirms the real galaxy drives the existing gather→refine→craft loop end-to-end, reusing Agent 36's own click-through test unmodified. Created last in Sub-Phase A.

## Unity Migration Phase 2 — Sub-Phase B (Trading) complete

43. [`agent-43-unity-trading-schema.md`](agent-43-unity-trading-schema.md) — ports `Listing`/`PlanetMarketState`/`Wallet`/`MarketLocation`/`PurchaseResult`/`ItemBasePrice`/`PlanetMarketPreference` and `TradingConfig` (the first sub-phase needing mutable debug-tunable constants). Depends on Agent 38. Created first in Sub-Phase B.
44. [`agent-44-unity-trading-simulation-core.md`](agent-44-unity-trading-simulation-core.md) — ports `createListing`/`purchaseListing`/`drift`/`season`/`emergency`/`expireListings`/`globalPrice`/`sellToMarket`/`sellToGlobalMarket`/`loadTradingContent` to C#, exactly. Depends on Agent 43.
45. [`agent-45-unity-trading-parity-validation.md`](agent-45-unity-trading-parity-validation.md) — proves the C# port agrees with the real TypeScript output end-to-end across all 10 functions, including a search-found (not hand-picked) triggered-emergency case. Created alongside Agent 44, runs continuously.
46. [`agent-46-unity-trading-presentation.md`](agent-46-unity-trading-presentation.md) — adds a Market panel (fifth panel in the MVP loop) scoped to the Trading Counterparty instant-sell functions only. Depends on Agent 44/45.
47. [`agent-47-unity-trading-integration.md`](agent-47-unity-trading-integration.md) — confirms the Market panel drives real gather→refine→craft→sell end-to-end and Sub-Phase A's own tests still pass unmodified (regression proof). Created last in Sub-Phase B.

## Unity Migration Phase 2 — Sub-Phase C (Crew) complete

48. [`agent-48-unity-crew-schema.md`](agent-48-unity-crew-schema.md) — ports `CrewMember`/`CrewCandidate`/`PlanetCrewPool`/`CrewCapacity`/`CraftAction` and every crew result union, plus `CrewConfig` and the early-scoped `ShipCrewRole` enum. Depends on Agent 38. Created first in Sub-Phase C.
49. [`agent-49-unity-crew-simulation-core.md`](agent-49-unity-crew-simulation-core.md) — ports all 8 `src/crew/*.ts` functions; found and resolved a live-default-parameter-semantics gap in `resolveBackgroundCrafting`'s port via a two-overload split. Depends on Agent 48.
50. [`agent-50-unity-crew-parity-validation.md`](agent-50-unity-crew-parity-validation.md) — proves the C# port agrees with the real TypeScript output across all 8 functions, including the omitted-vs-explicit-null `backgroundRate` distinction. Created alongside Agent 49, runs continuously.
51. [`agent-51-unity-crew-presentation.md`](agent-51-unity-crew-presentation.md) — adds a Crew panel (sixth panel in the MVP loop); introduces `UiFactory.ClearChildren`, this migration's first dynamic-rebuild UI. Depends on Agent 49/50.
52. [`agent-52-unity-crew-integration.md`](agent-52-unity-crew-integration.md) — confirms assign-to-craft genuinely drives `Crafter.Craft` from the crew member's own tier, and Sub-Phases A/B's own tests still pass unmodified. Created last in Sub-Phase C.

## Unity Migration Phase 2 — Sub-Phase D (Ships & Travel, incl. Scanner) complete

53. [`agent-53-unity-ships-travel-schema.md`](agent-53-unity-ships-travel-schema.md) — ports `Ship`/`ShipComponentSlots`/`Voyage`/`Scanner`/`ShipyardPool`/`ScannerPool` and every result union, `ShipsAndTravelConfig` (~30 tunables), and Encounter/Combat schema ported early (needed by this sub-phase's own `resolveEncounters`/`resolveCombatChoice`/`initiateCombat`). Depends on Agent 38/48. Created first in Sub-Phase D.
54. [`agent-54-unity-ships-travel-simulation-core.md`](agent-54-unity-ships-travel-simulation-core.md) — ports all 21 `src/ships/*.ts` functions; found and fixed a real `Voyage.ArrivesAt` precision-truncation bug via a failing parity test. Depends on Agent 53.
55. [`agent-55-unity-ships-travel-parity-validation.md`](agent-55-unity-ships-travel-parity-validation.md) — proves the C# port agrees with the real TypeScript output across all 21 functions using a real generated galaxy's actual planet positions; found and fixed two real serialization gaps via failing tests. Created alongside Agent 54, runs continuously.
56. [`agent-56-unity-ships-travel-presentation.md`](agent-56-unity-ships-travel-presentation.md) — adds a Ships panel (seventh panel in the MVP loop) scoped to purchase→refuel→check-repair→travel→resolve-arrival only. Depends on Agent 54/55.
57. [`agent-57-unity-ships-travel-integration.md`](agent-57-unity-ships-travel-integration.md) — confirms a real voyage can be initiated/resolved/repaired in the Unity build, and Sub-Phases A/B/C's own tests still pass unmodified. Created last in Sub-Phase D.

## Unity Migration Phase 2 — Sub-Phase E (Planet Ownership) complete

58. [`agent-58-unity-planet-ownership-schema.md`](agent-58-unity-planet-ownership-schema.md) — ports `PlanetOwnershipEntry` and every ownership result union; extends `CitadelLevelBenefits` with construction-cost fields. Depends on Agent 38/53. Created first in Sub-Phase E.
59. [`agent-59-unity-planet-ownership-simulation-core.md`](agent-59-unity-planet-ownership-simulation-core.md) — ports `transportColonists.ts`/`claimPlanet.ts`/`buildCitadel.ts`/`mergePlanetOwnership.ts`, reusing Sub-Phase D's own `CitadelLevelBenefits` lookup directly. Depends on Agent 58.
60. [`agent-60-unity-planet-ownership-parity-validation.md`](agent-60-unity-planet-ownership-parity-validation.md) — proves the C# port agrees with the real TypeScript output across all 4 functions, including the real `iron-ingot` Citadel material. Created alongside Agent 59, runs continuously.
61. [`agent-61-unity-planet-ownership-presentation.md`](agent-61-unity-planet-ownership-presentation.md) — adds ownership actions to `GatherPanel`; introduces `PlanetOwnershipState.cs`, this migration's first REAL `ISaveSystem`-backed persistence in Presentation. Depends on Agent 59/60.
62. [`agent-62-unity-planet-ownership-integration.md`](agent-62-unity-planet-ownership-integration.md) — confirms persistence survives a reload; found and fixed a real gap in Sub-Phase D's `ShipsPanel` (Citadel context never wired through to refuel/repair). Created last in Sub-Phase E.

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
- **(Galactic Map) No agent may implement any of the four deferred future ideas** (emergency advance warning, map data staleness, a scanner/probe mechanic, a new galaxy-wide/zoom-out view) under any framing, including "just a small version while I'm in here." This milestone's job is to verify the existing map already works as designed, not to add features to it (see `profitable-map-gdd.md` Section 2.5). A discrepancy found during verification is a bug against the agent that built the affected system, not new scope for the verification agents to fix directly.
- **(Travel Encounters) `resolveArrival()`'s existing Phase 5 contract is not renegotiable.** Arrival time stays locked at voyage initiation; encounters are resolved as an additive step within arrival processing, never retroactively changing when or whether a voyage arrives. No agent implements a combat-type encounter, interactive/choice-based resolution, or ship-component/cargo mutation as an outcome. No discovery encounter ever sets `discovered: true` remotely, under any framing — this would silently reopen the closed "no scanner" decision (see `profitable-travel-encounters-gdd.md` Section 5).
- **(Scanner/Probe) No fifth ship component, and `deriveShipTier()` stays unaffected.** `Scanner`/`ScannerPool` are structurally separate from `ShipComponent`/`ComponentCategory` — no agent may add scanner data to that averaging or fold it into an existing component. `performScan()` may only ever modify a planet's `discovered` field, never anything else. No agent implements passive/automatic discovery based on continuous position, or any interaction between a scanner and map staleness or Travel Encounters' discovery type — both were explicitly confirmed to have zero interaction (see `profitable-scanner-gdd.md` Section 5). This same "no fifth component" boundary was cited again, by name, when the later (design-only, not yet built) Ship Crew Roles decision chose to scale crew slots by ship tier rather than add a "crew quarters" component — see `profitable-design-questions.md`'s Ship Crew Roles section and `docs/functional-agents/ship.md`.
- **(Combat) `resolveArrival()`'s synchronous behavior for the three non-combat encounter types is not renegotiable.** Combat's pending→resolved deferred-resolution mechanism is additive — it must never make trade-opportunity, discovery, or hazard resolution block, pause, or change behavior in any way. No agent implements multi-round/real-time combat, permanent loss (destruction or removal), auto-resolution without an explicit player choice, or any interaction with Scanner or map staleness. Cargo is never forfeited in any Combat outcome. Opponent threat is rolled exactly once, at detection — never re-rolled at resolution (see `profitable-combat-gdd.md` Section 5).
- **(Alpha Content Authoring) A Content Agent contract doc's "must not write any TypeScript/JavaScript logic" line is real, not boilerplate.** When content authoring surfaces a genuine code gap in another agent's domain (as it did here: a closed-but-unwired profession taxonomy in Agent 16, an unreachable-by-UI recipe set in Agent 22), the fix still requires that other agent's own amendment contract, written *before* the change — the same "contract first" discipline every deferred-gap milestone above followed. This milestone violated that once (implementation preceded its own contract docs) and remediated it retroactively rather than repeating the shortcut — see `agent-30-alpha-content-confirmation.md`. Future work must not treat that remediation as precedent for skipping the contract-first step again.

## Relationship to the GDD

This folder is a breakout of `profitable-mvp-gdd.md` Section 5 (AI Agent Development Plan). The GDD remains the source of truth for the *systems* being built (Section 3: Core Systems Reference) and the *content* being used (Section 3.4: MVP Content) — these agent files reference those sections rather than duplicating all of the underlying design rationale, which lives in `profitable-design-questions.md`.
