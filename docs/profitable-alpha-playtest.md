# Profitable — Alpha Playtest: Setup & Screen-by-Screen Walkthrough

Companion to `profitable-alpha-playtest-plan.md` (the "what to test and why" doc — scenarios A1-C1, the feel questions, and the Feedback Capture Template all live there and are unchanged). This doc is the "how do I actually get there" doc: how to get the game into the state each scenario needs with the least friction, then exactly what to click, screen by screen, to run it.

**How to use these two docs together:** this doc's steps are grouped by scenario number (A1, A2, B1, ...) matching the plan doc exactly. Play through a step here, then flip to the plan doc's matching scenario for the actual "watch for" feel question and to record your answer in its Feedback Capture Template. This doc doesn't repeat those feel questions — only the setup and the literal clicks.

---

## Step 1: Get into debug mode

1. Run the dev server: `npm run dev`, then open `http://localhost:5173/?debug=1` (the `?debug=1` is required — without it the Debug tab and every shortcut below are simply not present, same as a real player would see). If you're testing the packaged Electron build instead, use its **Toggle Debug Mode** menu item and let it reload instead of the URL param — everything else below is identical either way.
2. You should see a **Debug** tab appended at the end of the nav bar (Map, Gather, Refine, Craft, Market, Global, TradeMap, Crew, Shipyard, Assembly, Settings, **Debug**). If it's not there, debug mode isn't active — check the URL param or menu toggle.
3. Click **Debug**, then click **`[ Re-seed playtest save ]`** (top of the panel, under "Playtest setup:"). This is the one action that gets you playtest-ready — it seeds, in one click:
   - **3 ships**, already at your starting planet: a Blue-tier all-rounder (`Playtest Runner`), a **Grey-tier** ship with no components installed (`Playtest Runner (Grey)`), and a **Gold-tier** ship with Gold components on all 4 slots (`Playtest Runner (Gold)`) — the Grey/Gold pair exists specifically for B5 and B8's tier-comparison scenarios.
   - **3 crew**: one Grey, one White, one Gold (with the Engineer profession).
   - **Inventory**: 40x Igneous Ore + 20x Autunite Crystal (enough raw material for up to 20 Radiant Alloy Bar refines — A1 asks for 5-10 at each of two refiner tiers), 3 pre-rolled Radiant Alloy Bar batches at different durability bands (comfortably above threshold, 12 points below, 38 points below) and 6x Hydrogen Gas (A2's threshold-penalty comparison, runnable immediately with no gather step), plus 30x Ferrite Ore (a second, independent chain — see A2's schematic-comparison note below).
   - **5 additional discovered planets** beyond your starting planet and its one auto-discovered neighbor (7 total). One of them (see A3 below) is deliberately a same-resource-type match at a contrasting tier to your starting neighbor, so A3 is actually runnable. Another (see B4 below) is deliberately the single farthest planet from your start in this galaxy, measured, not assumed.
   - **A scanner-ready pool** at your starting planet (guaranteed Grey + White scanners available for purchase at the Shipyard) — for B6.
   - This action is safe to click more than once (it won't duplicate ships/crew or claw back credits); use it any time you want to top the state back up mid-session.

   **Your starting planet itself** (no travel needed) produces Igneous Ore, Autunite Crystal, Ferrite Ore, and Hydrogen Gas among its own gatherable resources — the playtest galaxy seed was specifically picked so this is true (see below), meaning A1 and A2 are fully runnable by gathering fresh on **Gather** instead of relying on the pre-seeded inventory above, if you'd rather test the real gather→refine→craft loop end to end than use the shortcut.
4. If you also need credits beyond the seeded wallet (it starts with enough for one scanner purchase, one crew capacity expansion, and an 800cr trading cushion — B3's full 4-slot capacity curve costs 7,500cr total, well beyond that), click **`[ Add 5000 credits ]`** next to it. It only adds — never reduces your balance — so it's safe to click repeatedly.
5. Everything else on the Debug panel (the **Active TradeMap ship** switcher, the four **Force next voyage arrival to include an encounter** buttons, the tuning **[-]/[+]** steppers, **Reset all tuning to alpha defaults**) is explained inline where each scenario below actually needs it.

You're now set up to run every scenario in the plan doc without any grinding. The sections below walk each one through the actual screens.

---

## Part A: Locked Systems

### A1 — Refining variance

**Screen: Refine.**
1. In the recipe list, click **Radiant Alloy Bar** to select it (it turns gold; you'll see `Requires (Radiant Alloy Bar): Igneous Ore: 40/2 needed, Autunite Crystal: 20/1 needed` or similar).
2. Under "Refiner tier:", click **Grey** to select it.
3. Click **`> Refine`** 5-10 times in a row. Watch the quality-roll result under the button each time.
4. Under "Refiner tier:", click **Gold** to switch (no need to re-pick the recipe).
5. Click **`> Refine`** 5-10 more times.
6. Compare the two runs' spread per the plan doc's A1 question.

### A2 — Crafting threshold penalty

**Screen: Craft.**
1. Select the recipe that consumes Radiant Alloy Bar + Hydrogen Gas. The seeded inventory has exactly the 3 durability bands this scenario needs, in this order: comfortably-above threshold (75, 2 units), 12 points below (48, 2 units), 38 points below (22, 2 units). Inventory is consumed FIFO by resource, so your first 2 crafts draw from the 75-durability batch, the next 2 from the 48-durability batch, and the last 2 from the 22-durability batch — craft in that order and you'll hit all 3 bands automatically.
2. Pick any Crafter tier (this scenario is about the input-quality threshold penalty, not crafter tier — leave it on the default or Grey for consistency).
3. Click **`> Craft`** and read the result text — it names the rejection/penalty outcome via `describeCraftResult()`.
4. Repeat for each of the 3 pre-seeded durability bands.

**Bonus: testing "the available crafting schematics."** A schematic isn't something a player owns or unlocks in this build — it's a fixed content-table lookup by recipe (`content/schematics.json`, read directly in `CraftScene.doCraft()`), so a recipe either has one baked in or it doesn't. The recipe above (Ion-Forged Hull Plate) has a real **Blue**-tier schematic, so every craft of it is already exercising the schematic-tier bonus. For a direct side-by-side, craft **Iron Hull Plate** too — it's the one general recipe in the whole roster with **no** schematic (resolves to Grey/no-bonus). It needs 2x Iron Ingot (durability ≥ 40), which you get by selecting **Iron Ingot** on **Refine** (3x Ferrite Ore → 1 Iron Ingot; the seeded 30x Ferrite Ore is enough for up to 5 crafts). Compare the two recipes' output quality/ceiling — that's the schematic bonus made visible, without needing any ownership mechanic.

### A3 — Planet tier gathering feel (same resource, Grey vs. Gold)

**Screens: TradeMap → Gather.**

This scenario needs two *discovered* planets of the **same planet type** at contrasting tiers, sharing at least one producible resource. The playtest seed discovers a real pair: your starting planet's auto-discovered neighbor (**SuperEarth, Gold tier**) and a second, separately-discovered **SuperEarth, Grey tier** planet — the Grey one is barely a side-trip (well under 1h away). Both produce **Igneous Ore** (among other shared resources).

**Note (Planet Resource Generation, `profitable-design-questions.md`):** each planet-resource pair now has **one fixed quality**, rolled once at generation rather than re-rolled on every gather — gathering the same resource from the same planet repeatedly will return the *identical* result every time, not a spread. That's expected, not a bug; it's exactly what makes this comparison clean. One gather per planet is enough to see the difference.
1. Go to **TradeMap**, scroll the discovered-planets list to find the two SuperEarth entries (one Gold tier, one Grey tier).
2. Initiate a voyage to whichever one isn't your current location (Travel section → **`> Initiate Voyage`** next to its name). Wait for it to arrive (or see "Time-dependent scenarios" below if you don't want to wait in real time), then **`> Resolve Arrival`**.
3. Go to **Gather** and click **`> Gather Igneous Ore`** once; note the fixed quality shown.
4. Travel to the other SuperEarth (same steps) and gather Igneous Ore there too — again, one gather is enough.
5. Compare the two planets' output quality per the plan doc's A3 question.

### A4 — Specialty planet payoff

**Screens: TradeMap → Gather.**

**Same note as A3:** quality is fixed per planet-resource now, not rolled per gather — one gather per resource is enough to see the specialty bonus, not "several, to see if it gets lost in the noise." The plan doc's original A4 question ("does it get lost in *normal variance*?") was written against the old per-gather-roll model; there's no longer any gather-to-gather variance for it to get lost in at a single planet, so treat the comparison as: does the specialty resource's fixed quality read as a clear step up from a non-specialty resource's fixed quality on the *same* planet, not as a noisy-vs-consistent question.
1. Your starting planet's auto-discovered neighbor is a Gold-tier SuperEarth with a real specialty resource (Hydrogen Gas). Travel there (Initiate Voyage → Resolve Arrival, same as A3).
2. On **Gather**, the header shows `<tier> tier — specialty: <ResourceName>` — confirm it names the specialty.
3. Click **`> Gather <specialty resource>`** once and note its quality, then gather a non-specialty resource once and compare — no need to repeat either, both are fixed.
4. For extra variety, two more discovered planets have their own real specialties: a Terrestrial (Green tier, specialty Graphite Deposit) and another SuperEarth (Green tier, specialty Ammonia Gas) — both listed in the discovered-planets set from Step 1.

---

## Part B: The Six Newly-Tuned Systems

### B1 — Trading drift

**Screen: Market** (at any planet — the starting planet is fine).
1. Under "Sell from inventory," click **`> <Resource> x<qty> — list @ <price>cr/unit`** for a seeded batch to create a listing.
2. Under "Active listings," repeatedly click **`> Buy 1`** on that same listing (or another player-created one) and watch the price move — each unit should shift it by ±2%.
3. Keep buying/selling to try to push the price to its 50%/150% floor/ceiling and confirm it actually stops moving there.

### B2 — Crew wage sustainability

**Screen: Crew**, plus a time-elapsed step — see "Time-dependent scenarios" below before starting this one.
1. Your 3 seeded crew (Grey/White/Gold) are already hired. Note each one's `wage <cr>cr` in the "Your crew:" list (5/10/320 respectively, per the doubling wage table).
2. Advance time by ~24-48h (see below), then return to **Crew**. Click **`> Pay Upkeep`** for each member and read the status line each time ("Paid Xcr upkeep" or "Not enough credits to pay upkeep").
3. Weigh the total upkeep paid against what B1's trading actually earned you in the same stretch.

### B3 — Crew capacity cost curve

**Screen: Crew.**
1. Note `Capacity: <hired>/<max>` at the top.
2. Click **`> Purchase Slot`** repeatedly (topping up credits with the Debug panel's **`[ Add 5000 credits ]`** button as needed between purchases — the curve is 500 → 1,000 → 2,000 → 4,000cr, 7,500cr total for all 4).
3. Judge the doubling curve's feel per slot, not just in total.

### B4 — Travel time feel

**Screen: TradeMap.**

The playtest seed's farthest discovered planet from your start is measured (not assumed) at **~22h** at Grey tier — close to the plan doc's own "~24-28h" illustrative example for a long trip.

1. In the Travel section, compare the listed `<h>h` travel time next to your nearest discovered neighbor (should read ~1-3h at Grey tier) against your farthest discovered planet (should read ~22h at Grey tier).
2. Initiate the short hop first, resolve it, gather the immediate "was that quick?" impression, then do the long trip and gather the "did that feel like a commitment?" impression. Use the Grey-tier seeded ship for both, so speed tier isn't a confound (that's B5, next).

### B5 — Ship tier speed payoff

**Screens: Debug → TradeMap.**

TradeMapScene's Travel section only ever acts on your *first* owned ship — there's no ship picker anywhere in the normal game UI, so with 3 ships owned (as the seed gives you) there was previously no way to test a specific one. The Debug panel's **"Active TradeMap ship"** section (added for exactly this) fixes that: it lists all your owned ships with `[ACTIVE]` marking whichever one TradeMap will use, and a **`[ Make Active ]`** button next to each of the others.

1. On **Debug**, under "Active TradeMap ship," confirm **Playtest Runner (Grey)** is `[ACTIVE]` (click its `[ Make Active ]` button if it isn't).
2. On **TradeMap**, initiate a voyage to a discovered destination and note the `<h>h` travel time, then resolve/cancel your interest in actually completing it (or just let it run — you don't need to wait for it if you're only comparing the *displayed* estimate, though resolving it for real is more representative).
3. Back on **Debug**, click **`[ Make Active ]`** next to **Playtest Runner (Gold)**.
4. On **TradeMap**, initiate a voyage to the *same* destination and compare its `<h>h` figure against Grey's (0% vs. 55% speed bonus, i.e. Gold's travel time should be roughly 45% of Grey's for the same distance).
5. Judge whether the difference is "obviously felt" per the plan doc's question.

### B6 — Scanner value proposition

**Screens: Shipyard → TradeMap.**
1. On **Shipyard**, under "Scanners for sale:", click **`> Purchase`** on the Grey or White scanner (guaranteed available — the playtest seed pins a scanner-pool seed specifically so this isn't a gamble).
2. On **TradeMap**, make sure your ship is docked (no active voyage/pending combat), scroll to the Scan sub-section, and click **`> Scan`**. Read the result: "Scan complete — newly discovered: ..." or "no new planets found within range."
3. Judge whether the number of newly-discovered planets feels meaningfully useful.

### B7 — Travel Encounters frequency and mix

**Screen: TradeMap**, plus the **Debug** panel's force-encounter buttons, plus a time-elapsed consideration — see "Time-dependent scenarios" below. Each *voyage* rolls one encounter-check window per 24h of travel time it covers, so reaching the plan doc's "8-10 total windows crossed" means either one very long voyage or several medium ones added together — not a single short hop.
1. To observe the **natural** 20% trigger rate and 40/35/20/5 type mix (not a forced one), just take several real voyages back-to-back and resolve each arrival normally, tallying how many included an encounter and of which type, until you've crossed roughly 8-10 total 24h windows.
2. To specifically **inspect one type's content** without waiting for a natural roll, go to **Debug**, click one of the four **`[ Trade Opportunity ]` / `[ Discovery ]` / `[ Hazard ]` / `[ Combat ]`** buttons *before* clicking **`> Resolve Arrival`** on TradeMap for a voyage that has already arrived — this forces that specific voyage's arrival to include that type of encounter (its inner details — credits granted, which resource, hazard roll, opponent tier — still roll for real). This is a one-shot flag; it only affects the very next `Resolve Arrival` click.
3. Use forced encounters to quickly sample each of the 4 types' content/wording once each, then rely on natural voyages for the actual frequency-and-mix feel question (a forced sample can't tell you whether the *natural rate* feels right — that only comes from real rolls).

### B8 — Combat outcomes

**Screens: Debug → TradeMap.**
1. As in B5, use the Debug panel's **"Active TradeMap ship"** section's **`[ Make Active ]`** buttons to switch which of your ships TradeMap acts through — B8 needs both **Playtest Runner (Grey)** (weak-weapon case: no components installed) and **Playtest Runner (Gold)** (strong-weapon case: Gold components on all 4 slots) tested across different ship tiers.
2. With the desired ship active, take (or already have) a voyage that's arrived. On **Debug**, click **`[ Combat ]`**, then on **TradeMap** click **`> Resolve Arrival`** — this surfaces a pending-combat prompt at the top of the Travel section (red text via `describePendingCombat`) with exactly two buttons: **`> Attack`** and **`> Flee`**.
3. Run this at least 3-4 times across the two ship tiers, comparing win rates and outcomes.
4. Specifically test a **loss** at least once (Attack with the Grey/no-component ship against a forced Combat encounter is the easiest way to get one) and check both the component durability hit (15%, visible on **Assembly**'s per-component tier readout after) and crew unavailability (24h, visible on **Crew**'s status column) per the plan doc's question.

### B9 — Hazard cost curve

**Screens: Debug → TradeMap.**
1. Same forced-encounter mechanic as B7/B8: click **`[ Hazard ]`** on Debug, then **`> Resolve Arrival`** on TradeMap for an arrived voyage.
2. Repeat several times (each forced Hazard still rolls its own real pass/fail and cost band internally) to sample across the 50/100/200/350/500cr band range, and judge whether the middle bands (100/200/350) feel like a smooth progression or an outlier per the plan doc's question.

---

## Part C: Full-Loop Session

### C1 — One uninterrupted session

No special setup beyond Step 1's seed — this scenario is explicitly about *not* using shortcuts mid-session, to feel the systems' combined rhythm. Suggested screen order for one full pass: **Gather** → **Refine** → **Craft** → **Market** (list/sell) → **TradeMap** (initiate a voyage) → **Crew** (hire/assign while the voyage is in flight) → **Shipyard/Assembly** (buy or upgrade something) → back to **TradeMap** to resolve the voyage and handle whatever encounter comes up. Use the Debug panel's force-encounter buttons here too if you want to guarantee this pass touches an encounter rather than leaving it to the natural 20% roll.

---

## Time-dependent scenarios (B2, B7): how to advance time without a stopwatch

B2 and B7 are the only two scenarios that depend on real elapsed time (wage due dates, voyage arrival times, and encounter-check windows are all computed from real timestamps, not turns). The plan doc's own B2 wording already anticipates this — "let a full day (real or simulated) pass" — so this isn't a missing debug feature, it's a technique:

**Advance your system clock forward**, play/resolve what you need, then set it back afterward. This works identically for the dev server and the packaged Electron build, since both just read the real OS clock. A few things will move forward with it as a side effect — trading listings (72h expiry), seasonal cycles (12h), and planet-market emergencies (24h check interval) will all have jumped too — that's expected and harmless for a debug session, not a bug to report.

If you'd rather not touch the system clock, the alternative is to genuinely leave the game open and come back after real time has passed — slower, but zero side effects on other systems' state.

---

Once you've been through the scenarios above, go record what felt off in `profitable-alpha-playtest-plan.md`'s Feedback Capture Template — this doc's job ends at "you were able to get into the right state and click the right things."
