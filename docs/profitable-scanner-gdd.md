# Profitable — Scanner/Probe Game Design Document

Status: design locked (see `profitable-design-questions.md`, "Scanner/Probe" section — fully resolved). This is the second of the four deliberately-deferred gaps, picked up after Travel Encounters (the item originally skipped, now addressed). It extends `profitable-phase5-gdd.md` directly, reusing the market-pool pattern (`ShipyardPool`) and distance math (`calculateTravelTime`) Agent 20 already owns.

---

## 1. Scope

Like Travel Encounters, this feature requires **no new agents** — it's implemented as amendments to Agent 1 (schema), Agent 20 (Ships & Travel Core), Agent 21 (Validation/Test), and Agent 22 (Presentation), plus one small confirmation agent.

**Definition of done:** a player can purchase a tier-rolled scanner from a planet's refreshing market pool, and — while docked at any already-discovered planet with a scanner owned — trigger a scan action that sets `discovered: true` on any undiscovered planets within the scanner's tier-scaled radius of that planet's coordinates. All of this without modifying Agents 2, 8, 11, or 16; without reopening the closed "four ship components" decision; without affecting `deriveShipTier()`'s averaging; and without any interaction with map data staleness (there is none) or Travel Encounters' discovery type (fully independent, by design).

**Out of scope:** any passive/automatic discovery based on continuous player position during travel (explicitly not built — see Section 2.3), any change to map data freshness, any interaction with Travel Encounters, and any change to how a fifth "sensor" ship component might work (there is no fifth component).

## 2. What's Already Decided (from `profitable-design-questions.md`)

### 2.1 Form Factor
A **standalone item**, not a ship component. Sits entirely outside `deriveShipTier()`'s component-tier averaging — owning a scanner has zero effect on a ship's derived tier or travel speed.

### 2.2 Acquisition
Same tier-rolled, refreshing market-pool pattern already used for schematics, NPC crew, and ships — but its **own separate pool type**, not merged into `ShipyardPool`.

### 2.3 Discovery-Range Mechanic
A **manual "scan" action**, available while docked at an already-discovered planet with a scanner owned. Computes Euclidean distance (reusing the same math as `calculateTravelTime()`) from *that planet's* coordinates to every other planet; any undiscovered planet within the scanner's radius becomes `discovered: true` — same flag, same meaning as physical visitation. **Not** passive/automatic based on continuous mid-voyage position (no such position is tracked, and none should be added for this).

### 2.4 Tier-Scaling
Scanner range scales with the **scanner item's own tier**, not ship tier — additive bonus on a base radius, reusing the shape of the schematic-tier contribution table (Grey +0 up to Gold's top value). Whether multiple owned scanners stack, or only the highest-tier one counts, is a smaller implementation detail — default to **highest-tier-only**, consistent with a ship having one derived tier rather than a sum of components ever owned.

### 2.5 No Staleness Interaction
Confirmed no effect on map data freshness — the scanner's entire job is extending the `discovered` boolean's range, nothing else.

### 2.6 No Travel Encounters Interaction
Confirmed fully independent from the Travel Encounters discovery type — no shared code path, no cross-modifier in either direction.

## 3. New/Extended Data Shapes

```
Scanner {
  id: string
  tier: TierColor
  ownerId: string
}

ScannerPool {
  planetId: string
  availableScanners: Scanner[]
  lastRefreshedAt: timestamp
}
```

No changes to `Planet`, `Voyage`, `Ship`, or any other existing type — a scan action only ever flips existing `discovered` booleans, it doesn't add fields to the planets it affects.

### New constant tables/values

- **Scanner pool refresh interval and pool size per planet** — tunable, same pattern as `ShipyardPool`/`PlanetCrewPool`.
- **Scanner acquisition cost curve by tier** — tunable, reusing the "tier = more valuable" shape.
- **Base scan radius** (with no scanner, or as the floor before tier bonus) — tunable.
- **Scanner tier radius-bonus table** — tunable, reusing the schematic-tier contribution table's shape.

