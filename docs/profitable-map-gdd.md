# Profitable — Galactic Map Game Design Document

Status: design locked (see `profitable-design-questions.md`, "Galactic Map" section — fully resolved). This document defines what this milestone actually requires — which, unlike every prior phase, is verification rather than new construction. It extends `profitable-mvp-gdd.md`, `profitable-phase2-gdd.md`, `profitable-phase3-gdd.md`, `profitable-phase4-gdd.md`, and `profitable-phase5-gdd.md`.

---

## 1. Scope — Read This Before Assuming New Work Is Needed

Every design decision made for this milestone resolved to **"the existing system, built across Phase 3 (trade layer) and Phase 5 (travel layer), already satisfies this — build nothing new."** Specifically:

- **No advance warning for emergencies** — the emergency's already-existing duration is the reaction window.
- **No staleness for discovered-planet map data** — live queries already, same pattern as `getGlobalPrice()`.
- **No scanner/probe mechanic** — discovery already works via physical visitation; no gap exists.
- **No new galaxy-wide/zoom-out view** — the existing per-planet map, extended twice, is sufficient at the current scale.

This means the Galactic Map milestone is a **verification and confirmation pass**, not a build phase. No new data shapes, no new core logic, no new presentation screens. The risk this phase actually manages is **scope creep** — the temptation to build the four recorded-but-deferred future ideas (advance warning, staleness, scanner, zoom levels) just because "the map phase" sounds like it should produce new map features. It should not, per the design decisions above.

**Definition of done for this milestone:** confirmation, with evidence, that the existing map (Agent 13's trade layer + Agent 22's travel layer) already correctly exhibits all four properties above, and that none of the four deferred future ideas were accidentally implemented. If gaps are found (e.g., emergency effects turn out to have some accidental pre-warning delay, or planet data is being cached somewhere), those are **bugs in the existing Phase 3/5 implementation to report and fix**, not new Phase 6 features to design.

## 2. What's Already Decided (from `profitable-design-questions.md`)

Full rationale lives in the design doc; this is the implementation-ready summary.

### 2.1 No Advance Warning for Emergencies
An emergency's effects apply immediately, with its existing duration serving as the entire reaction window. No separate pre-emergency countdown exists or should be added.

### 2.2 No Staleness — Map Data Is Always Live
For any discovered planet, the map must read current, live `PlanetMarketState`/season/emergency data at display time — never a cached or "last known" snapshot.

### 2.3 No Scanner/Probe Mechanic
Discovery remains exactly as built in Phase 2/3: a planet becomes `discovered: true` only through physical visitation. No alternate discovery-range-extension mechanic exists.

### 2.4 No New Galaxy-Wide View
The existing per-planet map screen (trade layer + travel layer, same screen) is the complete map experience. No separate zoomed-out galaxy view, region grouping, or clustering UI is part of this milestone.

### 2.5 Recorded Future Ideas — Explicitly Not Built Here
For reference only, not to be implemented in this phase: a scanner/probe upgrade extending discovery range; visual clustering/zoom levels if galaxy size ever makes the flat map unwieldy. Both remain valid ideas for a future milestone if a real need emerges — neither has one yet.

## 3. Data Shapes

**None.** No new types, no schema amendment. Every field this milestone needs (`discovered`, `position`, `PlanetMarketState`, season/emergency data) already exists from Phase 2, Phase 3, and Phase 5.

## 4. Verification Plan

Given the scope, this milestone needs two lightweight agents rather than the five-to-seven-piece roster every prior phase required — there is no Core, Presentation, or Content agent to build, because there is no new logic, no new screen, and no new content.

### 4.1 Roster & Creation Order

**Agent 25: Map Verification.** Audits the existing Phase 3 and Phase 5 implementation against Sections 2.1–2.4 above. Produces evidence (test results, code inspection notes) for each of the four properties — not new tests bolted onto Agent 12/21's suites, but a targeted audit confirming those suites already cover this, or flagging a gap if they don't.

