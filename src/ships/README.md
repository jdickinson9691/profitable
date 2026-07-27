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

## Boundary confirmed

`src/simulation/refine.ts`, `craft.ts`, everything under `src/galaxy/`,
`src/trading/`, and `src/crew/` are untouched by this agent — confirmed
via `git status` and via `tests/ships/regressionCheck.test.ts` re-running
the exact hand-calculated cases already proven correct pre-Phase-5.
