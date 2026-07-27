# Profitable — Open Design Questions

Derived from the executive summary draft. Organized by subsystem since answers in one area constrain the others.

**MVP Scope (decided):** the first vertical slice is a hardcoded single planet with 2-3 resource types, validating the quality-roll system, one refining recipe end-to-end, and one crafting recipe + schematic end-to-end. Galaxy/planet generation, the trading loop, crew crafters, travel, and the galactic map are all explicitly **post-MVP**, per the decided development order: galaxy generation → planet generation → resource generation → crafting recipes/schematics → trading loop → crafters → travel → map.

## Resources & the 5 Qualities

**Decided:**
- The 5 qualities are: **purity, density, potency, durability, rarity**.
- Qualities are universal (every resource type has all 5 defined), but not every quality is *applicable* to every resource type — e.g., gases would not have durability. Non-applicable qualities are represented as **null/NA in data, not zero** (zero would misleadingly imply "worst possible quality" rather than "doesn't apply"). If a recipe references a quality that's null/NA on one of its inputs, that reference **does not influence the crafting formula or output at all** — it's excluded from the calculation entirely, not treated as zero and not invalidating the input.
- Each quality is a **numeric value from 1-100**, mapped to a **7-tier color structure**: grey, white, green, blue, purple, orange, gold.
- Tier breakpoints (gradual curve):

| Tier | Range | Width |
|---|---|---|
| Grey | 1-40 | 40 |
| White | 41-60 | 20 |
| Green | 61-75 | 15 |
| Blue | 76-85 | 10 |
| Purple | 86-91 | 6 |
| Orange | 92-96 | 5 |
| Gold | 97-100 | 4 |

- Qualities roll **randomly** on gathering. Roll is further **modified by the planet** the resource is gathered from (set at planet generation) — full mechanics deferred to a future **Planets** section.
- All 5 qualities matter, but not every recipe requires all 5 — recipes will have **quality score requirements** per input (full mechanics defined under Crafting & Recipes/Schematics).
- The 5 qualities **persist for all items at every tier** — raw, refined, and crafted (tiers 1-7) all carry the same 5 qualities. No conversion into a separate stat system; no relabeling.
- **Color tier display differs by tier band:**
  - **Tiers 1-2 (raw/refined):** each of the 5 qualities gets its **own individual color tier**.
  - **Tiers 3-7 (crafted):** the 5 qualities are **aggregated into a single overall color tier**, used to represent the item's rarity/quality at a glance and to help determine its sell value in the market.
- Sell value for crafted items is intended to be driven by this same quality data (via the aggregate color tier), rather than a separate parallel value system.

## Refining

**Decided:**
- Refining is **n:1** — multiple units of a resource combine into one refined output (e.g., 2 iron ore → 1 iron bar). This also extends to **multiple different resources** as inputs to one refined output (e.g., 2 iron bars + 1 coal → 1 steel bar).
- Output quality is influenced by input quality: **higher-tier input resources increase the potential for higher-tier output**, rather than guaranteeing a 1:1 pass-through.
- Working formula: **Option A — Weighted average with variance.** Output quality = average of input qualities (weighted by quantity if inputs differ), then a random +/- variance is applied. **Mixed-quality/mixed-resource inputs combine via straight average** (weighted only by quantity, not skewed toward best/worst input) — chosen because the already-decided threshold penalty separately handles punishing weak individual inputs, so weighting toward worst would duplicate that mechanism; straight average also keeps the first step of an already multi-stage formula simple. If a single standout input should matter more later, that's better handled via schematic bonus or crafter tier rather than the base combination math. **Variance is percentage-based: ±10% of the input average** (not a flat point range) — this scales naturally with the uneven tier-band widths (grey is 40 points wide, gold is only 4), so variance doesn't feel irrelevant at the bottom or disproportionately punishing at the top. This base ±10% is then narrowed by refiner tier (per the variance-reduction mechanic already decided) — e.g., a grey-tier refiner keeps close to the full ±10%, a gold-tier refiner narrows it substantially, making top-tier crafting more reliable in skilled hands.
- Refiners **have a skill/level system**, using the **same 7-tier color scale as resource quality**, and higher-tier refiners get bonuses to output via **variance reduction / ceiling raise**: refiner tier narrows the negative side of the variance roll and/or raises the achievable ceiling above what inputs alone would allow.
- **Working refiner/crafter tier variance table** (applies to both Refining and Crafting — an asymmetric adjustment to the base ±10% variance, narrowing the downside more than it extends the upside, so bad luck becomes rare at high tiers while good luck becomes more possible, not just more likely):

| Tier | Negative side | Positive side |
|---|---|---|
| Grey | -10% | +10% |
| White | -8% | +10% |
| Green | -6% | +10% |
| Blue | -4.5% | +11% |
| Purple | -3% | +12% |
| Orange | -1.5% | +13% |
| Gold | -0.5% | +15% |

This same table applies to **crafter tier** in the unified crafting formula as well, keeping the two production roles mechanically consistent.
- **No loss/waste** — refining yield is 100%, with one exception: **quality can increase effective yield via a chance of material refund**. Above a quality threshold, each refining action has a chance to refund 1 (or more) of the consumed input units, scaling with input/refiner quality tier. **Working refund chance curve**, keyed to the tier the refining formula's *output* actually lands on (post-variance, post-refiner-tier) rather than the raw input tier — so a skilled refiner consistently landing near gold output gets rewarded even from mediocre inputs:

| Tier | Refund chance (per consumed unit) |
|---|---|
| Grey | 0% |
| White | 0% |
| Green | 5% |
| Blue | 10% |
| Purple | 15% |
| Orange | 20% |
| Gold | 25% (plus a secondary ~20% chance the refund is 2 units instead of 1) |
- Refining **cannot fail** — no failure chance, no degraded/salvage outcome. Given the inputs, refining always succeeds.

## Crafting & Recipes/Schematics

**Decided:**
- Recipes are **not fixed to specific materials**. Instead, a recipe specifies a **category + recommended quality threshold** per input (e.g., "metal bar, durability 60+"). Inputs below the recommended threshold are still usable, but reduce the quality of the crafted output, via **scaled penalty below threshold** (penalty multiplier scaling with how far below threshold an input falls). **Working penalty curve** (escalating, with a hard floor):

