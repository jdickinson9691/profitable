# Profitable — Alpha Starting Tuning Values

Concrete starting numbers for Section 2 of `product-alpha-plan.md`. These are **starting values for the tuning pass, not final balance** — the whole point of Section 2 is that these get adjusted through actual play. But every value needs *a* number to playtest against, and right now several systems have none at all.

**Correction to the plan doc:** Refining, Crafting, and Galaxy/Planets were listed as needing tuning, but all three already have exact, locked numbers in `profitable-design-questions.md` — full variance tables, penalty curves, and modifiers, not examples. They need playtesting *validation* (does -0.5%/+15% at Gold refiner tier actually feel right?), not new numbers invented here. The systems below genuinely have no starting values yet.

**Self-correction (2026-07-29):** the Ships/Travel distance-scaling constant and Scanner's base radius/radius-bonus table, below, were originally proposed here as new numbers (1.0 and 50/+0→+80 respectively) — but both were actually already implemented and already live-verified during Phase 5's real browser testing, a fact this doc got wrong by guessing without checking first. Investigation (real `generateGalaxy()` output, `src/presentation/README.md`'s Phase 5/Scanner live-playtest notes) confirmed the *existing* values (0.01 and 120/+0→+350) were the grounded ones; this doc's proposed replacements would have made a live-verified 5.56h trip take ~23 days. Both sections below have been corrected back to the existing, real values, with the reasoning inline.

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
| Starting Credits | 500 |

**Starting Credits (2026-08-04):** never previously documented or tuned here — discovered as an undocumented implementation artifact during Unity migration parity work. `STARTING_CREDITS = 500` has lived in `src/presentation/tradingState.ts` since Agent 13's own original Trading Presentation implementation (commit `c1f078b`, 2026-07-26), untouched since, but was never entered into this doc alongside the rest of Trading's starting values above. Unity's own port had drifted to 100 — a genuine "port, don't redesign" violation, not a deliberate divergence — corrected to match the real TS source exactly. 500 is accepted as the working value without further tuning here, since it was implicitly validated by the already-completed and accepted feel-tuning playtest pass: no playtester ever flagged ship affordability as an issue while this value was live in the TS/Electron build.

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

**Distance-to-travel-time scaling constant:** 0.01 hours per distance unit (1 distance unit = 0.01 hours) — **already implemented and live-verified**, not a new number. Corrected 2026-07-29: this doc originally proposed 1 distance unit = 1 hour as a "simplest possible starting constant," but that was an ungrounded guess made without checking the existing implementation. Investigation found `DISTANCE_TO_TRAVEL_HOURS_PER_UNIT = 0.01` was already live-verified during Phase 5's real Chrome browser playtest (`src/presentation/README.md`, Agent 22 manual playtest section): a real 741.27-unit hop between two generated planets, at Blue-tier speed, produced a hand-verified 5.56h trip. Real `generateGalaxy()` output across multiple 50-planet seeds confirms 0.01 lands in a reasonable range throughout — nearest-neighbor hops ~1-1.5h, typical any-two-planet trips ~10-11h, and even the observed max distance at zero speed bonus ~24-28h (~1.2 days), never approaching a week. The originally proposed 1.0 would have turned that same verified 5.56h trip into ~23 days, and the max trip into 100+ days. Kept at 0.01; not changed.

**Shipyard pool:** 3 ships per planet, refreshed every 24 hours.

## Scanner

**Base radius:** 120 distance units — **already implemented and live-verified**, not a new number. Corrected 2026-07-29: this doc originally proposed 50 (to stay "consistent" with the distance-scaling constant above), but that reasoning inherited the same ungrounded-guess problem as the 1.0 distance constant it was derived from. `SCANNER_BASE_SCAN_RADIUS = 120` paired with the tier radius bonus table below (max effective radius 470) was already live-verified in Phase 5/Scanner's real browser playtest (`src/presentation/README.md`) against real generated planet distances. Kept at 120; not changed.

**Tier radius bonus** (additive, reusing the schematic-contribution table's shape) — kept at its original, already-implemented values (not changed to match the rejected 50-base proposal):

| Tier | Radius bonus |
|---|---|
| Grey | +0 |
| White | +40 |
| Green | +80 |
| Blue | +130 |
| Purple | +190 |
| Orange | +260 |
| Gold | +350 |

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

## Ship Fuel, Cargo Hold Capacity, Planet Resource Generation, Ship Crew Roles

**Status: design-only, zero implementation — not yet part of the buildable Alpha loop.** Unlike every system above, these four were locked in `profitable-design-questions.md` *after* the rest of this document was written, and none has a line of code behind it yet (`docs/functional-agents/ship.md`, `planet.md`, `gathering.md` carry the forward-looking contracts). Transcribed here now so this doc stays the single place every originated default lives, per its own stated purpose — not a signal that implementation has started.

**Fuel capacity by ship tier** (reuses Scanner's tier-bonus delta shape on a 150 base):

| Tier | Fuel capacity |
|---|---|
| Grey | 150 |
| White | 190 |
| Green | 230 |
| Blue | 280 |
| Purple | 340 |
| Orange | 410 |
| Gold | 500 |

**Fuel cost per distance unit:** 0.03 (not tier-modified — sized so even Grey tier's capacity covers this galaxy's maximum possible distance, ~85 fuel at ~2,828 units, with headroom).

**Refuel cost:** 2 Cr per fuel unit (a full refuel from empty costs at most 300 Cr at Grey tier, comparable to Grey-tier ship/scanner purchase costs).

**Cargo hold capacity by tier** (max total item quantity across a voyage's `cargo` array):

| Tier | Cargo capacity |
|---|---|
| Grey | 5 |
| White | 8 |
| Green | 12 |
| Blue | 18 |
| Purple | 25 |
| Orange | 35 |
| Gold | 50 |

**Planet resource reset interval:** 168 hours (7 days) — long enough that a planet's resource identity feels stable across a normal session, short enough that the galaxy's economy genuinely shifts over a longer campaign.

**Per-Resource Quantity Cap by planet tier** (built 2026-08-05, adding a gradient on top of the existing binary colonist gate — max units of a given resource a planet offers per reset cycle; the starting-planet tutorial guarantee's 3 resources are exempt entirely, uncapped, matching their existing quality-clamp treatment):

| Tier | Quantity cap |
|---|---|
| Grey | 20 |
| White | 35 |
| Green | 50 |
| Blue | 75 |
| Purple | 110 |
| Orange | 160 |
| Gold | 230 |

Originated default (roughly doubling curve, same shape as this document's other tier tables), starting-value-not-final like every number in this section — not yet exercised by a real feel-tuning playtest pass.

**Crew slots by ship tier** (Pilot / Combat-Engineer-or-Science-Officer / Systems Engineer / Crafter; "both" means the either-or slot becomes two independent slots):

| Tier | Pilot | Combat Eng. / Sci. Officer | Systems Eng. | Crafter | Total |
|---|---|---|---|---|---|
| Grey | 1 | 1 (either) | 1 | 1 | 4 |
| White | 1 | 1 (either) | 1 | 1 | 4 |
| Green | 1 | 1 (either) | 1 | 2 | 5 |
| Blue | 1 | 2 (both) | 1 | 2 | 6 |
| Purple | 2 | 2 (both) | 1 | 2 | 7 |
| Orange | 2 | 2 (both) | 2 | 2 | 8 |
| Gold | 2 | 2 (both) | 2 | 3 | 9 |

**Explicitly NOT decided — pending, not defaulted to anything:** the 5 ship-crew-role modifier *magnitudes* (Pilot's speed-bonus table, Combat Engineer's mitigation %, Science Officer's radius bonus, Systems Engineer's repair rate, the Crafter role's per-profession effect size). `profitable-design-questions.md`'s Ship Crew Roles section fixes *which* system each role affects, deliberately leaving *how much* for whoever implements this — do not invent numbers for these here or anywhere else without a real design pass, the same discipline this document already applies to Refining/Crafting/Galaxy-Planets' locked values (see the correction note at the top of this file).

---

## Note on This Being a Starting Point, Not a Conclusion

Every number above was chosen for *internal consistency* (reusing existing shapes, matching existing cadences, following the doubling pattern already established for cost curves) rather than through actual play. The whole point of Section 2's tuning pass is to take these into a real playtest and adjust — this document exists so that pass has real numbers to start from, not a blank page.
