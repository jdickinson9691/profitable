# Profitable — Alpha Scale & Performance Plan

Concrete plan for Section 3 of `product-alpha-plan.md`.

**Status: complete.** See `product-alpha.md` Section 3 for the full results. Two corrections to this plan found during execution, not treated as new design scope:
- The "21-item roster" reference below is stale — the real content roster grew to 60 resources during Section 1. Distribution was checked against the actual current roster instead.
- Test 2's "price-history log" and Test 4's "accumulated `Voyage.encounters` records" both describe structures that were never actually built this way once Trading (Phase 3 GDD §2.7, "always query live, never cache") and Travel Encounters' `removeVoyage()`-on-resolution behavior were locked in — there is no price-history log and no voyage/encounter history log anywhere in the codebase (grep-confirmed). Not a gap; this plan predated those later design decisions.

---

## Galaxy Size: 50 planets, fixed

Picking one number rather than the "40-60" range from the plan doc — a range isn't actually decidable, a specific number is. **50 planets**, generated once per new game via the existing seeded `generateGalaxy()` function, no changes to that function's logic or contract.

**Why 50 specifically, not 40 or 60:** it's large enough that the map genuinely can't be taken in at a glance (making the trade map, travel layer, and eventual scanner/discovery loop all feel like they're doing real work), while staying a round, easy-to-reason-about number for anyone tuning discovery pacing, travel distances, or market pool distribution against it. If alpha playtesting shows 50 feels too sparse or too dense, this is a one-line change to the galaxy-generation call — not a structural decision like the things `profitable-design-questions.md` locked.

**Distribution check:** with the resource roster now at 21 items across 4 Planet Types, and the percentage-based subset-selection table (Grey 20% → Gold 100%), 50 planets should produce a reasonable spread across all four Planet Types and all 7 tiers — worth confirming this empirically once generation runs against the real content roster (Section 1), not just asserting it should work.

---

## Performance Test Plan

The only scale-related bug found so far (Map's canvas/nav overflow) was caught at 2 planets — there's no evidence anything has been tested past that. This needs a dedicated pass before alpha, not an assumption that "it probably scales fine."

### Test 1: Full-galaxy map rendering
Generate the 50-planet galaxy, discover a meaningful subset (not all 50 — discovery is deliberate, per the Scanner design's whole premise), and render:
- The trade map's per-planet sell-cheap/buy-premium display
- The travel layer's per-planet computed travel time
- Both simultaneously, since Section 2.6 of the Travel/Map decisions made them one screen, not two

**Pass criteria:** no overflow (the specific class of bug already caught once), acceptable frame rate/responsiveness, and legible at a glance — not just "doesn't crash."

### Test 2: Realistic player-state load
Construct a test save state representing a "deep" player, not a fresh one:
- Several owned ships (3-5), each fully componentized
- A full crew roster at whatever alpha capacity cap Section 2's crew-capacity tuning lands on
- Many active listings (recommend testing at 50-100 simultaneous listings across planet + global markets)
- A price-history log that's been accumulating daily for a simulated 30+ in-game days, per item, per planet — this is the one most likely to silently balloon, since nothing has stress-tested it at all

**Pass criteria:** save/load remains fast, UI screens reading this state (market screens, price history graphs) remain responsive.

### Test 3: `getGlobalPrice()` at scale
This function scans across all planets currently selling/buying a given item on every call — worth specifically confirming it stays fast at 50 planets with real listing volume (Test 2's 50-100 listings), rather than assuming the live-query pattern that was correct in Phase 3 automatically stays fast as data grows. If this does show degradation, the fix is almost certainly a caching/indexing detail internal to Agent 11 — not a formula change, since the "always query live, never cache" *rule* itself (Section 2.7 of the Trading design) shouldn't be renegotiated for performance reasons without a real, measured problem to justify it.

### Test 4: Encounter/voyage volume
With Travel Encounters and Combat both now live, a long play session could accumulate many resolved `Voyage.encounters` records over time. Confirm this doesn't degrade voyage list rendering or save-file size unreasonably over a simulated extended session (recommend: simulate 20-30 voyages' worth of accumulated encounter history).

---

## Sequencing Note

This plan can't fully execute until Section 1's content roster is actually implemented — Test 1's "meaningful subset of discovered planets" and Test 2's "realistic player state" both need the real 21-resource, 45-recipe content set to be representative, not the current 3-resource proof-of-concept. Matches the plan doc's existing sequencing recommendation (content → tuning → scale/performance, roughly in parallel with tuning once content lands).
