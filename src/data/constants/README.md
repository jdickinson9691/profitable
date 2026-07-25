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
penalty bands, with a `multiplier: null` 41+ band meaning "reject") and
`schematicTier.ts` (ceiling raise / variance narrowing / penalty forgiveness
per tier, plus the standalone `COMBINED_CEILING_CAP = 0.18` constant).
