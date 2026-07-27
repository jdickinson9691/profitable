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
