# src/crew

Owned by the **Crew Core Agent** (Phase 4 GDD §4.1, agent 16).

Pure, framework-agnostic TypeScript implementing crew hiring, assignment,
background production, upkeep, and attrition — the Phase 4 equivalent of
what `src/trading` was for Phase 3. Same architectural mandate: zero
Phaser/DOM/browser API. Reuses `src/simulation`'s `craft()` (called once
per simultaneous crafter, never duplicated) and `getTierColor()` (for
rolling a candidate's tier, same pattern as `src/galaxy`'s
`rollPlanetTier()`).

- `refreshCrewPool.ts` — `refreshCrewPool()` (§2.3): rolls
  `CREW_POOL_SIZE_PER_PLANET` candidates via the shared tier breakpoint
  table; a tier 6-7 (Orange/Gold) candidate also gets a rolled profession
  placeholder (see below).
- `hireCrew.ts` — `hireCrew()` (§2.3/§2.4): rejects at capacity or on
  insufficient funds, deducts the tier-scaled hire cost, removes the
  candidate from its pool, creates a live `idle` `CrewMember`.
- `assignToCraft.ts` — `assignToCraft()` (§2.1/§2.5): calls `craft()` once,
  using the crew member's own tier as `crafterTier`.
- `resolveBackgroundCrafting.ts` — `resolveBackgroundCrafting()` (§2.1a):
  derives elapsed time from `currentTime - lastCheckedAt` (never a
  caller-supplied duration), caps it at `ELAPSED_TIME_CAP_HOURS`, and
  calls `craft()` once per completed unit.
- `payUpkeep.ts` / `checkAttrition.ts` / `dismissCrew.ts` — §2.6/§2.7:
  wage deduction, grace-period departure, and voluntary dismissal. No
  random/chance element anywhere in attrition.

## Necessary completions and corrections beyond Agent 16's literally-specified signatures

Same category as `src/trading`'s own necessary completions — documented
here rather than silently made:

- **Every function takes the actual data (`CrewMember`/`PlanetCrewPool`/
  `CrewCapacity`/`Wallet`/`CraftAction`) instead of an ID into an implicit
  store.** The contract's literal signatures (`hireCrew(candidateId,
  playerId)`, `assignToCraft(crewMemberId, craftAction)`, etc.) all imply a
  hidden registry a pure function can't have — the same purity
  requirement, and the same resolution, as Agent 11's `purchaseListing()`/
  `getGlobalPrice()`.
- **`PlanetCrewPool.availableHires` is `CrewCandidate[]`, not
  `CrewMember[]` as the Phase 4 amendment literally typed it.** A pool
  candidate hasn't been hired yet, so `CrewMember`'s required
  `hiredByPlayerId`/`hiredAt`/`wageAmount`/`lastPaidAt` fields have no real
  values to hold — fabricating placeholder values to force-fit the letter
  of the amendment would be worse than the type-correction itself. See
  `crewCandidate.ts`. This is a genuine field-type *correction*, not a
  pure addition — flagged as such rather than folded quietly into the
  usual "necessary completion" framing.
- **`HireResult`, `AssignResult`, `BackgroundResult`, `PaymentResult`,
  `AttritionResult`, `DismissResult`, and `CraftAction` are new types**,
  named by Agent 16's contract but never defined by the Phase 4 amendment.
  `HireResult`/`AssignResult`/`BackgroundResult` mirror the existing
  `CraftResult`/`PurchaseResult` discriminated-union pattern, since a
  rejected hire, a not-yet-available background rate, etc. are normal
  business outcomes the caller must always handle, not exceptional cases.
- **`hireCrew()`/`payUpkeep()` check wallet sufficiency and reject if the
  player can't afford it.** Agent 11's `purchaseListing()` never added
  this check (a known, separately-documented gap in `src/trading`) — since
  "deducts the cost" only makes sense here if there's something to deduct
  from, this agent adds the check rather than repeating that gap. Phase
  3's code is not retroactively modified to match.
- **Profession has no mechanical effect on `craft()` yet.** The contract
  says `assignToCraft()` calls `craft()` "using this crew member's
  tier/profession as the crafter input," but `craft()`'s real signature
  has no profession parameter, and no recipe-to-profession eligibility
  mapping exists anywhere (both depend on the still-undecided profession
  taxonomy — see `profession.ts`). `assignToCraft()`/
  `resolveBackgroundCrafting()` pass only `tier` to `craft()`; profession
  stays a purely informational label on the `CrewMember` for now. Binding
  it to specific recipes is future work once the taxonomy exists, not
  something to invent here.
- **`refreshCrewPool()`'s rolled profession is a clearly-labeled
  placeholder** (`"unspecified-profession-N"`), not invented lore — the
  real taxonomy is an open design question (§2.2's own follow-on note),
  and this project's convention is to mark a pending value as pending,
  not guess content for it.
- **`resolveBackgroundCrafting()`'s `backgroundRate` parameter defaults to
  `BACKGROUND_IDLE_OUTPUT_RATE` (currently `null`) but is injectable**,
  mirroring this codebase's existing injectable-with-a-default pattern
  (`RandomFn`, `now`). A real caller with no override correctly hits the
  "not yet available" result; tests can still exercise the full
  computation by supplying an explicit rate.
- **`purchaseCapacity.ts`, added while implementing Agent 18.** Agent
  18's contract requires a UI "option to purchase additional capacity"
  (Phase 4 GDD §2.4), but Agent 16's own contract never listed a
  corresponding function — §2.4 decided the mechanic, `agent-16-crew-
  core.md`'s Outputs section just never included it. Since Agent 18 must
  never implement crew logic itself, this function lives here, not in
  presentation: the Nth purchased slot costs
  `CREW_CAPACITY_EXPANSION_BASE_COST * CREW_CAPACITY_EXPANSION_COST_MULTIPLIER^N`,
  matching `crewConfig.ts`'s own documented curve, and rejects on
  insufficient funds the same way `hireCrew()`/`payUpkeep()` do.

## Boundary confirmed

`src/simulation/refine.ts`, `craft.ts`, everything under `src/galaxy/`,
and everything under `src/trading/` are untouched by this agent —
confirmed via `git status` and via `tests/crew/regressionCheck.test.ts`
re-running the exact hand-calculated cases already proven correct
pre-Phase-4.