| Points below threshold | Output penalty multiplier |
|---|---|
| 0 (at/above threshold) | 1.0 (no penalty) |
| 1–10 | 0.95 |
| 11–20 | 0.85 |
| 21–30 | 0.70 |
| 31–40 | 0.50 |
| 41+ | **Hard floor — input rejected**, craft cannot proceed with this input |

The penalty steepens the further below threshold an input falls (5% → 10% → 15% → 20% per 10-point band), rather than a flat linear slope, and a hard rejection past 40 points below threshold keeps the recipe's category+threshold system meaningful rather than letting the penalty asymptote toward zero. This penalty is applied **last** in the crafting formula (see unified formula below), after crafter/schematic influence, and can be softened but not bypassed by the schematic's forgiveness bonus.
- Schematics are **unique items in their own right** — discoverable and purchasable from planetary markets, not just permanent unlocks.
- Schematic rarity mechanic: **bonus modifier**. The base recipe/output ceiling is the same regardless of schematic tier, but higher-tier schematics grant a bonus to the crafting formula (reducing the threshold penalty, or improving the variance roll). Rewards owning a higher-tier copy of the same schematic without changing its ceiling. **Working schematic tier contribution** (additive, stacking on top of crafter tier's shared asymmetric variance table, but deliberately smaller in scale — a schematic is closer to equipment than to a skill investment):

| Tier | Ceiling raise (+ to positive side) | Variance narrowing (- to negative side) | Threshold-penalty forgiveness |
|---|---|---|---|
| Grey | +0% | -0% | 0% |
| White | +1% | -0.5% | 5% |
| Green | +2% | -1% | 10% |
| Blue | +3% | -1.5% | 15% |
| Purple | +4% | -2% | 20% |
| Orange | +5% | -2.5% | 25% |
| Gold | +6% | -3% | 35% |

**Forgiveness mechanic:** reduces the effective "points below threshold" before the penalty curve table is applied (e.g., a gold schematic's 35% forgiveness turns a 20-points-under input into an effective ~13-points-under) — softens but never fully erases the penalty, consistent with the earlier decision that great crafters/schematics can't fully compensate for bad inputs.

**Combined cap:** total combined ceiling raise from crafter tier (up to +15% at gold) plus schematic tier (up to +6% at gold) is **capped at +18% combined**, not +21% — keeps a maxed crafter + maxed schematic best-in-class without making input quality nearly irrelevant at the top of the game.
- Crafting **has randomness**, influenced by both **input resource quality** and **crafter skill** — not fully deterministic.
- **Working unified crafting formula** (combines input quality, threshold penalty, schematic bonus, and crafter skill into one pass):
  1. **Base average:** `base_avg` = weighted average of input qualities (Option A, same as Refining).
  2. **Ceiling raise:** crafter skill tier and schematic tier **both raise the achievable ceiling above `base_avg`, additively**. Crafter tier's contribution uses the **same asymmetric variance table as Refining** (see Refining section — narrows the downside, extends the upside by tier); schematic tier's contribution is a separate additive bonus on top of that.
  3. **Variance roll:** a random +/- variance is rolled around the raised ceiling; the *width* of that variance is narrowed by crafter skill tier (via the shared table) and schematic tier, also additively.
  4. **Threshold penalty (applied last):** *after* the roll from steps 1-3 produces a raw output value, apply the scaled penalty for under-threshold inputs — reduced by the schematic's forgiveness bonus. A great crafter and great schematic **cannot fully compensate for under-threshold inputs**, since the penalty is applied after their influence.
  5. `output = clamp(final penalized value, 1, 100)`
- Crafter skill is **not** a single universal skill — there will be **defined crafting skills/professions specifically for tier 6 and 7 crafters**. Lower tiers (3-5) may use a more general/shared skill, with specialization kicking in at the higher tiers.

**Ideas for unique/special schematics (beyond the standard tiered set), kept for reference:**
- Unique/named schematics with fixed bonus properties, found via rare events/exploration.
- Planet-locked schematics (ties to Planets section).
- Degrading/limited-use schematics, consumed after N uses.
- Schematic fragments that must be combined to unlock the full recipe.
- Player-discovered variants from unusual crafting quality combinations.

## Galaxy & Planet Generation

**Status: MVP complete, this is the active phase.** The MVP used one hardcoded planet (Delta Rigelus) with no modifiers, seasons, or tier — deliberately thin, per Agent 1's minimal `Planet` type. This section is where that gets replaced with real generation.

**Carried over from Resources & Qualities:** qualities roll randomly on gathering, further modified by the planet the resource is gathered from — full mechanics were deferred to here.

**Carried over from Trading Market:** seasons (for the eventual galactic trade map) are determined at planet generation, based on the planet's tier — planet tier itself is now resolved (see Decided below).

### Decided

- **Planet tier quality roll modifier:** a flat additive modifier applied to the base 1-100 roll before clamping, tied to the same 7-tier structure used everywhere else:

| Planet Tier | Quality Roll Modifier |
|---|---|
| Grey | -15 |
| White | -8 |
| Green | +0 |
| Blue | +8 |
| Purple | +15 |
| Orange | +22 |
| Gold | +30 |

`rollQuality()` rolls 1-100 as normal, then this modifier is added before the final clamp to 1-100. Unlike the refiner/crafter/schematic tables (where Grey = no bonus, since those represent skill/equipment investment with a real zero state), **Green is the neutral point here** — a planet isn't something you level up, it's just a place, and most places should be unremarkable. Grey planets carry a genuine penalty, making Gold-tier planets real destinations worth traveling for (ties into the same exploration/exclusivity theme as tier 6-7 crafted goods and unique schematics). The scale is roughly double the refiner/crafter tables' spread since it stacks with (not replaces) those modifiers — a flatter planet modifier would barely register once refiner/crafter/schematic bonuses are also in play.
- **Planet tier determination:** planet tier is assigned via a **random roll (1-100) at generation time, mapped through the existing tier breakpoint table** (Grey 1-40 / White 41-60 / Green 61-75 / Blue 76-85 / Purple 86-91 / Orange 92-96 / Gold 97-100) — the same mechanism already used everywhere else (`getTierColor()`), rather than inventing a separate planet-rarity system. Because the tier bands are unequal width, this naturally produces mostly Grey/White/Green planets with rare Gold ones, without needing a separately designed distribution curve. Also keeps the color-tier mental model consistent for players across resource quality, refiner/crafter skill, and now planet quality.
- **Resource distribution across planets:** each planet has a **subset** of producible resources (matches the MVP's `Planet.producibleResourceIds` list shape — a list, not a "produces everything" flag), not a universal "every planet produces everything" model. This creates real reasons to explore/trade, consistent with the exclusivity theme already used for tier 6-7 crafted goods and unique schematics.
- **Planet type system (governs which resource categories are eligible on a given planet):** adapted from **NASA's real exoplanet classification system** (public-domain science, not fictional IP) rather than an invented or franchise-borrowed system. NASA groups exoplanets into four types — Gas Giant, Neptunian, Super-Earth, and Terrestrial — which map cleanly onto composition, and therefore onto which of the game's resource categories (solid/gas/crystal) a planet can produce:

| Planet Type (NASA-based) | Eligible Resource Categories |
|---|---|
| Terrestrial | Solid, Crystal |
| Super-Earth | Solid, Crystal, (occasionally Gas) |
| Neptunian | Gas, Crystal (icy) |
| Gas Giant | Gas |

  Planet Type is a **hard filter** on eligible categories, not a bias — a Gas Giant cannot roll a solid resource. Within the eligible categories for a given planet, a **random subset** of actual resources is drawn to populate that planet's `producibleResourceIds` list, and **the size of that subset scales with planet tier** (a Grey-tier Terrestrial world might get 1-2 solid/crystal resources; a Gold-tier one might get most or all of them) — giving tier a second axis of value (selection, not just quality roll) and reinforcing "Gold planets are real destinations" without a separate mechanic. Planet Type also sets up "specialties" (still open below) as a natural next layer rather than a competing system.
- **Resource subset selection rule:** subset size is **percentage-based (not a flat count)**, scaled by planet tier, applied against the number of resources eligible for that planet's type — consistent with the ±10% percentage-based approach already used for refining/crafting variance, so the rule doesn't need re-tuning as the resource roster grows:

| Planet Tier | % of eligible resources available |
|---|---|
| Grey | 20% |
| White | 35% |
| Green | 50% |
| Blue | 65% |
| Purple | 80% |
| Orange | 90% |
| Gold | 100% (all eligible) |

  `count = max(1, ceil(percentage × number_of_eligible_resources_for_this_planet_type))` — the `max(1, ...)` floor guarantees no planet ever has zero producible resources, and Gold at 100% means a Gold-tier planet of a given type is guaranteed to have every eligible resource for that type. **Selection within that count is a uniform random draw, no weighting** — there's no "common vs. rare resource" flag in the data model yet (only category and quality qualities), so weighting isn't possible without adding one; that would be a separate, smaller decision on the `Resource` type itself if wanted later.
- **Galaxy structure:** a **fixed, finite set of planets generated once** (not an infinitely expandable/streaming procedural system) — a fixed count is far simpler to test and balance, and nothing in the current design requires live/on-demand generation. Each planet gets a **simple position (e.g., x/y coordinate) at generation time**, even though travel is still post-MVP — cheap to add now, expensive to retrofit later, same reasoning as building the `NetworkAdapter` stub before multiplayer was in scope. **No formal "region" data structure yet** — a flat list of planets, each with a coordinate, is sufficient; regions/sectors (if wanted later, e.g. for trade map flavor) can be derived from coordinates after the fact rather than requiring a hierarchy to be designed now.
- **Planet specialties (Option A — per-resource specialty):** planets **tier White or higher** get exactly **one** specialty resource, randomly selected from their eligible pool, which receives a **flat +15 quality modifier** on top of the planet's regular tier modifier — roughly one full planet-tier step, so a specialty feels like "this planet is effectively one tier better, but only for this one resource." **Grey-tier planets never get a specialty**, keeping Grey genuinely unremarkable (consistent with Grey also having no refund chance and a quality penalty elsewhere in the design). Solves the "does the specialty always make it into the random subset" problem via a **reserved-slot rule** rather than inflating the subset count: the specialty is selected first, occupies one of the slots the existing percentage-based count formula already produces (unchanged), and the remaining `count - 1` slots are filled via the normal uniform random draw from the eligible pool minus the already-placed specialty. This keeps subset size a pure function of tier — a specialty planet doesn't quietly produce more resources overall than a non-specialty planet of the same tier, only a better version of one.
- **Planet tier scope: gathering only.** Planet tier's mechanical effect (the quality roll modifier, and the specialty bonus) applies **exclusively to the gather roll** — the refining and crafting formulas remain planet-agnostic, with no additional planet-tier stacking on top of the already-capped crafter tier + schematic tier (+18% combined). This keeps each tier system scoped to one job (planet tier → resource generation, refiner tier → refining, crafter/schematic tier → crafting), avoiding a fourth stacking modifier that would complicate an already carefully-tuned cap. Planet tier still drives real strategic decisions — better planets produce better raw inputs, which then flow through the unchanged downstream formulas — it just doesn't get re-applied at every step. Where to build refining/crafting operations becomes a logistics/convenience question (proximity, travel time, market modifiers) rather than a formula question.
- **Generation seed and naming:** galaxy/planet generation is **seeded by default**, consistent with Agent 2's existing contract requirement that every random function (`rollQuality`, `refine`, `craft`) be seedable/deterministic for testing — treating galaxy generation as an exception to that rule would be an inconsistency, not a stylistic choice. If no seed is supplied, one is generated randomly and **stored** (not discarded) so the resulting galaxy can be reproduced later — this also gives deterministic testing and debugging for free, and leaves room for a future "share this galaxy" or "new game with code" feature without re-architecting. **Name generation is explicitly deferred** — unlike the seed, it's pure content/flavor with zero mechanical dependencies (nothing else in the design reads or reasons about a planet's name), so building a real procedural name generator now would be scope creep. Use placeholder-style names for now (e.g., `"Planet-{id}"` or a short hardcoded list) to unblock generation logic; a real name generator can be its own isolated task later.
- **Discovery state:** a simple `discovered: boolean` field is added to the `Planet` type now, defaulting to `false` for every planet except the starting planet — same reasoning as the position/seed fields: cheap to add at generation time, more disruptive to retrofit onto every existing planet record once the trade map actually needs it later. The field carries **no behavior yet** — nothing reads or acts on it until travel/map features exist — it's just present and ready for when they do.
- **Planet generation attributes needed beyond the MVP's minimal type:** with tier, Planet Type, quality-modifier data, position/coordinate, and discovery state now decided above, the `Planet` type's full MVP-of-this-phase shape is settled — no remaining open attribute questions.

**Section status: all open questions resolved.** Galaxy & Planet Generation is ready to move from design into agent contracts.

## Trading Market

**Decided:**
- Markets are **per-planet**, not a single global/unified market. Each planet's market has **modifiers for what that planet wants/buys and what it sells**.
- The market will **expand beyond the four item tiers to also include crafters themselves** — specifically, **hiring an NPC crafter to join your crew** (not a one-off service listing or schematic/skill access sale). Full mechanics deferred.
- **Two-tier market model:** a **global/overall market** accessible everywhere (no travel required) exists alongside per-planet markets, but does **not** offer the best buy or sell prices.
  - **Global market scope:** players can only **list/sell tiers 1-5** on the global market, but can **buy any tier 1-7** there. Tiers 6-7 are **sell-restricted to planet markets** as an intentional exclusivity design choice.
  - **Global market pricing:** prices are **live**, and are **influenced by planet market activity** — **now given a concrete mechanism**, see "Global price mechanism" under Newly Decided (Trading Loop phase) below.
  - **Buy/sell model:** for players, markets (both global and planet) are a **direct buy/sell option**, not an auction/bid system (unless refined further later).
  - **No AI NPC merchants (for now):** no auto-buy mechanism — items listed need an actual buyer. Explicitly a **post-launch feature**.
- To address the challenges tier 6-7 exclusivity raises (discoverability, dead inventory, market saturation, new-player accessibility), the working solution is a **galactic trade map**:
  - Each discovered planet shows what it **sells cheap** and what it **buys at a premium**.
  - **Three layers of change drive the map's data:**
    1. **Baseline drift (continuous):** fluctuations from actual player buy/sell activity — **now given concrete shape**, see "Baseline drift / soft-cap pricing" under Newly Decided (Trading Loop phase) below.
    2. **Seasons (slow, predictable):** each planet has a recurring cycle, **determined at planet generation based on the planet's tier**, that swings its buy/sell lists on a schedule.
    3. **Emergencies (rare, sudden):** randomly-triggered events announced on the map, **purely random** — not caused by simulation/economy state.
  - Undiscovered planets are fogged until visited/scouted; a scanner/map upgrade could extend range or data freshness.

**Status: Phase 2 (Galaxy & Planet Generation) complete — this is the active phase next.** The questions below were previously deferred to "Can Wait Until After MVP"; they're promoted here now that the trading loop is the current milestone per the decided development order.

### Open questions

- Warning/lead time for emergencies, and how map data ages/goes stale for planets you're not actively at.
- (All Trading Market open questions are now resolved — see Newly Decided below. Nothing remains open in this section.)

### Newly Decided (Trading Loop phase)

- **Currency: single, universal currency** (e.g., "Credits") across all markets — global and per-planet, all tiers 1-7. This is the only option compatible with the already-decided "live pricing, influenced by planet activity" mechanic, which requires one shared price axis to track drift/seasons/emergencies against; a barter/resource-backed model would need its own separate exchange-rate system layered on top, effectively reinventing currency without calling it that. **Regional price variance is already covered by the per-planet market modifiers** (already decided) rather than needing a second, separate currency-exchange mechanism — a planet-specific buy/sell modifier on a single currency achieves the same "prices differ by location" effect without the added complexity of multiple currencies.
- **Listing lifecycle (Option B — expire and return, not indefinite or auto-discounting):** a listing that finds no buyer **expires after a set duration** (a tunable number, e.g. ~72 in-game hours — not locked, just a reasonable starting point) rather than sitting forever (which would worsen the dead-inventory problem already flagged for tier 6-7 exclusivity) or auto-discounting toward a sale (which would functionally reintroduce an auction/price-discovery mechanic, undoing the already-decided direct buy/sell model). **Where the item goes on expiry depends on market type:** a **planet market** listing is **held at that planet for pickup** — consistent with the physical-presence theme already built into planet markets, so a player has to return to collect what didn't sell, same as they had to be there to list it. A **global market** listing returns **straight to inventory**, since the global market is accessible everywhere and there's no physical "there" to hold it at.
- **Remote tier 6-7 sales (Option C — remote allowed, but only to discovered planets, item travels):** a player can remotely initiate a tier 6-7 sale to any planet they've already **discovered** (reusing the `discovered` boolean already on the `Planet` type from Phase 2 — no new field needed), rather than requiring physical presence for every sale (which would worsen dead-inventory risk) or allowing fully remote/instant sale anywhere (which would undermine the tier 6-7 exclusivity design entirely). The item **travels rather than teleporting** — it isn't listed/sellable at the destination until it arrives. **Exact travel time mechanics are deferred to the Travel milestone**, per the decided development order; this decision only establishes that a delay exists and that discovery is the gating requirement, not the specific duration or any in-transit risk (e.g., piracy). Once the item arrives, it becomes a normal planet-market listing subject to the listing lifecycle rule above (72-hour expiry, pickup at that planet).
- **Baseline drift / soft-cap pricing:** rather than building a separate soft-cap mechanism alongside "baseline drift," **baseline drift itself is defined as the soft cap** — same reasoning as rejecting "weighted toward worst" for refining because the threshold penalty already covered that job; doubling up on one problem with two mechanisms is avoided here too. Concretely: each unit sold into a planet's market drops that item's price by a **percentage of its current price** (e.g., -2% per unit, within a rolling window), and each unit bought raises it similarly — percentage-based, consistent with the ±10% variance and tier percentage tables used elsewhere, so the effect is naturally diminishing (each successive unit moves the price less in absolute terms than the last, since the drop compounds against an already-lower number). A **floor and ceiling** (e.g., 50%–150% of the planet's base price for that item) directly prevents both "one seller crashes the price to zero" and "one planet becomes an infinite sink" — the curve flattens as it approaches either bound rather than needing a separate hard cutoff rule. Prices **drift back toward base over time** when untraded, so a temporarily crashed/inflated price doesn't stay that way forever — also gives the market-news-ticker idea (already logged above) something concrete to report on ("prices at [Planet] are recovering"). Exact percentage, window, and floor/ceiling values are left as tunable numbers, not locked.
- **Multiple planets can buy the same tier 6-7 category** — demand is not one-planet-per-item-type. This directly avoids the single-point-of-failure risk already flagged for tier 6-7 exclusivity (one planet's price crash being the only outlet for an entire category), and costs nothing new to build since each planet already tracks independent price/drift state — multiple planets wanting the same category is just more instances of a mechanism that already exists, not a new one. Consistent with the trade map's per-planet buy list already implying planets differ in what they want, which naturally allows overlap rather than a strict galaxy-wide partition. **Follow-on idea, not yet decided:** which planets buy which tier 6-7 categories could reasonably be driven by **Planet Type** (the same lever already used for raw resource eligibility in Phase 2) — e.g., a mining-flavored planet buying weapons/tools at a premium — worth revisiting once the trade map's specific buy/sell lists are fleshed out.
- **Global price mechanism:** the global price for any item is **derived directly from live planet prices, not tracked as a separate rolling average or independent feed.** Global buy price = the **lowest current sell price** across all planets currently selling that item, **plus a fixed markup** (e.g., +10%). Global sell price = the **highest current buy price** across all planets currently buying that item, **minus a fixed discount** (e.g., -10%). This **structurally guarantees** the already-decided "global never offers the best price" rule by construction — there's no way for the global price to accidentally beat a planet's price, since it's defined as that price plus a penalty. It also **reuses existing pricing data** rather than needing new state: baseline drift, seasons, and emergencies already move individual planet prices live, so the global price just reads the current best planet price at query time (a filter over existing per-planet market data, not a new data structure), meaning any of those three change-layers automatically and correctly propagates to the global market with no extra mechanism needed. Exact markup/discount percentages are left as tunable numbers, not locked.
- **Listing quality representation:** market listings are **bucketed by a single derived "market tier"** — a straight average of the item's 5 qualities, mapped through the existing tier table — rather than exact-match stacking (nearly every unit rolls a unique 5-axis combination, which would flood the market with unbrowsable singleton listings) or bucketing across all 5 axes independently (up to 7⁵ buckets, defeating the purpose of bucketing at all). This reuses the same straight-average-to-tier formula already used for crafted items' tiers 3-7 aggregate color, just applied one step earlier for market display/stacking purposes only. **The underlying item instance keeps its full, real 5-quality data** — the market tier is a display/stacking convenience, not a data transformation; when an item is actually refined or crafted, the formulas read its true per-quality values, not the market bucket it happened to list under. **Known tradeoff:** two listings in the same bucket (e.g., both "Blue") can have meaningfully different individual quality profiles that average to the same tier — a buyer optimizing for one specific quality axis won't see that difference from the listing alone; this is an accepted cost of keeping listings simple and browsable.
- **Listing model confirmed: direct fixed-price listings**, not an order book or NPC price-discovery system — this was effectively already implied by two prior decisions ("markets are a direct buy/sell option, not an auction/bid system" and "no AI NPC merchants, items need an actual buyer"), now stated explicitly. A player creates a fixed-price listing (sell X units at price Y); any other player can accept it at that listed price — no bidding, no negotiation. This is what makes the listing lifecycle (72-hour expiry, pickup/return) and market tier bucketing meaningful mechanics, rather than a different model (an order book) that wouldn't need either. **Partial purchases are allowed** — a buyer can purchase part of a listing's quantity (e.g., 5 of a stack of 12); the listing stays active with the remainder until it hits zero or expires, rather than being all-or-nothing.
- **Price history:** tracked now — a timestamped log of price points per item per planet, generated as a natural byproduct of the baseline drift/seasons/emergencies mechanisms already computing live prices. Costs almost nothing to store, and directly feeds the price-history-graph idea already logged under market-driver flavor/communication.
- **Market manipulation — partially resolved now, detection logic deferred to multiplayer:** three cheap structural choices made now rather than deferred entirely, since retrofitting them once multiplayer exists would be far more disruptive than building them in from the start (same reasoning as the seed/position/discovered-flag decisions):
  1. **Self-trade prevention:** a listing's creator cannot purchase their own listing — a no-op in single-player, but the rule already exists in the formula layer for when multiplayer arrives.
  2. **Trade attribution:** every listing records which player entity created it — trivial in single-player (always "the player"), but this is the field that makes manipulation *detectable* later (repeated trades between the same accounts, coordinated pumping) without needing a data migration once multiplayer ships.
  3. **The already-decided soft-cap/floor-ceiling baseline drift mechanism is the primary defense against price-cycling exploits** — stated explicitly here as covering this concern, since each successive trade already moves the price less, not more, directly limiting the profitability of "buy low, sell high, repeat." No new mechanism needed for this part.
  **Genuinely deferred:** cross-player detection logic (flagging suspicious trade patterns, rate-limiting, account-level intervention) — this is real multiplayer-specific work with no single-player equivalent to design against yet, so there's nothing concrete to build until multiplayer is in scope.
- **Taxes/fees:** a **flat transaction fee on sales** (e.g., 5%, taken by "the market" itself, not any player), functioning as a **currency sink**. This addresses a gap created by the single-universal-currency decision — without a sink, currency only accumulates in the economy over time (a slow inflation problem), and a small flat sale fee is a standard, low-complexity fix.
- **Regional market nuances beyond what's already decided:** **closed out as already covered**, not left open — per-planet modifiers, baseline drift, seasons, and emergencies already constitute the regional-nuance system; there's no concrete gap remaining to design against without a specific new idea driving it.
- **Market-driver flavor/communication (idea, not yet a locked mechanic):** genuine potential here, and it layers naturally on top of the trade map's existing three change-layers (baseline drift, seasons, emergencies) rather than requiring new systems. Ideas kept for reference:
  - A **market news ticker/feed** on the trade map or a planet's market screen, generating short in-universe headlines tied to whichever layer is actually driving a price change (e.g., "Harvest season begins on [Planet] — grain prices falling" for a season shift, "[Planet] declares mining emergency — ore prices spiking" for an emergency).
  - **NPC merchant flavor text/dialogue** at a planet's market that reacts to current conditions (a merchant complaining about a shortage, bragging about a surplus) — cheap to add once the underlying price-driver data exists, since it's just reading the same state the ticker would read.
  - **A simple price history graph** per item per planet, so players can see *that* something changed even before they know *why* — pairs well with the ticker rather than replacing it.
  - None of this changes the underlying pricing mechanics — it's a presentation-layer feature reading from data the three change-layers already produce, so it can be deferred independently and added whenever, without touching the trading formulas themselves.

## Crew Crafters

**Status: Phase 3 (Trading Loop) complete — this is the active phase next.** Per the decided development order: galaxy generation → planet generation → resource generation → crafting recipes/schematics → trading loop → **[Phase 3 boundary]** → **crafters (NPC crew)** → travel → map.

**Carried over from Trading Market:** the market expands beyond the four item tiers to also include crafters themselves — specifically, **hiring an NPC crafter to join your crew** (not a one-off service listing or schematic/skill access sale). That was the only decision made on this system so far; full mechanics were explicitly deferred to here.

**Decided:**
- **Crew mechanics (Option C — both active and passive, with a real distinction):** a crew member can be **actively assigned** to a specific craft action (the player picks them, using their exact tier/profession, same as choosing which crafter to use), **or left idle**, in which case they can passively work on **queued/background crafts** at a reduced rate or capacity while the player is elsewhere. This is deliberately the more complex option over passive-only or active-only, because it's the only one that makes "crew" mean something beyond a reskinned crafter-tier stat — a passive-only system turns hiring into a shopping trip for stat boosts, and an active-only system barely differs from the existing player-crafter mechanic. The active/idle split creates a real management decision (bring this crafter to actively work, or leave them running background production) and gives multiple crew members distinct roles.
- **Background/idle crafting simulation (Option B — catch-up calculation on return, timestamp-based):** no continuous ticking. A `lastCheckedAt` timestamp is stored (via the existing `SaveSystem`, same pattern as other persisted state) rather than the client computing and passing in an elapsed duration directly — elapsed time is derived as `now - lastCheckedAt` at resolution time, not asserted by the caller. When the player checks on a crew member, the system resolves all background production in one deterministic pass: `(elapsedTime, crewMemberTier, recipe) → output`, the same pure-function shape already used for `refine()`, `craft()`, and `applyDrift()` — fits the established architecture rather than introducing a new pattern. Chosen over true real-time ticking (nothing to keep alive in a browser tab with no server — would need a catch-up path anyway for the "tab closed" case, making live-ticking mostly redundant) and fixed player-triggered increments (doesn't track real elapsed time at all, undercutting the entire point of idle/background crafting rewarding time away). **An elapsed-time cap** (tunable, e.g. 24-48 hours max credited) prevents both an honest edge case (leaving the game running for a week) and a future dishonest one (a manipulated timestamp claiming an impossible duration) — see the multiplayer note below for why the cap matters beyond just the honest case.
  - **Multiplayer-forward note (re-examined per the standing single-player-first decision, same reasoning as the seed/position/discovered-flag/trade-attribution fields):** a client-computed elapsed duration would be a real exploit vector under a shared economy — a player could manipulate their local clock or the value itself to claim inflated background production, directly affecting a market other players trade in. Storing a timestamp and deriving elapsed time at resolution time (rather than trusting an asserted duration) keeps the same pure function portable to a future server-authoritative caller with zero formula rewrite — only *where* elapsed time gets computed changes, not the function itself.
- **NPC Crafter Skill Representation:** hired NPC crafters use the **same 7-tier color scale** already used for refiner tier, crafter tier, schematic tier, and planet tier — no separate system. A hired NPC's **profession is locked at hire time, not freely reassignable**, for tiers 6-7 (the tier band where profession specialization already exists per the general crafting design; tiers 3-5 remain general/unspecialized, same as the existing player-crafter rule). This keeps hiring a real, non-fungible decision (you found a Gold-tier weaponsmith, not a generic Gold-tier slot you can reskin), consistent with the exclusivity theme already used for tier 6-7 schematics and crafted goods, and preserves the existing tiers-3-5-general/tiers-6-7-specialized split rather than undermining it.
- **Acquisition:** NPC crafters are found in a **small, refreshing pool of available hires at each planet's market** (reuses the "planet markets have their own state that changes over time" pattern already built for goods pricing) — not a global list, and not player-generated from scratch. When a new hire candidate appears, their tier is rolled through the **same 7-tier breakpoint table** used everywhere else; if it lands tier 6-7, a profession is also rolled (per the skill representation decision above). **Cost scales with tier**, paid in the single existing currency, consistent with how every other tier system (refiners, schematics, planets) treats "better = more valuable/harder to get." **Follow-on idea, not required to launch:** certain professions could be more likely to appear on certain Planet Types (e.g., a mining-flavored planet more likely to produce weaponsmiths for hire) — the same lever already used for raw-resource eligibility (Phase 2) and tier 6-7 trade demand (Phase 3). Exact refresh interval, pool size, and cost numbers are left as tunables, not locked.
- **Crew capacity (Option C — starts small, expandable via purchasable upgrade):** a player begins with a small base capacity for hired crew, expandable by purchasing additional slots with Credits. Chosen over unlimited capacity (which would undercut the exclusivity/scarcity theme built into every other system — tier 6-7 goods, unique schematics, planet quality, non-fungible crew hires — by removing the "who do I keep" decision entirely) and a flat fixed cap (doesn't reward progression, feels arbitrary). Capacity expansion doubles as **another currency sink**, consistent with the reasoning already used for the transaction fee. Doesn't depend on the not-yet-designed Travel/ships milestone to function now, but leaves an obvious future hook — if ships/crew quarters get designed later, capacity could naturally scale with ship size too, without needing a redesign. Base capacity and the expansion cost curve are left as tunables, not locked.
- **Interaction with the player's own crafting (in addition to, not instead of):** crew members are **parallel crafting capacity**, not a substitute for the player's own crafting. This follows directly from the Section 2.1 decision — an actively-assigned crew member works on a specific craft action, and an idle one works on background production; both framings already imply each crew member is an independent actor with their own craft in progress, running alongside the player's own. Chosen over "instead of" (would mean hiring trades away the player's own crafting capability, undermining the "crew is a real investment" framing) and "player chooses per-craft, one at a time" (makes crew members functionally identical to just picking a different crafter tier for a single action — the same "active-only barely differs from the existing mechanic" trap already avoided in 2.1; if only one craft can happen at a time regardless of crew size, having 3 crew members isn't meaningfully different from having 1). **Concretely:** multiple crafts can be in progress simultaneously — the player's own active craft, each actively-assigned crew member's craft, and background production ticking for idle crew members — each independently calling the existing unified crafting formula with its own crafter (player skill, or that specific NPC's tier/profession). No new formula needed.
- **Ongoing cost (upkeep/wage, not one-time):** hired crew members cost a **recurring wage**, not a single upfront payment. Chosen for consistency with the currency-sink pattern used throughout this phase (crew capacity expansion and the trading transaction fee are both already sinks; a one-time cost doesn't keep pulling currency out of the economy the way an upkeep wage does, and crew crafters represent genuine ongoing production capacity per the decision above, so a matching ongoing cost fits). Makes crew composition a continuous strategic decision rather than a one-time purchase, and creates real tension with the idle/background choice from 2.1 — an idle crew member still costs upkeep while producing at a reduced rate, giving a concrete reason to actually manage a crew rather than hire-and-forget. **Wage scales with tier**, reusing the same "tier = more valuable, costs more" pattern already used for acquisition (2.3). Paid automatically at a regular interval; exact wage curve and interval left as tunables.
- **Loss/attrition (two mechanisms, no random loss):** a crew member leaves via **automatic departure from unpaid upkeep** (past some grace period, per the ongoing-cost decision above) — the primary trigger, reusing an already-decided mechanism rather than inventing a new one. A player can also **voluntarily dismiss** a crew member directly, which matters practically since capacity is limited/purchasable (2.4) and hires are non-fungible/locked-profession (2.2) — a player will want to swap a lower-tier hire for a better one without having to deliberately stop paying upkeep as an indirect workaround. **Explicitly ruled out for now: random/permadeath-style loss** (death, poaching, etc.) — there's no combat, risk, or travel-hazard system yet for that to hang off of; adding it now would be speculative work against systems that don't exist, same reasoning as deferring market manipulation detection until multiplayer exists. A future travel/danger system could add risk-based crew loss later as a natural extension, but it isn't designed now.

### Open questions

- **Exact reduced rate/capacity for background vs. active crafting** — how much worse is idle output than actively assigning the same crafter, and does that scale by crew member tier the way other systems do?
- **(Multiplayer-forward, tracked now rather than assumed away, genuinely deferred — not required to resolve now):** should `lastCheckedAt` be stored now, even though single-player has no immediate tamper-resistance need — same "build it in now, costs nothing" reasoning as the generation seed and trade attribution fields? If multiplayer eventually means a persistent shared world, does background crafting need genuine server-side ticking (not just catch-up-on-check-in), since other players might want to observe/interact with a crew's production without the crew owner triggering resolution? Does a hired crew member remain strictly private to the hiring player under any future multiplayer model, or could crew members eventually be shared/tradeable/poachable — this affects whether crew data needs a `createdByPlayerId`-style attribution field now, the same pattern already used for trade attribution.

**Section status: all Phase-4-relevant questions resolved except two intentionally tracked, not-yet-necessary items above** (the exact idle-rate number, and the genuinely-deferred multiplayer-forward questions — same treatment as Trading Market's cross-player manipulation detection).

## Ships

**Status: not yet active — Phase 4 (Crew Crafters) is in progress, Ships/Travel come next per the decided development order.** Captured here now, ahead of when it becomes the active phase, so the subject isn't lost while Phase 4 agents are being run. Nothing below is decided yet.

**Carried over:** nothing formally decided yet, though ships are implied as the eventual vehicle for travel (next section) and as the thing crew capacity may eventually scale with (per the Crew Crafters "capacity could naturally scale with ship size" follow-on note).

### Open questions (as raised, not yet worked through)

- **Ship upgrades:** how does a ship get upgraded — individual component swaps, a tiered "ship level," something else? Does this reuse the same 7-tier color scale used for everything else in the game, or does it need its own system?
- **Buying entirely new ships:** is this a separate purchase from upgrading an existing one? Does a "ship market" exist (parallel to or part of the existing per-planet/global trading market), and if so, what tiers/exclusivity rules would apply — same pattern as tier 6-7 goods, or a distinct system?
- **Ship components:** what components exist — weapons, engines, shields, cargo holds are the ones named so far. Are these individually tiered/upgradeable (same color scale?), and do they carry their own quality data the way resources/crafted items do, or are they a separate stat system?
- **Ships and travel time:** how do ships (and specifically engines) affect travel time — a flat speed stat, a tier-based modifier (reusing the tier-modifier pattern already used for refiners/crafters/planets), something else?

## Travel

**Status: not yet active — same as Ships above.** Captured now so it isn't lost while Phase 4 is worked through.

**Carried over from Trading Market:** remote tier 6-7 sales require the item to travel (not teleport) to a discovered planet, with exact travel-time mechanics explicitly deferred to this milestone. This is the first concrete mechanical dependency on Travel actually being designed.

### Open questions (as raised, not yet worked through)

- **The map:** what does the galactic map actually look like/function as during travel specifically — is this the same galactic trade map from Trading Market (Section 2.9 of that phase), extended with travel functionality, or a related-but-distinct system?
- **Unit of travel/distance:** what's the actual unit — an AU-style astronomical unit, an abstracted "distance" number, something else? This ties directly to the `position: {x, y}` coordinate already generated per planet in Phase 2 — presumably travel time derives from the distance between two planets' coordinates, but the exact formula/unit isn't decided.
- **How ships/engines impact travel:** direct dependency on the Ships section above — presumably ship/engine tier modifies travel time or speed, but the exact mechanic isn't decided (this question is really the same one as "Ships and travel time" above, just from the Travel side).
- **Encounters during travel (new feature, not previously scoped anywhere):** random or triggered events that occur while a ship is traveling — combat, discovery, trade opportunities, hazards, etc. This is explicitly new — it doesn't map onto anything already decided elsewhere, and would need its own scope definition (what kinds of encounters, how frequent, what systems they'd need to interact with — e.g., if encounters can involve combat, that's a new system with no prior design work, unlike everything else in this doc which has mostly built on existing mechanics).

## Engine/Systems Architecture

**Decided:**
- This is **not** meant to be a reusable engine/framework for other games or modes to plug into — it's a **specific implementation for one game**.
- **Data-driven design confirmed** — resources, recipes, and qualities will be defined in config files (JSON/CSV or similar) so content can be added/adjusted without code changes.
- **Persistence model: single-player for initial scope.** Multiplayer (some form of shared economy or otherwise) is a planned future evolution, not part of the initial build.
- **Development order:** galaxy generation → planet generation → resource generation → crafting recipes/schematics, **then** the trading loop, crafters (NPC crew), travel, and the galactic map.
- **MVP scope confirmed:** build the quality math end-to-end on one hardcoded planet before investing in procedural galaxy/planet generation:
  1. One hardcoded planet, 2-3 resource types (skip procedural galaxy gen for v1).
  2. Resource generation with random quality rolls (1-100 + 7-tier color mapping).
  3. One refining recipe end-to-end (Option A, refund chance, refiner tier).
  4. One crafting recipe + one schematic end-to-end (full unified crafting formula).
  5. Only after 1-4 are working and tunable — move to real galaxy/planet generation.
- **Tech stack: web stack now (TypeScript + Phaser), migrating to Unity later**, once the design has stabilized through iteration. Driven by wanting AI agents to do heavy lifting on development **for as long as possible** — a plain-text, framework-light web stack is far more agent-friendly (huge training data, automatable browser-based testing, no GUI-editor dependency) than Unity or Godot's editor-driven workflows. Unity was chosen as the eventual migration target over Godot, in part because Unity/C# is also comparatively agent-friendly (larger training data than Godot/GDScript), which helps keep agents effective even after the migration.
- **Renderer: Phaser, not PixiJS.** PixiJS is a rendering layer only (no scene management, input abstraction, tweening, or asset pipeline) — Phaser is a full 2D game framework built on similar rendering capability. Chosen because: (1) Phaser's `Scene` class maps directly onto the MVP's four screens (map/gather/refine/craft), giving every agent touching presentation code the same consistent pattern rather than inventing scene structure from scratch; (2) built-in tweening covers the "simple animated 2D screens" requirement natively; (3) built-in input handling (`setInteractive()`, pointer events) is the idiomatic way to satisfy the "no raw DOM input" architectural mandate; (4) larger, more game-specific training data (2D game tutorials/examples, not just rendering primitives), which matters given the agent-first development priority. PixiJS would win only if heavy custom rendering (particle systems, shaders, bespoke effects) were needed — not called for by the MVP's four straightforward screens, though Phaser doesn't preclude Pixi-style custom rendering later if needed (e.g., for the galactic trade map's visual polish).
- **Migration trigger: tied to the status of the initial (MVP) loop.** Once the hardcoded-planet, quality-roll, refining, and crafting vertical slice (see MVP scope below) is working and feels right, that's the signal to evaluate migrating to Unity — rather than a fixed calendar date or a specific unrelated technical wall. Exact "done" criteria for the initial loop still to be defined (see below).
- **Architectural mandate:** to keep the eventual Unity migration a *port* rather than a *rewrite*, the game must be built with a **hard separation between simulation and presentation** from day one. All core game logic (quality-roll formulas, refining/crafting math, market state, planet data) should live in plain, framework-agnostic TypeScript — pure functions/data structures with no Phaser objects touching them directly. Phaser code should only handle rendering, animation, input, and the map screen. Everything in the MVP scope above (quality rolls, refining formula, crafting formula) belongs in this framework-agnostic core.
- **Web-only capabilities: isolate, don't eliminate.** The goal isn't avoiding browser APIs entirely (some, like the canvas surface, are just what running in a browser means) — it's making sure they never leak into game logic:
  - **Avoid entirely:** DOM-based UI (HTML/CSS overlays for menus, market, inventory — render all UI inside the Phaser canvas instead), URL params/cookies/browser routing for game state, and raw DOM input event handling (use the engine's built-in input abstraction instead).
  - **Isolate behind a single swappable adapter each:** persistence (a `SaveSystem` interface wrapping localStorage, swapped for Unity's `PlayerPrefs`/file I/O at migration), audio playback (an `AudioManager` interface wrapping Web Audio, swapped for Unity's audio system later), and eventually networking (a thin interface over WebSockets, built even before multiplayer is in scope, so it costs nothing now and saves a rewrite later).
  - **Fine as-is:** the canvas rendering surface itself — not a migration risk, since Unity also renders to a surface conceptually similarly.

---

## Open Questions — Must Be Answered for MVP

These directly block building the MVP's five steps (hardcoded planet → resource quality rolls → one refining recipe → one crafting recipe + schematic).

**Tech/Architecture:**
- (Migration trigger is decided in principle — tied to initial loop status. No remaining Must-Answer items in this category.)

**Resources & Qualities:**
- (Resolved — see Decided section above: non-applicable qualities are null/NA, and null/NA quality references **do not influence** a crafting recipe's formula or output at all — they're excluded from the calculation entirely, not treated as zero or as invalidating the input.)

**Refining:**
- (All Must-Answer Refining questions are now resolved — see Decided section above.)

**Crafting:**
- (All Must-Answer Crafting questions are now resolved — see Decided section above.)

**All Must-Answer-for-MVP questions across every category are now resolved.** Nothing in this list is blocking implementation of the five-step MVP vertical slice (hardcoded planet → resource quality rolls → one refining recipe → one crafting recipe + schematic).

## Open Questions — Can Wait Until After MVP

These depend on systems explicitly sequenced after the MVP (galaxy/planet generation, trading, crew, travel, map) or on features called out as deferred/post-launch.

**Resources & Qualities (Planets-dependent — see new Galaxy & Planet Generation section below for the full breakout):**
- Can qualities be improved after extraction (e.g., a purification step before refining), or are they locked at the point of harvest?

**Refining:**
- Whether refining can shift *which* qualities matter (e.g., raw "toughness" becoming refined "sharpness").

**Crafting & Recipes/Schematics:**
- Exact aggregation formula for the tier 3-7 single color tier (straight average, weighted, or Option-A-style math).
- How the aggregate color tier translates into actual sell value/price.
- Whether schematic tier is also tied to acquisition rarity (i.e., are higher-tier copies also just harder to find/buy).
- Full list/scope of the tier 6-7 crafting professions, and how skill works for tiers 3-5 in the meantime.
- Development/evaluation of the unique-schematic ideas listed above (named schematics, planet-locked, degrading, fragments, player-discovered variants).

**Trading Market:**
- (Promoted to active open questions — see the "Trading Market" section above, which now covers the current milestone. Nothing remains deferred here.)

**Engine/Systems Architecture:**
- What form future multiplayer would take (shared economy across all players, per-world/session economy, something else) — worth flagging early since it could influence how much the single-player architecture should anticipate it, but not required to start MVP work.
- Exact "done" criteria for the initial loop that would trigger evaluating the Unity migration (e.g., specific playtest/feel benchmarks, or simply "steps 1-4 of the MVP are complete and tunable").
- Asset pipeline continuity for the eventual Unity migration — sprites/animations built for Phaser generally need reformatting for Unity's import system; worth budgeting for and possibly a reason to keep 2D art simple/atlas-based early so re-import is mechanical rather than a redo.
- Whether AI-agent-driven development continues after the Unity migration (decided: yes, as long as possible) raises the same GUI-editor friction concerns flagged for Unity/Godot generally — worth revisiting Unity-specific agent workflows (e.g., scripting via code-first packages, avoiding hand-edited scene/prefab files) closer to migration time.