## 4. Implementation Plan — Amendments, Not New Agents

### 4.1 Roster & Order

**Amendment — Agent 1 (Data Schema), Scanner additions.** `Scanner`, `ScannerPool` types, and the four constant tables above. Created first.

**Amendment — Agent 20 (Ships & Travel Core).** Adds `refreshScannerPool()`, `purchaseScanner()`, and `performScan()` — mirrors the existing `refreshShipyardPool()`/`purchaseShip()` pattern for the first two, and reuses `calculateTravelTime()`'s distance math (extracted into a shared distance helper if not already factored out) for the third.

**Amendment — Agent 21 (Phase 5 Validation/Test).** Tests scanner pool refresh/purchase, scan radius correctness (including the tier-bonus table and highest-tier-only stacking rule), and confirms a scan action only ever sets `discovered: true` — never any other planet field, never anything related to market state or ship tier.

**Amendment — Agent 22 (Ships & Travel Presentation).** Adds a scanner listing to the existing shipyard-adjacent market screen and a "Scan" action available while docked, displaying newly discovered planets as a result.

**Agent 28: Scanner Confirmation.** New, small, created last. Confirms the Definition of Done and explicitly confirms the guardrails: no fifth ship component was added, `deriveShipTier()` is unaffected, no passive/automatic discovery exists, and no interaction with staleness or Travel Encounters was introduced.

### 4.2 Agent Contracts

Full individual contracts live in `docs/agents/agent-01-amendment-scanner-schema.md`, `agent-20-amendment-scanner-core.md`, `agent-21-amendment-scanner-test.md`, `agent-22-amendment-scanner-presentation.md`, and `agent-28-scanner-confirmation.md`.

## 5. Cross-Cutting Rules

Same as every prior phase (see `docs/agents/README.md`), plus:

- **No agent adds a fifth ship component category, or folds scanner data into any of the four existing ones.** The four-category decision from Ships stands.
- **`deriveShipTier()` must remain unaffected by scanner ownership.** A scanner is not a component and must never enter that function's averaging.
- **No agent implements passive/automatic discovery based on continuous player position.** The scan action is deliberate and docked-only, per Section 2.3.
- **No agent implements any interaction between a scanner and map data staleness, or between a scanner and Travel Encounters' discovery type.** Both were explicitly confirmed to have zero interaction — introducing one anywhere would be new, undecided scope.

## 6. Agent 28 Confirmation

All four amendments (Agent 1 schema, Agent 20 core, Agent 21 test, Agent 22 presentation) are complete. Eight explicit confirmations, each backed by specific evidence rather than an assumption, per this agent's own contract:

**1. Definition of Done confirmed — a real example.** Live-verified end-to-end through the actual production code paths (not reimplementations), driven via `window.__game.scene.getScene(...)` against a fresh session: purchased a Grey-tier scanner at the Shipyard through the real `onPurchaseScanner()` handler (pool 3→2, wallet 500→420cr, exact tier cost), purchased a Blue-tier scanner the same way, and confirmed the roster correctly labeled it `"Blue tier scanner (in use for scanning)"` — the highest-tier-only rule visibly in effect. Purchased a ship and called the real `TradeMapScene.onScan()`: correctly reported no results at the starting planet, independently hand-verified correct (this 5-planet galaxy's closest undiscovered planet, ~680 units away, is genuinely farther than even a Gold-tier scanner's max radius of 470 — a fact about this random seed, not a bug). An isolated positive-path check then ran the real `performScan()` + `markPlanetDiscovered()` sequence against a synthetic dock position placed within range of a real undiscovered planet: it was correctly reported `newlyDiscovered`, `getDiscoveredPlanets()` grew from 2 to 3, and — after a full page reload — the discovery, the owned scanners, and the ship all persisted correctly. Every mechanic behind this is also independently hand-verified in `tests/ships/performScan.test.ts`: the exact effective-radius formula (base + tier bonus) at 3 tiers, an exact inside/outside boundary case, and the full known-layout discovery set.

