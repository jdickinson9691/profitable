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
