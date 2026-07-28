# src/ships

Owned by the **Ships & Travel Core Agent** (Phase 5 GDD §4.1, agent 20).

Pure, framework-agnostic TypeScript implementing ship assembly, tier
derivation, shipyard pool/purchase, and travel-time/voyage logic — the
Phase 5 equivalent of what `src/crew` was for Phase 4. Same architectural
mandate: zero Phaser/DOM/browser API. Reuses `src/simulation`'s `craft()`
(components are ordinary crafted items, never reimplemented here) and
`getTierColor()` (tier derivation/rolls, same pattern as `src/galaxy`'s
`rollPlanetTier()` and `src/crew`'s `rollCandidateTier()`).

- `deriveShipTier.ts` — `deriveShipTier()` (§2.3): straight average of
  installed component tiers, via each tier's breakpoint-range midpoint
  (reusing `TIER_COLOR_BREAKPOINTS`, never reimplementing it), mapped back
  through `getTierColor()`. Documented null-slot rule (the contract
  requires one, explicit, not ambiguous): a `null` slot is excluded from
  the average; a ship with **zero** components falls back to `"Grey"` —
  an unrated/incomplete ship is the lowest tier, not a neutral one,
  consistent with the scarcity theme used everywhere else in this design.
- `refreshShipyardPool.ts` — `refreshShipyardPool()` (§2.2): rolls
  `SHIPYARD_POOL_SIZE_PER_PLANET` candidates via the shared tier
  breakpoint table. "Components generated to match the resulting tier"
  (the contract's own wording) is implemented by rolling one target value
  per candidate and setting every quality on all 4 generated components
  to that exact value — deterministic, and trivially guarantees the
  candidate's own `tier` and its components' tiers all agree.
- `purchaseShip.ts` — `purchaseShip()` (§2.2): rejects on insufficient
  funds, deducts the tier-scaled purchase cost, removes the candidate from
  its pool, creates a live `Ship` owned by the buyer at the shipyard's
  planet.
- `assembleShip.ts` — `assembleShip()` (§2.1/§2.3): installs a component
  into the matching slot, recomputes `ship.tier` via `deriveShipTier()`
  on every call — never stale.
- `calculateTravelTime.ts` — `calculateTravelTime()` (§2.4/§2.7/§2.8):
  Euclidean distance between two planets' `{x,y}` positions (2D only),
  scaled by the distance constant, modified by the ship-tier speed table.
- `initiateVoyage.ts` / `resolveArrival.ts` — `initiateVoyage()`/
  `resolveArrival()` (§2.8/§2.9): `arrivesAt` is computed once, at
  departure, from `calculateTravelTime()`'s output — never recomputed if
  the ship's tier changes mid-voyage. `resolveArrival()` refuses to
  resolve before `arrivesAt` and reports delivered cargo, but never
  itself touches Agent 11's trading logic (see below).

## Necessary completions and corrections beyond Agent 20's literally-specified signatures

Same category as `src/crew`'s own necessary completions — documented here
rather than silently made:

- **Every function takes the actual data (`Ship`/`ShipCandidate`/
  `ShipyardPool`/`Wallet`/`Planet`/`Voyage`) instead of an ID into an
  implicit store.** The contract's literal signatures
  (`purchaseShip(shipId, playerId)`, `assembleShip(ship, componentId,
  slot)`, `initiateVoyage(shipId, originPlanetId, ...)`,
  `resolveArrival(voyageId, ...)`) all imply a hidden registry a pure
  function can't have — the same purity requirement, and the same
  resolution, already applied to Agent 11's `purchaseListing()` and Agent
  16's `hireCrew()`.
- **`Ship.currentPlanetId` — a necessary addition to the Phase 5
  amendment's own type, found while implementing this agent.** The
  amendment's `Ship` shape had no field recording where a ship currently
  is, yet `resolveArrival()`'s contract requires it to "deliver the
  ship... to the destination planet." Added as a required `string`, set
  at purchase time to the shipyard's planet, updated only by a successful
  `resolveArrival()` — never mutated mid-voyage (the `Voyage` record
  itself represents "in transit").
- **`PurchaseShipResult` and `ArrivalResult` are new types**, named by
  Agent 20's contract (`Ship | PurchaseError`, `ArrivalResult`) but never
  defined by the amendment. Both mirror the existing `CraftResult`/
  `PurchaseResult`/`HireResult` discriminated-union pattern.
- **`purchaseShip()` checks wallet sufficiency and rejects if the player
  can't afford it.** Same precedent as `hireCrew()`/`payUpkeep()` — Agent
  11's `purchaseListing()` never added this check (a known,
  separately-documented gap in `src/trading`); this agent doesn't repeat
  it, and doesn't retroactively fix Phase 3's code either.
- **`assembleShip()` throws if the component's `category` doesn't match
  the target `slot`.** Not in the contract's literal wording, but
  installing a weapon into the engine slot is a caller/programming error,
  not a normal business outcome (unlike a rejected hire or an
  insufficient-funds purchase) — so this throws rather than inventing a
  rejection-result union the contract never asked for.
- **`calculateTravelTime()` returns milliseconds, not hours.** The GDD's
  own pseudocode never states the return unit; every timestamp elsewhere
  in this codebase (`Listing.expiresAt`, `CrewMember.lastPaidAt`,
  `Voyage.arrivesAt`) is epoch-ms, so returning ms keeps
  `initiateVoyage()`'s `arrivesAt = currentTime + calculateTravelTime(...)`
  correct with no unit conversion at the call site.
- **`calculateTravelTime()` throws if either planet lacks a generated
  `position`.** `Planet.position` is optional (Phase 2's amendment made it
  so, for MVP-era backward compatibility — Delta Rigelus has none).
  Travel structurally requires real coordinates on both ends; this is not
  a normal rejection, so it throws rather than fabricating a distance.
- **`resolveArrival()` does not itself activate any Phase 3 `Listing`
  for in-transit sale cargo.** Agent 20 must never touch Agent 11's
  trading logic, so it only *reports* which cargo arrived at which
  destination (`ArrivalResolved.cargo`/`destinationPlanetId`) — turning
  that report into a real `Listing` via `createListing()` is the caller's
  job (Presentation/Integration), per `arrivalResult.ts`'s own comment.
- **No ship-ownership capacity limit exists**, unlike Phase 4's
  `CrewCapacity`. The design doc never decided one, so `purchaseShip()`
  enforces none.

## Travel Encounters (Non-Combat) amendment

`resolveEncounters.ts` — `resolveEncounters(voyage, ship, destinationPlanet,
resources, random?)` (§2.1-2.7): rolls one trigger check per time window the
voyage spanned (`Math.max(1, Math.ceil(durationHours / ENCOUNTER_CHECK_WINDOW_HOURS))`
— even a voyage shorter than one window gets exactly one roll), and on a
hit, a weighted type split (§2.2) resolves one of three outcomes:
`tradeOpportunity` (a credits amount in the configured range),
`discovery` (calls the real `rollQuality()` — never reimplemented — against
a resource drawn from the destination planet's eligible pool), or `hazard`
(a 1-100 roll modified by the ship's own `tier` via `HAZARD_SHIP_TIER_MODIFIER`,
with a failure cost scaled by `HAZARD_FAILURE_COST_CURVE` on a fail).
`resolveArrival()` gained 3 new **optional, trailing** parameters
(`destinationPlanet?`, `resources?`, `random?`) and now calls
`resolveEncounters()` only when both `destinationPlanet` and `resources`
are supplied — every pre-amendment call site keeps compiling and behaving
identically without passing them (`ArrivalResolved.encounters` is simply
`[]`), satisfying the amendment's own "additive only" constraint.

**Never touches `Wallet` or player inventory.** Same boundary
`resolveArrival()` already holds for cargo/`Listing` activation:
`resolveEncounters()` only *reports* what happened
(`creditsGranted`/`creditsLost`/the rolled `resourceId`+`qualities`) via
each `EncounterResult`'s own `outcome` — applying those amounts to a real
`Wallet`, or the rolled item to real inventory, is the caller's
(Presentation's) job, the same division of responsibility `ArrivalResult.cargo`
already established for the Phase 3 remote-sale connection.

**Necessary completion: `ArrivalResolved` gained one new field,
`encounters: EncounterResult[]`, always present.** The amendment's own
contract says "attach the result to `voyage.encounters`," but nothing in
this codebase ever persists a `Voyage` object after arrival (the caller
discards it once resolved, per `shipsState.ts`/`TradeMapScene`'s existing
pattern) — a mutation on a soon-to-be-discarded `Voyage` instance would
never reach any caller. Surfaced on `ArrivalResult` instead, the exact
same way `cargo` already is.

**The single hardest constraint in this amendment, upheld structurally:**
`resolveEncounters()` never reads or writes `Planet.discovered` anywhere —
confirmed by `tests/ships/resolveEncounters.test.ts`'s dedicated negative
test (many trials, snapshot-compared before/after) and by
`tests/integration/mapVerification.test.ts`'s existing structural
regression guard (grep-confirms `discovered: true` is still written in
exactly the one file it always was).

**Resource pool source for discovery is the *destination* planet** —
Travel Encounters GDD §2.5 explicitly leaves this choice open ("origin or
destination"); destination was chosen since arriving somewhere new is what
a discovery narratively represents. Either choice is equally valid per the
design doc's own admission; this is the one made, documented rather than
silently picked.

## Scanner/Probe amendment

`refreshScannerPool.ts` / `purchaseScanner.ts` — mirror
`refreshShipyardPool()`/`purchaseShip()` exactly, applied to scanners'
own pool (`ScannerPool`, not `ShipyardPool`). `refreshScannerPool()` is
simpler than its ship counterpart only because a `ScannerCandidate` has no
components to generate matching qualities for.

`calculateDistance.ts` — the Euclidean distance formula extracted out of
`calculateTravelTime()`, per the Scanner GDD's own instruction not to
duplicate it a second time. `calculateTravelTime()` now calls this helper
instead of inlining the formula; its own behavior (including throwing when
either planet lacks a `position`) is unchanged — see
`tests/ships/calculateTravelTime.test.ts`.

`performScan.ts` — `performScan(ship, dockedPlanet, ownedScanners,
allPlanets)` (§2.3/§2.4): a **necessary completion**, same category as
every other Agent 20 function — the GDD's own pseudocode names
`performScan(playerId, dockedPlanetId)`, but a pure function can't resolve
"the player," "where they're docked," or "which scanners they own" from
bare IDs into an implicit store. "Docked at `dockedPlanet`" is read off
`ship.currentPlanetId`, the same field `resolveArrival()` already uses to
represent where a ship currently is — there is no separate player-location
concept anywhere in this codebase to check instead.

Effective radius is `SCANNER_BASE_SCAN_RADIUS` plus the **highest**
`radiusBonus` among the caller's `ownedScanners` (§2.4's "highest-tier-only,
not summed" default) — since `SCANNER_TIER_RADIUS_BONUS` is strictly
increasing by tier (asserted in `tests/data/scannerConstants.test.ts`),
taking the max bonus directly implements "highest tier" with no separate
tier-ranking utility needed.

With **no scanner owned**, `performScan()` rejects — Agent 20's contract
calls this the conservative default for the GDD's own ambiguous "base
radius with zero owned" case.

Every planet in `allPlanets` that is not already `discovered` and has a
generated `position` is checked against the effective radius via
`calculateDistance()`; each planet within it is returned as an **immutable
copy** with only `discovered: true` added (never mutated in place, same
convention as `purchaseShip()`'s `updatedPool`/`updatedWallet`) — this is
the *only* field `performScan()` may ever change on a `Planet`, verified by
`tests/ships/performScan.test.ts`'s dedicated snapshot-diff guardrail test.
Planets without a `position` (e.g. MVP-era Delta Rigelus) are silently
skipped rather than thrown on — unlike `calculateTravelTime()`'s single
deliberate two-planet call, a scan legitimately iterates over every planet
on record, some of which may predate Phase 2's position field.

**`PurchaseScannerResult` and `PerformScanResult` are new types**, same
`CraftResult`/`PurchaseResult`/`PurchaseShipResult` discriminated-union
precedent, named by the GDD's contract but never defined by it.

**Deliberately never wired into `resolveArrival()`, `initiateVoyage()`, or
`resolveEncounters()`.** `performScan()` only ever runs as an explicit
caller-invoked function — confirmed by
`tests/ships/performScan.test.ts`'s two dedicated guardrail tests (no
Scanner-amendment file references `resolveEncounters`/`EncounterResult`;
neither `resolveArrival.ts` nor `initiateVoyage.ts` references
`performScan` or `Planet.discovered` at all).

## Boundary confirmed

`src/simulation/refine.ts`, `craft.ts`, everything under `src/galaxy/`,
`src/trading/`, and `src/crew/` are untouched by this agent — confirmed
via `git status` and via `tests/ships/regressionCheck.test.ts` re-running
the exact hand-calculated cases already proven correct pre-Phase-5.