**Agent 26: Map Confirmation.** Created after Agent 25. Produces the final milestone report: confirms Section 1's Definition of Done is met, explicitly confirms none of the four deferred future ideas were implemented, and — if Agent 25 found any genuine gap — routes it as a bug report against the relevant prior-phase agent (most likely Agent 13 or Agent 20/22) rather than treating it as new Phase 6 scope.

### 4.2 Agent Contracts

Full individual contracts live in `docs/agents/agent-25-map-verification.md` and `docs/agents/agent-26-map-confirmation.md`.

## 5. Cross-Cutting Rules

Same as every prior phase (see `docs/agents/README.md`), plus one specific to this milestone's shape:

- **No agent may implement any of the four deferred future ideas** (emergency advance warning, map data staleness, a scanner/probe mechanic, or a new galaxy-wide view) under any framing — including "just a small version" or "while I'm in here anyway." Section 2.5 is explicit that these are recorded ideas for a possible future milestone, not part of this one's scope. If a genuine, current need for one of them surfaces during verification, that's a design conversation to have explicitly, not something to build quietly inside a verification task.
- **A discrepancy found during verification is a bug against the agent that built the affected system**, not new scope for Agent 25 or 26 to fix directly — same "report, don't patch around it" discipline every prior phase's integration agent has followed.

## 6. Agent 25 Verification Report

