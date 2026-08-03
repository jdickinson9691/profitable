# Functional Agent: Crew

**Status: existing system, documented as-built.** Consolidates Agent 16 (Phase 4 Crew Core — hire/assign/background-craft/upkeep/attrition/dismiss/capacity) and its presentation slice (Agent 18, `CrewScene`). This file did not exist until now — `ship.md`'s own Crew Roles section and `docs/functional-agents/build.md`'s readiness computation both flagged its absence as a real documentation gap (Crew's TypeScript implementation was fully built, but had no consolidated functional-agent contract to check it against, blocking Crew's own Unity migration phase on paperwork rather than code). Written directly against the current source (`src/crew/*.ts`, `src/data/constants/crewConfig.ts`, `src/presentation/scenes/CrewScene.ts`), not paraphrased from `docs/agents/agent-16-crew-core.md`'s original pseudocode, which has since drifted in a few places (see the honest gaps below).

**See also `docs/functional-agents/ship.md`** — the Ship Crew Roles amendment extends `CrewMember` with `shipRole`/`assignedShipId` (optional/nullable, so this file's own pre-amendment data still validates) and adds 5 role effects that reach into travel/combat/scanning/crafting/repair. That extension is `ship.md`'s scope, not this file's — this file documents the crew system itself (hiring, wages, attrition, craft assignment), `ship.md` documents what a crew member additionally *does* once assigned to a ship role. A `CrewMember` with no ship role at all behaves exactly as this file describes, unaffected by that amendment.

**Depends on:** `src/simulation/craft.ts` (Agent 2's `craft()` — called once per simultaneous crafter, never reimplemented), `src/data/types/tierColor.ts`/`getTierColor()` (Agent 8's own tier-roll reuse, applied here to crew candidate tier), `src/galaxy/seededRandom.ts` (`createSeededRandom`/`generateRandomSeed`, same determinism pattern as `generateGalaxy()`/`generatePlanet()`), `src/data/types/profession.ts` and `docs/profitable-alpha-content-roster.md` §6 (the closed tier 6-7 profession taxonomy). Cross-references `ship.md` (Crew Roles' `shipRole`/`assignedShipId` extension, one-way — this file's functions never read those fields), `planetary-markets.md`'s `Wallet` type (crew hiring/wages/capacity expansion all spend from the same wallet trading uses).

## Responsibility

Let a player hire crew members from a per-planet pool of rolled candidates, assign them to craft actions (running simultaneously with the player's own crafting, never serialized into a queue), resolve idle/background production for time elapsed while unattended, collect recurring wage upkeep, and lose a crew member to attrition if upkeep goes unpaid past a grace period. Crew capacity itself is a small base plus purchasable expansion slots. This file owns none of `craft()`'s own formula — every crafting action a crew member performs calls the existing, unmodified function with the crew member's tier as the crafter input.

## Inputs

- `Resource`/`Recipe`/`Schematic` catalog and `craft()` (`src/simulation/craft.ts`) — called by `assignToCraft()`/`resolveBackgroundCrafting()`, never reimplemented.
- `Wallet` (Phase 3 type, `planetary-markets.md`) — the same credits pool trading spends from; hiring, wage payment, and capacity expansion all deduct from it.
- `getTierColor()` (`src/simulation/tierColor.ts`) — reused for rolling a crew candidate's tier, same breakpoint table every other tier-rolling system uses.
- `createSeededRandom`/`generateRandomSeed` (`src/galaxy/seededRandom.ts`) — `refreshCrewPool()`'s determinism, same shape as `generateGalaxy()`.
- `TIER_6_7_PROFESSIONS` (`src/data/constants/crewConfig.ts`) — the closed profession taxonomy a tier 6-7 (Orange/Gold) candidate's `profession` is rolled from.
- `getCurrentPlanet()` (`src/presentation/currentPlanet.ts`) — resolves which planet's crew pool `CrewScene` is browsing; never reimplemented here.

## Outputs

### `refreshCrewPool(planetId, seed?, now?): PlanetCrewPool` — `src/crew/refreshCrewPool.ts`
Rolls `CREW_POOL_SIZE_PER_PLANET` candidates via the same tier-breakpoint roll every other tier system uses; a rolled Orange/Gold candidate also gets a `profession` from `TIER_6_7_PROFESSIONS`, everyone else gets `null`. Deterministic given a seed (defaults to a freshly generated one via `generateRandomSeed()`, not a timestamp-only fallback, to avoid same-millisecond collisions). Called by `crewState.ts`'s `getCrewPool()` — **generate-once-and-cache per planet**, not re-rolled on a timer (see the honest gap below).

### `hireCrew(candidate, pool, capacity, existingCrew, wallet, playerId, now?): HireResult` — `src/crew/hireCrew.ts`
Rejects if the candidate isn't actually in the given pool, or if `existingCrew.length >= capacity.baseCapacity + capacity.purchasedSlots`. Looks up hire cost (`CREW_HIRE_COST_BY_TIER`) and wage (`CREW_WAGE_BY_TIER`) by the candidate's tier — checks the wallet can afford the hire cost before deducting (a real completion the original Agent 16 pseudocode didn't call out explicitly: `purchaseListing()`'s own known gap of never checking funds first is *not* repeated here). On success, produces a new `CrewMember` (`status: "idle"`, `assignedCraftId: null`, `hiredAt`/`lastCheckedAt`/`lastPaidAt` all set to `now`) and removes the candidate from the pool's `availableHires`.

### `assignToCraft(crewMember, craftAction, random?): AssignResult` — `src/crew/assignToCraft.ts`
Calls `craft()` once, using `crewMember.tier` as the crafter input — never reimplements any part of the formula. Always succeeds (no capacity/eligibility check of its own; `craft()`'s own rejection paths, if any, surface through `craftResult`). Sets `status: "active"`/`assignedCraftId`. **Profession is not passed to `craft()`** — there's no profession-to-recipe eligibility mapping or crafting-formula bonus in this codebase; a hired tier 6-7 crew member's profession is purely informational (a label) here. Supports running simultaneously with the player's own active craft and every other crew member's active craft — `craft()` is already pure/independent, so nothing here serializes multiple crafters into a queue.

### `resolveBackgroundCrafting(crewMember, craftAction, currentTime, backgroundRate?, random?, maxUnits?): BackgroundResult` — `src/crew/resolveBackgroundCrafting.ts`
Elapsed time is always `currentTime - crewMember.lastCheckedAt`, capped at `ELAPSED_TIME_CAP_HOURS` — **never trusts a caller-supplied duration.** `unitsCompleted = min(floor(cappedElapsedHours * backgroundRate), maxUnits)`, one `craft()` call per completed unit. **`backgroundRate` defaults to `BACKGROUND_IDLE_OUTPUT_RATE`, resolved this pass to a real `0.5` (units/hour)** — see that constant's own comment for the "flat 50%" design decision (`profitable-design-questions.md`'s Crew Crafters section) and the honest translation into a concrete per-hour number (active crafting has no continuous per-hour throughput of its own to literally halve). An explicit `null` override still produces `resolved: false` — kept for a caller that deliberately wants "no background mechanism at all," not because the rate itself is unresolved anymore. **`maxUnits` (added this pass, defaults to unbounded)** is a real-inventory-availability cap pre-resolved by the caller — `CrewScene` computes it from `totalQuantity()` before calling, the same "core function never touches Inventory directly, caller passes in what's available" boundary `buildCitadel()`'s `materialQuantityAvailable` already established — so a crew member idle long enough to time-compute more units than the player's actual stockpile supports is correctly clamped, never producing output from materials that don't exist. `lastCheckedAt` updates to `currentTime` on every call regardless of whether production resolved, so a later call's elapsed window starts from this check, not the last time it actually produced anything.

### `payUpkeep(crewMember, wallet, currentTime): PaymentResult` — `src/crew/payUpkeep.ts`
A single payment per call, gated on `currentTime - crewMember.lastPaidAt >= WAGE_PAYMENT_INTERVAL_HOURS` — **not** a catch-up sum of however many intervals were missed. Returns `"not-due"` if the interval hasn't elapsed, `"insufficient-funds"` if the wallet can't cover `wageAmount`, otherwise deducts and updates `lastPaidAt`.

### `checkAttrition(crewMember, currentTime): AttritionResult` — `src/crew/checkAttrition.ts`
Deterministic and upkeep-driven only — **no random/chance-based loss.** Departs if `currentTime - crewMember.lastPaidAt > UPKEEP_GRACE_PERIOD_HOURS`. Measured from `lastPaidAt`, not `hiredAt`, so a long-tenured but reliably-paid crew member never departs just from age.

### `dismissCrew(crewMember, playerId): DismissResult` — `src/crew/dismissCrew.ts`
Voluntary, player-initiated dismissal — always succeeds if `crewMember.hiredByPlayerId === playerId`, otherwise rejects.

### `purchaseCapacity(capacity, wallet): PurchaseCapacityResult` — `src/crew/purchaseCapacity.ts`
The Nth purchased slot (0-indexed by `capacity.purchasedSlots`) costs `CREW_CAPACITY_EXPANSION_BASE_COST * CREW_CAPACITY_EXPANSION_COST_MULTIPLIER^N` — each additional slot costs more than the last, a real "who do I keep" tension rather than a flat cap.

### `CrewScene` — `src/presentation/scenes/CrewScene.ts` — **built**
One screen: crew pool at the current planet (`> Hire`), the player's roster (`> Assign to Craft`, `> Check Background`, `> Pay Upkeep`, `> Dismiss`), and `> Purchase Slot` for capacity expansion. `checkAttrition()` runs automatically for every roster member on every redraw (not a button) — a departure is only ever surfaced after it's actually reported, never guessed or shown preemptively. Also shows a read-only `shipRole`/`assignedShipId` indicator per member (`ship.md`'s scope, displayed here since this is the one screen showing a full crew roster).

`> Check Background`'s real-inventory wiring (added this pass, alongside resolving `BACKGROUND_IDLE_OUTPUT_RATE`): `maxAffordableUnits()` (read-only, via `totalQuantity()`) caps how many units the player's current materials can actually support before calling `resolveBackgroundCrafting()`. Ordering nuance worth understanding, not just accepting: the core function needs one real, quality-bearing `CraftAction` up front (for `craft()`'s own quality formula), but doesn't know how many units will actually complete until it resolves elapsed time internally — if that turns out to be zero (checked too recently), the one-unit "sample" `buildCraftAction()` already consumed is refunded (`setInventory()` restores the pre-sample snapshot) rather than wasted. Once a real `unitsCompleted` is known, the scene consumes the remaining `unitsCompleted - 1` units' worth for real and adds one output batch per `accepted` result to inventory — closing the gap this method's own prior comment flagged ("once a real rate exists, this needs to build a real action... consuming real inventory per completed unit").

## Must NOT Do

- **Must not touch `refine()`/`craft()` internals, galaxy/planet generation, or trading logic in any way** — this file's functions *call* `craft()` (once per simultaneous crafter); they never alter what it computes. Verified by `tests/crew/regressionCheck.test.ts` re-running the exact hand-calculated MVP/Phase 2/Phase 3 cases unchanged.
- Must not implement combat, travel-hazard, or poaching mechanics, or any random/chance-based crew loss — attrition is deterministic and upkeep-driven only (Phase 4 GDD §2.7).
- **Must not trust a caller-supplied elapsed-time value for background crafting** — always derive it from `currentTime - lastCheckedAt`, never accept it as a parameter representing "how much time passed."
- Must not serialize multiple simultaneous active crafts (player + N crew members) into a single-craft-at-a-time queue — `assignToCraft()`'s whole point is that `craft()` is already independent per call.
- Must not pass `profession` into `craft()`, or invent a recipe-to-profession eligibility mapping — no such mechanism exists in the crafting formula; profession is informational only until (if ever) a future pass adds one.
- **Must not read or write `CrewMember.shipRole`/`assignedShipId`** — those fields belong exclusively to `ship.md`'s Crew Roles amendment; this file's functions operate identically whether or not a crew member happens to be assigned to a ship role.
- Must not hardcode any constant already defined in `crewConfig.ts` — wage/hire-cost/capacity-cost tables, intervals, and the pool size are all tunable (Alpha Section 4's debug panel exposes every one of them as `let`/mutable-array entries).
- Must not implement rendering, input, save/load, or audio directly in any `src/crew/*.ts` file.

## Known real gaps, honestly flagged rather than silently left implicit

**None remaining as of this pass.** `CREW_POOL_REFRESH_INTERVAL_HOURS` previously had no applying code path — `crewState.ts`'s `getCrewPool()` generated a planet's pool once and cached it indefinitely, so a pool never refreshed for the rest of a session no matter how much time passed. **Fixed:** `getCrewPool(planetId, now?)` now compares `now - stored.lastRefreshedAt` against `CREW_POOL_REFRESH_INTERVAL_HOURS` and re-rolls via `refreshCrewPool()` once stale, the same fix applied to the shipyard/scanner pools' identical gap (`travel.md`).

## Testing Requirements

- `hireCrew()`: rejects a candidate not in the given pool; rejects at capacity; rejects insufficient funds; deducts the exact tier-scaled cost; produces a `CrewMember` with all timestamp fields correctly initialized to `now`.
- `assignToCraft()`: calls `craft()` exactly once with the crew member's tier; multiple simultaneous assignments (player + N crew) each resolve independently, verified via `tests/crew/simultaneity.test.ts` — not serialized.
- `resolveBackgroundCrafting()`: never trusts a caller-supplied elapsed duration (verified against an attempted override); correctly returns `resolved: false` only when `backgroundRate` is explicitly overridden to `null`; correctly resolves real production using the real default (`0.5`/hour) when no override is supplied; caps elapsed hours at `ELAPSED_TIME_CAP_HOURS`; caps `unitsCompleted` at `maxUnits` when supplied, defaults to unbounded when omitted.
- `payUpkeep()`: `"not-due"` before the interval elapses; `"insufficient-funds"` when the wallet can't cover it; deducts exactly `wageAmount` and updates `lastPaidAt` on success; a single call never pays more than one interval's worth even if several were missed.
- `checkAttrition()`: departs only past the grace period, measured from `lastPaidAt` not `hiredAt`; never random.
- `dismissCrew()`: rejects for a non-owning player; always succeeds for the actual owner.
- `purchaseCapacity()`: cost curve matches `CREW_CAPACITY_EXPANSION_BASE_COST * CREW_CAPACITY_EXPANSION_COST_MULTIPLIER^purchasedSlots` exactly; rejects insufficient funds.
- `refreshCrewPool()`: deterministic given a seed; correct pool size; only Orange/Gold candidates get a non-null profession, rolled from `TIER_6_7_PROFESSIONS`.
- **`getCrewPool()`'s stale-pool re-roll (`src/presentation/crewState.ts`) has no direct unit test.** Consistent with this codebase's existing convention that `src/presentation/*State.ts` modules aren't unit-tested directly (they import a module-level `saveSystem` singleton coupled to a real/browser storage backend at import time, same reason no `CrewScene.ts` test file exists either) — flagged honestly rather than silently uncovered. The underlying interval comparison is a plain, one-line numeric check; verified by code review and manual reasoning, not an automated test.
- **Regression** (`tests/crew/regressionCheck.test.ts`): `refine()`, `craft()`, `generateGalaxy()`, and `purchaseListing()` all produce byte-identical output to their pre-Crew-Core hand-calculated cases — confirmed via the full suite (677 tests as of this writing, zero failures).

## Definition of Done

- A player can hire a rolled candidate from a planet's crew pool, assign them to a craft action running simultaneously with their own and every other crew member's active craft, and see the exact same `craft()` output a solo player would get for the same tier/inputs. **Built and verified.**
- Wages come due on a fixed interval, a crew member departs deterministically (never randomly) if upkeep goes unpaid past the grace period, and a player can voluntarily dismiss a crew member they own at any time. **Built and verified.**
- Crew capacity starts small and expands via a real, escalating cost curve, spending from the same `Wallet` trading uses. **Built and verified.**
- Background/idle crafting's mechanism (elapsed-time-since-`lastCheckedAt`, capped, never caller-trusted) is fully built and tested, **and its output rate is resolved** (`BACKGROUND_IDLE_OUTPUT_RATE = 0.5`/hour) — no longer an open design question. `CrewScene`'s `> Check Background` action consumes and produces real inventory, capped by real material availability, matching what an active craft already does.
- `refine()`/`craft()`/galaxy generation/trading are provably unaffected by anything in this file, confirmed by the full suite's regression check, not just by code review.
- This file itself closes the documentation gap `ship.md` and `build.md` both flagged — Crew's TypeScript side is now consolidated in one place the same way every other functional area is, unblocking Crew's own eligibility in `docs/functional-agents/build.md`'s Unity migration readiness computation.
