# src/data/constants

Owned by the **Data Schema Agent** (GDD §5.2, agent 1).

The tier/formula constant tables from GDD §3, encoded as typed data — not
scattered as magic numbers through logic:

- 7-tier color breakpoints (Grey/White/Green/Blue/Purple/Orange/Gold, §3.1)
- Refiner/crafter tier variance table (§3.2)
- Refund chance table, keyed to output tier (§3.2)
- Threshold penalty curve (§3.3)
- Schematic tier contribution table — ceiling raise, variance narrowing,
  penalty forgiveness (§3.3)

No other module may hardcode a number that belongs in one of these tables —
it imports the constant instead (GDD §5.3).

**Status:** all GDD §3 constant tables are now defined: `tierColor.ts` (7-tier
breakpoints), `tierVariance.ts` (shared refiner/crafter variance), and
`refundChance.ts` (keyed to output tier), plus `penaltyCurve.ts` (threshold
penalty bands, with a `multiplier: null` 41+ band meaning "reject"),
`schematicTier.ts` (ceiling raise / variance narrowing / penalty forgiveness
per tier, plus the standalone `COMBINED_CEILING_CAP = 0.18` constant), and
`quality.ts` (`QUALITY_MIN`/`QUALITY_MAX` = 1/100, GDD §3.1's universal
quality range — the single source `clamp()` calls in `src/simulation` read,
instead of each hardcoding `1, 100` separately).

Every table here was cross-checked against the GDD's literal text (not just
against itself) — see `tests/simulation/refine.test.ts` and
`craft.test.ts`'s per-tier `TIER_VARIANCE`/`REFUND_CHANCE`/
`SCHEMATIC_TIER_CONTRIBUTION` assertions, which hardcode expected values
independently of these files so a typo here would be caught.

**Phase 2 amendment:** `planetTypeEligibility.ts` (`PLANET_TYPE_ELIGIBILITY`
— a hard filter per Planet Type, not a bias), `planetTierModifier.ts`
(`PLANET_TIER_MODIFIER`, whose neutral point is **Green**, not Grey like
every other tier table — a planet isn't a skill investment; also exports
`SPECIALTY_QUALITY_MODIFIER = 15`), and `resourceSubsetPercentage.ts`
(`RESOURCE_SUBSET_PERCENTAGE`, by planet tier). Same independent-assertion
test pattern applies — see `tests/data/phase2Constants.test.ts`.

**Phase 3 amendment:** `tradingConfig.ts` — the trading loop's tunable
scalars, all explicitly documented as starting defaults rather than locked
values (per the design doc's own framing): `LISTING_EXPIRY_HOURS` (72),
`BASELINE_DRIFT_PERCENT` (0.02), `PRICE_FLOOR_PERCENT`/`PRICE_CEILING_PERCENT`
(0.5/1.5), `GLOBAL_MARKET_MARKUP_PERCENT`/`GLOBAL_MARKET_DISCOUNT_PERCENT`
(0.1/0.1), `TRANSACTION_FEE_PERCENT` (0.05), and
`GLOBAL_LISTABLE_MAX_ITEM_TIER`/`MAX_ITEM_TIER` (5/7 — the item-tier range
that `Resource.itemTier` validates against). Same independent-assertion test
pattern — see `tests/data/phase3Constants.test.ts`.

Also `PRICE_RECOVERY_PERCENT_PER_HOUR` (0.01) — added while implementing
Agent 11 (Trading Core), not part of the original amendment: `applyRecovery`
needs its own tunable rate distinct from `BASELINE_DRIFT_PERCENT` (which
GDD §2.6 ties specifically to per-unit-traded volume, not elapsed time), and
none existed. Added here, the single source every trading formula reads,
rather than embedded in Agent 11's own logic file.

**Phase 4 amendment:** `crewConfig.ts` — unlike Phase 2/3, the design doc
gives almost no example numbers for these (only the elapsed-time cap has a
documented "24-48 hours" range), so most values here are originated
defaults rather than formalized examples — same latitude Agent 14 used
for Phase 3's base prices. `BASE_CREW_CAPACITY` (2),
`CREW_CAPACITY_EXPANSION_BASE_COST`/`_MULTIPLIER` (200 / 1.5),
`CREW_HIRE_COST_BY_TIER` and `CREW_WAGE_BY_TIER` (both 7-row tables,
strictly increasing by tier — wage always cheaper than hire cost at every
tier), `WAGE_PAYMENT_INTERVAL_HOURS` (24), `UPKEEP_GRACE_PERIOD_HOURS` (48),
`CREW_POOL_SIZE_PER_PLANET` (3), `CREW_POOL_REFRESH_INTERVAL_HOURS` (24),
and `ELAPSED_TIME_CAP_HOURS` (48, the documented example range's upper
bound). Tested for structural invariants (positive, monotonic by tier)
rather than hardcoded "expected" values nobody ever specified — see
`tests/data/phase4Constants.test.ts`.

**`BACKGROUND_IDLE_OUTPUT_RATE` is deliberately `null`, not a number** —
the amendment's own contract explicitly forbids guessing this one: the
exact idle-vs-active output rate is still an open design question, not
merely an unspecified tunable. Agent 16 must treat it as "not yet
available," not default to a guessed fraction.

**Phase 5 amendment:** `shipsAndTravelConfig.ts` — like Phase 4, the design
doc documents the *shape* of each table without example numbers, so these
are originated defaults, not formalized examples.
`DISTANCE_TO_TRAVEL_HOURS_PER_UNIT` (0.01) converts raw Euclidean distance
between two planets' `{x,y}` positions into a base travel time in hours —
chosen so the maximum possible distance under `generateGalaxy.ts`'s
`POSITION_RANGE` (±1000, i.e. a ~2828-unit corner-to-corner diagonal)
yields a base travel time (~28 hours) in the same tens-of-hours range
every other Phase 4 timing tunable already uses.
`SHIP_TIER_SPEED_MODIFIER` is a 7-row table of per-tier
`travelTimeMultiplier`s, strictly decreasing from Grey (`1.0`, exactly
baseline — no bonus) to Gold (`0.45`, "meaningfully faster" per the design
doc) — tested for the monotonic-decrease invariant, not hardcoded
absolute values nobody specified.
`SHIPYARD_POOL_SIZE_PER_PLANET` (3) and `SHIPYARD_POOL_REFRESH_INTERVAL_HOURS`
(24) mirror Phase 4's `CREW_POOL_SIZE_PER_PLANET`/`CREW_POOL_REFRESH_INTERVAL_HOURS`
exactly, applied to ships instead of crew. Tested for structural
invariants (positive, monotonic by tier) — see `tests/data/phase5Constants.test.ts`.

**`SHIP_PURCHASE_COST_BY_TIER` — a necessary completion.** Agent 20's
contract requires `purchaseShip()` to deduct "the appropriate cost (cost
curve is a tunable, same pattern as NPC crew acquisition)," but the GDD's
own Section 3 constant list never names this table. Added here, keyed by
the ship's *derived* tier, same tier-scales-cost shape as
`CREW_HIRE_COST_BY_TIER`, scaled up to reflect a whole ship being a bigger
investment than a single crew hire.

