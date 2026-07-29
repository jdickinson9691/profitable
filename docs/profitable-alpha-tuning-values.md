# Profitable — Alpha Starting Tuning Values

Concrete starting numbers for Section 2 of `product-alpha-plan.md`. These are **starting values for the tuning pass, not final balance** — the whole point of Section 2 is that these get adjusted through actual play. But every value needs *a* number to playtest against, and right now several systems have none at all.

**Correction to the plan doc:** Refining, Crafting, and Galaxy/Planets were listed as needing tuning, but all three already have exact, locked numbers in `profitable-design-questions.md` — full variance tables, penalty curves, and modifiers, not examples. They need playtesting *validation* (does -0.5%/+15% at Gold refiner tier actually feel right?), not new numbers invented here. The systems below genuinely have no starting values yet.

---

## Trading

Already had reasonable example values proposed during design — recommend locking these as the actual alpha starting point rather than re-deriving:

| Value | Starting number |
|---|---|
| Baseline drift | -2% per unit sold, +2% per unit bought |
| Price floor/ceiling | 50% / 150% of base price |
| Global market markup (buy) | +10% |
| Global market discount (sell) | -10% |
| Transaction fee | 5% |
| Listing expiry | 72 hours |

## Crew

No numbers previously proposed — new starting values, using a doubling-per-tier pattern for consistency with the wage/cost scaling already used elsewhere (acquisition cost curves):

**Wage (Credits/day):**

| Tier | Wage |
|---|---|
| Grey | 5 |
| White | 10 |
| Green | 20 |
| Blue | 40 |
| Purple | 80 |
| Orange | 160 |
| Gold | 320 |

**Capacity expansion cost:** base capacity 2; each additional slot doubles — slot 3: 500 Cr, slot 4: 1,000, slot 5: 2,000, slot 6: 4,000.

**Upkeep grace period:** 48 hours (two full daily cycles, giving a real buffer before attrition triggers).

## Ships/Travel

**Ship tier speed modifier** (% reduction in travel time — a new table, since only the *shape* — "reuse the variance table pattern" — was previously decided, not the numbers):

| Tier | Speed bonus |
|---|---|
| Grey | 0% |
| White | 5% |
| Green | 10% |
| Blue | 18% |
| Purple | 28% |
| Orange | 40% |
| Gold | 55% |

**Distance-to-travel-time scaling constant:** 1 distance unit = 1 hour base travel time (simplest possible starting constant — easy to scale uniformly later if travel feels too fast/slow overall).

**Shipyard pool:** 3 ships per planet, refreshed every 24 hours.

## Scanner

**Base radius:** 50 distance units (same coordinate scale as the travel-time constant above — worth keeping these two numbers consistent with each other, since both interpret the same `{x,y}` coordinate space).

**Tier radius bonus** (additive, reusing the schematic-contribution table's shape):

| Tier | Radius bonus |
|---|---|
| Grey | +0 |
| White | +10 |
| Green | +20 |
| Blue | +30 |
| Purple | +45 |
| Orange | +60 |
| Gold | +80 |

**Pool:** 2 scanners per planet, refreshed every 48 hours (rarer than ships, matching scanners' role as a bigger investment).

**Cost curve** (doubling, same pattern as crew capacity): Grey 200 Cr, White 400, Green 800, Blue 1,600, Purple 3,200, Orange 6,400, Gold 12,800.

## Travel Encounters (Non-Combat)

**Trigger chance per window:** 20% (slightly higher than the emergency system's 15%, since this covers a broader category — three non-combat types plus combat sharing one roll).

**Type-weight distribution:** trade-opportunity 40%, discovery 35%, hazard 20%, combat 5% (combat's 5% was already set in Combat's own section as "presumably lower than hazard" — this fixes the other three around it).

**Trade-opportunity currency grant:** 50-200 Credits (random within range).

**Hazard failure cost:** reuses the crafting penalty curve's escalating shape, in Credits — base cost 50 Cr at the mildest fail tier, scaling up to 500 Cr at the worst.

## Combat

**Arrival-triggered combat check chance:** 10% (separate from the travel-window roll's 5% combat weight above — arrival is a distinct, one-time check per dock, not a per-window roll, so a somewhat higher chance still keeps overall combat frequency low).

**Component durability damage:** **15%** — already implemented and live-verified (`COMBAT_COMPONENT_DURABILITY_DAMAGE_PERCENT = 0.15`, confirmed via the 76→65 test case and 51→43 live verification). No change needed; documenting here for completeness since every other value in this doc is new.

**Crew `unavailableUntil` duration:** 24 hours — matches the daily cadence used everywhere else in this design (drift windows, emergency windows, encounter windows), so a combat loss's crew consequence resolves on the same rhythm as everything else a player checks daily.

---

## Note on This Being a Starting Point, Not a Conclusion

Every number above was chosen for *internal consistency* (reusing existing shapes, matching existing cadences, following the doubling pattern already established for cost curves) rather than through actual play. The whole point of Section 2's tuning pass is to take these into a real playtest and adjust — this document exists so that pass has real numbers to start from, not a blank page.