Evidence: `tests/integration/mapVerification.test.ts` (automated, regression-guarded) plus a live playtest via `npm run dev` + `window.__game` (see `src/presentation/README.md`'s Galactic Map section for the full transcript). Two of the four properties hold cleanly; two surface genuine, previously-unreported gaps in the Phase 3/5 implementation — reported here per this agent's own contract, not patched.

### 2.1 — No advance warning for emergencies: **GAP, not a clean pass**

There is no advance-warning delay to find, because there is no "emergency" mechanic to have one in. Grepping all of `src/` (comments excluded) for `season`/`emergenc(y|ies)` returns zero matches. Only **baseline drift** (`src/trading/drift.ts`) was ever actually built; **seasons** and **emergencies** — two of the three layers the Phase 3 GDD's own Definition of Done names ("the trade map correctly displaying... based on baseline drift + season + emergency layers") — do not exist anywhere in code. Confirmed structurally: the Phase 3 GDD's own Section 3 data-shape listing specifies `PlanetMarketState { ...season: ... }`, but the real `PlanetMarketState` type (`src/data/types/planetMarketState.ts`) has exactly four fields (`planetId`, `itemId`, `currentPrice`, `basePrice`) — no `season` field was ever added, and `src/data/constants/tradingConfig.ts` has no season/emergency-related constant of any kind.

**"No advance warning" is technically true only in the vacuous sense.** The design decision itself ("the emergency's already-decided duration is the reaction window") presupposes an emergency mechanic that was never built to check against.

**Attributed to:** Agent 1 (Phase 3 schema amendment — `PlanetMarketState.season` specified in the GDD, never added to the actual type), Agent 11 (Trading Core — season/emergency logic never implemented, only baseline drift), and Agent 12/Agent 15 (Phase 3 Validation/Integration — neither's own Definition-of-Done confirmation caught that the GDD's three-layer language was only one-third met).

### 2.2 — No staleness, map data always live: **Confirmed, clean pass**

`getGlobalPrice()` (`src/trading/globalPrice.ts`) is a pure function with zero module-level state, taking a live `PlanetMarketState[]` argument directly — confirmed by source inspection and by a new regression test (`tests/integration/mapVerification.test.ts`) proving two calls with different market-state inputs return different, non-memoized results. `PlanetMarketState` itself carries no timestamp or staleness field for any caller to gate display on. `TradeMapScene`/`GlobalMarketScene` both call `getMarketStates()`/`getGlobalPrice()` fresh inside `redraw()`/`create()`, never caching a computed price in scene state. The one cache that does exist in this area (`tradingState.ts`'s `cachedTradingContent`) holds only static, load-once content (base prices, planet-type preferences) — not live price/season/emergency data — so it's correctly out of scope for this property, not a hidden violation of it.

### 2.3 — No scanner/probe mechanic: **Confirmed on the narrow claim; surfaces an adjacent, already-documented gap**

Zero matches for `scanner`/`probe` anywhere in `src/` (regression-guarded). No alternate discovery-range or remote-discovery code path exists.

However, verifying *why* that's true surfaced something worth stating precisely: the map GDD's premise that "discovery already has a complete, working mechanism (a planet becomes `discovered: true` when physically visited)" is not literally true against the current implementation. `discovered: true` is written in exactly one file, `src/presentation/galaxyState.ts`, as two **hardcoded bootstrap overrides** (`startingPlanet`, `secondaryDiscoveredPlanet`) — confirmed via regression test that no other file, including `src/ships/resolveArrival.ts`, ever transitions a planet to discovered. Live-confirmed against a real generated galaxy: 5 planets total, **zero** of which carry `discovered: true` in the raw generated array; only the two override copies ever render as discovered on the map. Arriving at a planet via a real `Voyage` updates `Ship.currentPlanetId` but never touches `Planet.discovered` anywhere in the codebase — so a player can never actually discover a third planet through any current UI path, regardless of galaxy size.

This was already flagged as a known simplification at the time it was written (see `galaxyState.ts`'s own comment and `src/presentation/README.md`'s Phase 5 section: *"No 'discover a planet by traveling/scanning' mechanic exists yet"*) — not a new surprise this audit uncovered, but it is a genuine gap between the map GDD's stated premise and the actual implementation, worth closing rather than leaving implicit.

**Attributed to:** Agent 22 (Ships & Travel Presentation) / Agent 24 (Phase 5 Integration) — arrival was never wired to extend discovery to the destination planet, the natural place the design's own words describe it happening.

### 2.4 — No new galaxy-wide view needed, existing map sufficient at current scale: **Mixed — the premise doesn't hold at measured scale**

Tested planet count: the real, currently-reachable scale is **2 discovered planets** (see 2.3's finding above — not the generated galaxy's nominal count of 5, since only 2 are ever actually reachable). Live-measured via `window.__game` against `TradeMapScene`, canvas 800×500:

- A **completely fresh session** (`localStorage` cleared, zero player actions taken) already overflows the canvas: content extends to y=615, 115px past the bottom edge, with no scrolling mechanism — 5 text lines render below the visible canvas area.
- After purchasing a ship and resolving one voyage (an entirely ordinary post-Phase-5 player state, not an edge case), the overflow grows to y=636 (136px past the bottom edge).
- Separately: the shared nav bar (`scenes/nav.ts`, rendered on all 10 scenes) itself overflows horizontally by 32px (content reaches x=832 against an 800px-wide canvas) — a consequence of Phase 3/4/5 successively adding entries (Agent 13, 18, 22) without any of them revisiting the nav bar's layout.

Neither finding is evidence that a **new galaxy-wide/zoom-out view** is needed — the design decision correctly identified that as a different problem (navigating *many* planets), and 2 planets is not that. What this measurement shows instead is a plain **legibility/overflow bug in the existing screen(s)**, present since before this milestone and worth reporting on its own terms.

**Attributed to:** `TradeMapScene.ts` (originated by Agent 13, extended by Agent 22) for the vertical content overflow — neither added scrolling/pagination as content accumulated across three phases' worth of additions to one screen; `scenes/nav.ts` (Agent 13/18/22 cumulatively) for the horizontal nav-bar overflow.

### Summary for Agent 26

| Property | Result |
|---|---|
| 2.1 No advance warning | Gap — the underlying mechanic (seasons/emergencies) was never built, only baseline drift exists |
| 2.2 No staleness | Confirmed, clean pass |
| 2.3 No scanner/probe | Confirmed on the narrow claim; discovery-by-travel is not actually wired up (already-documented gap, now precisely located) |
| 2.4 Map sufficient at current scale | The existing screen(s) overflow their own canvas at the current real scale — a legibility bug, not evidence a galaxy-wide view is needed |

None of the four deferred future ideas (Section 2.5) were found implemented anywhere in the codebase.

## 7. Agent 26 Milestone Confirmation

**Section 1's Definition of Done is met.** That Definition of Done is "confirmation, with evidence, that the existing map... exhibits all four properties," explicitly anticipating that gaps might surface ("if gaps are found... those are bugs... to report and fix, not new Phase 6 features"). Agent 25 produced that confirmation, with evidence, for all four properties. Two properties passed cleanly; two surfaced genuine bugs in the underlying Phase 3/5 implementation. Per this milestone's own framing, a report with open, attributed bug items is the correct, honest outcome — not a blocked or incomplete milestone. Nothing below was fixed; per this agent's Must-Not-Do, fixes are explicitly out of scope for this milestone.

### Per-property confirmation

| Property | Status | Bug report (if any) |
|---|---|---|
| 2.1 No advance warning for emergencies | **Not confirmed working as designed** | The underlying mechanic doesn't exist. `PlanetMarketState` (`src/data/types/planetMarketState.ts`) has no `season` field despite one being specified in Phase 3 GDD §3; no `emergency`-related type, constant, or logic exists anywhere in `src/`. Only baseline drift (`src/trading/drift.ts`) was ever built. **Expected** (Phase 3 GDD's own Definition of Done): trade map data driven by baseline drift + season + emergency layers. **Actual:** one of three layers exists. **Attributed to:** Agent 1 (Phase 3 schema amendment — `season` field never added), Agent 11 (Trading Core — season/emergency logic never implemented), Agent 12/Agent 15 (Phase 3 Validation/Integration — gap not caught in their own DoD verification). |
| 2.2 No staleness, map data always live | **Confirmed working as designed** | None. |
| 2.3 No scanner/probe mechanic | **Confirmed on the literal claim; adjacent bug reported** | No scanner/probe code exists (clean). But discovery-by-travel — the mechanism the design premise rests on — is not wired up. **Expected:** a planet becomes `discovered: true` upon physical visitation, including arrival via a real `Voyage`. **Actual:** `discovered: true` is written only twice, both hardcoded bootstrap overrides in `src/presentation/galaxyState.ts`; `src/ships/resolveArrival.ts` and all presentation arrival-handling code update `Ship.currentPlanetId` but never `Planet.discovered`. A player can never discover more than the 2 bootstrap planets regardless of how much they travel. **Attributed to:** Agent 22 (Ships & Travel Presentation) / Agent 24 (Phase 5 Integration). |
| 2.4 No new galaxy-wide view needed, existing map sufficient at current scale | **Not confirmed — the existing screen has its own bug** | **Expected:** the existing per-planet map remains legible at current scale. **Actual:** live-measured, a freshly-cleared session already overflows the 800×500 canvas vertically by 115px with no scrolling, growing to 136px with one owned ship; the shared nav bar overflows horizontally by 32px on all 10 scenes. This is not evidence a galaxy-wide view is needed (a different, still out-of-scope problem) — it's an overflow bug in what already exists. **Attributed to:** `TradeMapScene.ts` (Agent 13, extended by Agent 22) for the vertical overflow; `scenes/nav.ts` (Agent 13/18/22 cumulatively) for the horizontal overflow. |

### Explicit confirmation: no deferred future idea was implemented

Checked directly, not assumed: `tests/integration/mapVerification.test.ts` regression-guards zero matches for `scanner`/`probe` or `season`/`emergency` (in real code) anywhere in `src/`, and `main.ts`'s scene registry contains exactly the 10 existing scenes — no new galaxy-wide/zoom-out scene, no staleness-gating code, no emergency-countdown code. **None of the four deferred future ideas (Section 2.5) exist in the codebase as of this milestone's close.**

### Open items carried forward (not fixed by this milestone)

1. Seasons and emergencies were never implemented — only baseline drift exists as a live map-data layer (bug against Agents 1/11/12/15).
2. Discovery is never extended by travel — only the 2 bootstrap-hardcoded planets are ever reachable (bug against Agents 22/24).
3. `TradeMapScene` and the shared nav bar both overflow their 800×500 canvas at the current, real scale, with no scrolling mechanism (bug against Agents 13/18/22).

These are fix-it work items for a future session, not new Galactic Map scope — this milestone's job was to verify and report, which is now complete.
