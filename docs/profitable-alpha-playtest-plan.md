# Profitable — Alpha Playtest Plan

Structured scenarios for the playtesting pass in Section 2 of `product-alpha.md`. Each scenario has a specific thing to watch for and a specific number it maps back to — the goal is feedback that translates directly into a tuning-value change, not general impressions.

**How to use this:** play through each scenario, record what actually happened against what's expected, and use the capture template at the bottom for anything that felt wrong. Don't try to "solve" a bad number mid-session — just record it and move to the next scenario; batch the actual value changes into one pass afterward.

---

## Part A: Validate the Locked Systems (Refining, Crafting, Galaxy/Planets)

These already have exact numbers — this isn't about finding new values, it's about confirming the numbers *feel* right, since they were locked through design reasoning, not play.

**A1 — Refining variance feel.** Refine the same recipe (e.g., Radiant Alloy Bar) 5-10 times in a row with a Grey-tier refiner, then 5-10 times with a Gold-tier refiner. **Watch for:** does the Gold refiner's output feel meaningfully more consistent/higher-ceiling than Grey's, matching the ±10% base / narrowed-by-tier design? If Gold still feels random, the variance-narrowing table might need steepening.

**A2 — Crafting threshold penalty feel.** Craft the same recipe once with all inputs comfortably above threshold, once with one input 10-15 points below, once with one input 35-40 points below (near the rejection floor). **Watch for:** does the penalty escalation feel proportionate — mild at 10-15 points, seriously punishing near 40 — or does it feel too harsh/too forgiving at either end?

**A3 — Planet tier gathering feel.** Gather the same resource on a Grey-tier planet and a Gold-tier planet back to back. **Watch for:** is the difference in output quality obviously noticeable, making "which planet do I gather on" feel like a real decision?

**A4 — Specialty planet payoff.** Find a White-or-higher planet with a specialty resource, gather it several times. **Watch for:** does the specialty resource's +15 bonus feel like a genuine reason to seek out that specific planet, or does it get lost in normal variance?

---

## Part B: The Six Newly-Tuned Systems

**B1 — Trading drift.** List an item, then buy/sell several units of it back to back at the same planet. **Watch for:** does the ±2%/unit price movement feel meaningful within a single session, or is it too subtle to notice? Also check the floor/ceiling (50-150%) — try to push a price to its extreme via repeated trading and confirm it actually stops moving.

**B2 — Crew wage sustainability.** Hire 2-3 crew members across different tiers, let a full day (real or simulated) pass. **Watch for:** does the wage table (5-320 Cr/day by tier) feel sustainable against realistic early-game income from B1's trading, or does upkeep outpace what a new player can actually earn?

**B3 — Crew capacity cost curve.** Try to expand crew capacity past the base 2 slots. **Watch for:** does the 500→1000→2000→4000 Cr doubling curve feel like a meaningful progression goal, or prohibitively expensive too early?

**B4 — Travel time feel (the value we just fought to preserve).** Take a short hop (nearest-neighbor, ~1-1.5h at Grey tier) and a long cross-galaxy trip (~24-28h at Grey tier). **Watch for:** does the short hop feel like a quick errand and the long trip feel like a real commitment, without either feeling instant or tediously long? This is the system with the most recent, hardest-won correct number — worth extra attention to confirm it actually holds up in real play, not just the math.

**B5 — Ship tier speed payoff.** Travel the same route with a Grey-tier ship and then a Gold-tier ship (0% vs. 55% speed bonus). **Watch for:** is the difference obviously felt, making "invest in a better ship" feel worthwhile?

**B6 — Scanner value proposition.** Buy a scanner, dock at a discovered planet, use it. **Watch for:** given the original (preserved) base radius of 120 and bonus table up to +350 (effective max 470), does a scan reveal a meaningfully useful number of new planets, or too many/too few relative to the real galaxy's ~1000-unit coordinate spread?

**B7 — Travel Encounters frequency and mix.** Take several voyages (aim for at least 8-10 total windows crossed, which may mean several longer trips or one very long one). **Watch for:** does the 20% trigger chance with the 40/35/20/5 type split feel right — encounters happening often enough to matter, rare enough not to feel constant, and combat specifically feeling appropriately rare relative to the other three?

**B8 — Combat outcomes.** Deliberately trigger combat (via the encounter system) at least 3-4 times across different ship tiers. **Watch for:** does a well-equipped ship (strong weapon component) win more often than a weak one, matching the weapon-tier-vs-opponent-threat formula? Also specifically test a loss: does the component durability hit (15%) and crew unavailability (24h) feel like a real but non-devastating consequence, matching the "lightweight, not permanent" design intent?

**B9 — Hazard cost curve (the placeholder values specifically).** Trigger several hazard encounters (non-combat) across a range of outcomes. **Watch for:** the middle-band costs (100/200/350 Cr) were a reasoned completion, not a doc-specified value — do they feel like a smooth, believable progression from the 50 Cr floor to the 500 Cr ceiling, or does any one band feel like an outlier?

---

## Part C: Full-Loop Session

**C1 — One uninterrupted session, start to finish.** Play a single continuous session touching every system: gather → refine → craft → list/sell → travel → encounter (of any type) → hire crew → build/upgrade a ship. **Watch for:** does the overall pacing feel right — is there always something worth doing, or are there dead stretches (e.g., waiting on a long voyage with nothing else to occupy the session)? This is the one scenario that can't be captured by any single number — it's about the systems' *combined* rhythm, not any one tuning value.

---

## Feedback Capture Template

For anything that felt wrong in any scenario above, record:

- **Scenario:** (e.g., B4)
- **What happened:** (concrete — "24h trip felt like it dragged," not "travel is bad")
- **Specific value implicated:** (e.g., `DISTANCE_TO_TRAVEL_HOURS_PER_UNIT`, or a specific tier row in a table)
- **Suggested direction:** (e.g., "maybe 20-30% shorter for long trips specifically, short hops felt fine")

This format is what turns a playtest session into an actual set of number changes to bring back for the next tuning pass — vague impressions don't translate cleanly, specific "this value, this direction, this reason" does.