**Travel Encounters (Non-Combat) amendment:** 6 more additions to
`shipsAndTravelConfig.ts` — like the rest of that file, the design doc
documents the *shape* of each value without example numbers, so these are
originated defaults, not formalized examples. Tested for structural
invariants — see `tests/data/travelEncountersConstants.test.ts`.
- `ENCOUNTER_CHECK_WINDOW_HOURS` (24) / `ENCOUNTER_TRIGGER_CHANCE` (0.15)
  — "same shape as the existing emergency system." Deliberately fresh
  constants rather than importing `EMERGENCY_CHECK_INTERVAL_HOURS`/
  `EMERGENCY_TRIGGER_CHANCE` from `tradingConfig.ts` — Ships/Travel and
  Trading are separate domains, and duplicating two numbers with a
  documented rationale is a smaller cost than a cross-domain constant
  dependency between otherwise-unrelated systems.
- `ENCOUNTER_TYPE_WEIGHTS` — `tradeOpportunity`/`discovery` split evenly
  at 0.4 each, `hazard` at 0.2 (the design doc's own "hazard weighted
  lowest" requirement; nothing in the doc favors trade-opportunity over
  discovery specifically, so those two split the remainder evenly).
- `ENCOUNTER_TRADE_OPPORTUNITY_MIN_CREDITS`/`_MAX_CREDITS` (20/150) — a
  currency-grant range scaled to feel like a modest windfall relative to
  the existing economy (a Grey-tier ship costs 300cr).
- `HAZARD_PASS_THRESHOLD` (50) and `HAZARD_SHIP_TIER_MODIFIER` (a 7-row
  additive roll-bonus table, Grey `+0` — the floor, not a penalty — up to
  Gold `+30`, strictly increasing by tier) — "a single roll against a
  fixed threshold, modified by ship tier."
- `HAZARD_BASE_FAILURE_COST` (30) and `HAZARD_FAILURE_COST_CURVE` — "the
  same escalating curve shape as the crafting threshold penalty":
  mirrors `PENALTY_CURVE`'s exact 10-point band boundaries (minus the
  0-points/"reject" bands, neither of which apply to a failure-only
  curve — a hazard failure always resolves to some real cost).

**Scanner/Probe amendment:** 5 more additions to `shipsAndTravelConfig.ts`
— same "shape, not example numbers" situation as the rest of this file, so
these are originated defaults. Tested for structural invariants — see
`tests/data/scannerConstants.test.ts`.
- `SCANNER_POOL_SIZE_PER_PLANET` (3) / `SCANNER_POOL_REFRESH_INTERVAL_HOURS`
  (24) — mirror `SHIPYARD_POOL_SIZE_PER_PLANET`/
  `SHIPYARD_POOL_REFRESH_INTERVAL_HOURS` exactly, applied to scanners'
  own pool rather than merged into `ShipyardPool` (GDD §2.2's explicit
  call-out).
- `SCANNER_PURCHASE_COST_BY_TIER` — a 7-row cost table, strictly
  increasing by tier, scaled below `SHIP_PURCHASE_COST_BY_TIER` (a whole
  ship is the bigger investment) but above `CREW_HIRE_COST_BY_TIER` (a
  scanner is equipment the player keeps indefinitely, not a
  recurring-wage hire).
- `SCANNER_BASE_SCAN_RADIUS` (120) — same `{x,y}` distance units as
  `Planet.position` (range ±1000 per axis, per `generateGalaxy.ts`'s
  `POSITION_RANGE`), chosen as a modest fraction of that space.
- `SCANNER_TIER_RADIUS_BONUS` — a 7-row table of per-tier
  `radiusBonus`es, strictly increasing from Grey (`0`, the floor, not a
  penalty) to Gold, "reusing the shape of the schematic-tier
  contribution table."