**2. No fifth ship component exists anywhere.** `src/data/types/componentCategory.ts`'s `ComponentCategory` is unchanged — still exactly `"weapon" | "engine" | "shield" | "cargoHold"`, 4 values. `Scanner`/`ScannerPool`/`ScannerCandidate` (`src/data/types/scanner*.ts`) reference neither `ComponentCategory` nor `ShipComponent` anywhere (grep-confirmed; the only match is `scanner.ts`'s own doc comment naming the separation, not a real reference).

**3. `deriveShipTier()` is unaffected by scanner ownership.** `src/ships/deriveShipTier.ts` shows zero diff across the entire Scanner amendment (`git diff` confirms) — its signature is still `deriveShipTier(ship: Ship): TierColor`, a single parameter with no way for scanner data to reach it. Direct evidence: `tests/ships/performScan.test.ts`'s `"guardrail: deriveShipTier() produces identical output regardless of whether the ship's owner owns a scanner"` test — purchases a real Gold-tier scanner for the ship's own owner via the real `purchaseScanner()`, then re-derives the ship's tier and confirms it's identical. Passing.

**4. No passive/automatic discovery exists anywhere.** Direct evidence: `tests/ships/performScan.test.ts`'s `"guardrail: no automatic/passive discovery -- resolveArrival() and initiateVoyage() never reference performScan or mutate Planet.discovered"` test — source-greps both files and confirms neither references `performScan` nor `discovered` at all. `performScan()` itself only ever runs from `TradeMapScene.onScan()`, triggered exclusively by an explicit player click on the "> Scan" button rendered only while docked and not en route. Passing.

**5. No interaction with map data staleness exists.** Confirmed by absence: `PlanetMarketState` carries no staleness/timestamp field at all (`tests/integration/mapVerification.test.ts`'s existing `"2.2 -- PlanetMarketState carries no timestamp/staleness field"` test, unchanged by this milestone), and nothing in any Scanner-amendment file (`performScan.ts`, `refreshScannerPool.ts`, `purchaseScanner.ts`, the presentation scenes) references staleness, freshness, or caching in any real code (grep-confirmed — the only matches are this GDD's own guardrail prose and doc comments explicitly documenting the absence).

**6. No interaction with Travel Encounters exists.** Direct evidence: `tests/ships/performScan.test.ts`'s `"guardrail: no code in the Scanner amendment references resolveEncounters() or any Travel Encounters type"` test — source-greps `performScan.ts`, `refreshScannerPool.ts`, and `purchaseScanner.ts` for `resolveEncounters`/`EncounterResult`, zero matches. Corroborating evidence in the other direction: `tests/integration/mapVerification.test.ts`'s discovery-write-site test explicitly confirms `resolveEncounters.ts` still never writes `discovered: true`, even now that `performScan.ts` legitimately does — the two mechanisms stay provably independent in both directions.

**7. `performScan()` never modifies any `Planet` field other than `discovered`.** Direct evidence: `tests/ships/performScan.test.ts`'s `"guardrail: performScan() never modifies any Planet field other than discovered"` test — a full-field snapshot diff before/after confirms the only changed key is `discovered`, and the original input object is untouched (immutable-copy convention, same as `purchaseShip()`'s `updatedPool`/`updatedWallet`). Passing.

**8. Agents 2, 8, 11, and 16 remain unmodified.** `git status`/`git diff` across the entire Scanner amendment (all four sub-agents' work) shows zero changes anywhere under `src/simulation/`, `src/galaxy/`, `src/trading/`, or `src/crew/` — confirmed both by an empty `git status --short` for those directories and an empty `git diff --stat` for `refine.ts`/`craft.ts`/`rollQuality.ts`/`loadContent.ts` specifically.

**Full test suite: 479/479 passing, typecheck clean.**

**Scanner/Probe GDD Section 1's Definition of Done is explicitly confirmed as met.** No gaps found; nothing to attribute or route.
