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

## Trading Market

**Decided:**
- Markets are **per-planet**, not a single global/unified market. Each planet's market has **modifiers for what that planet wants/buys and what it sells**.
- The market will **expand beyond the four item tiers to also include crafters themselves** — specifically, **hiring an NPC crafter to join your crew** (not a one-off service listing or schematic/skill access sale). Full mechanics deferred.
- **Two-tier market model:** a **global/overall market** accessible everywhere (no travel required) exists alongside per-planet markets, but does **not** offer the best buy or sell prices.
  - **Global market scope:** players can only **list/sell tiers 1-5** on the global market, but can **buy any tier 1-7** there. Tiers 6-7 are **sell-restricted to planet markets** as an intentional exclusivity design choice.
  - **Global market pricing:** prices are **live**, and are **influenced by planet market activity**.
  - **Buy/sell model:** for players, markets (both global and planet) are a **direct buy/sell option**, not an auction/bid system (unless refined further later).
  - **No AI NPC merchants (for now):** no auto-buy mechanism — items listed need an actual buyer. Explicitly a **post-launch feature**.
- To address the challenges tier 6-7 exclusivity raises (discoverability, dead inventory, market saturation, new-player accessibility), the working solution is a **galactic trade map**:
  - Each discovered planet shows what it **sells cheap** and what it **buys at a premium**.
  - **Three layers of change drive the map's data:**
    1. **Baseline drift (continuous):** fluctuations from actual player buy/sell activity.
    2. **Seasons (slow, predictable):** each planet has a recurring cycle, **determined at planet generation based on the planet's tier**, that swings its buy/sell lists on a schedule.
    3. **Emergencies (rare, sudden):** randomly-triggered events announced on the map, **purely random** — not caused by simulation/economy state.
  - Undiscovered planets are fogged until visited/scouted; a scanner/map upgrade could extend range or data freshness.

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
- **Tech stack: web stack now (TypeScript + Phaser or PixiJS), migrating to Unity later**, once the design has stabilized through iteration. Driven by wanting AI agents to do heavy lifting on development **for as long as possible** — a plain-text, framework-light web stack is far more agent-friendly (huge training data, automatable browser-based testing, no GUI-editor dependency) than Unity or Godot's editor-driven workflows. Unity was chosen as the eventual migration target over Godot, in part because Unity/C# is also comparatively agent-friendly (larger training data than Godot/GDScript), which helps keep agents effective even after the migration.
- **Migration trigger: tied to the status of the initial (MVP) loop.** Once the hardcoded-planet, quality-roll, refining, and crafting vertical slice (see MVP scope below) is working and feels right, that's the signal to evaluate migrating to Unity — rather than a fixed calendar date or a specific unrelated technical wall. Exact "done" criteria for the initial loop still to be defined (see below).
- **Architectural mandate:** to keep the eventual Unity migration a *port* rather than a *rewrite*, the game must be built with a **hard separation between simulation and presentation** from day one. All core game logic (quality-roll formulas, refining/crafting math, market state, planet data) should live in plain, framework-agnostic TypeScript — pure functions/data structures with no Phaser/PixiJS objects touching them directly. Phaser/PixiJS code should only handle rendering, animation, input, and the map screen. Everything in the MVP scope above (quality rolls, refining formula, crafting formula) belongs in this framework-agnostic core.
- **Web-only capabilities: isolate, don't eliminate.** The goal isn't avoiding browser APIs entirely (some, like the canvas surface, are just what running in a browser means) — it's making sure they never leak into game logic:
  - **Avoid entirely:** DOM-based UI (HTML/CSS overlays for menus, market, inventory — render all UI inside the Phaser/PixiJS canvas instead), URL params/cookies/browser routing for game state, and raw DOM input event handling (use the engine's built-in input abstraction instead).
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

**Resources & Qualities (Planets-dependent):**
- How does planet generation modify quality rolls (per-planet bonus/penalty ranges, planet "specialties," resource availability by planet type)?
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
- Warning/lead time for emergencies, and how map data ages/goes stale for planets you're not actively at.
- Whether players can remotely initiate a tier 6-7 sale (item traveling separately) or a sale strictly requires physical presence.
- Soft-cap/diminishing-returns pricing to prevent one seller from crashing a planet's price, or one planet from becoming an infinite sink.
- Whether multiple planets can buy the same tier 6-7 category, or demand is one-planet-per-item-type.
- Exact mechanism for "global price influenced by planet activity" (rolling average, supply/demand feed, etc.).
- Without NPC auto-buyers, what happens to a listing that never finds a buyer (sits indefinitely, expires, returns to player)?
- Is quality represented per-listing as distinct stackable items, or does the market bucket by quality tier?
- Order book / auction house model vs. direct player-to-player listings vs. NPC price-discovery system (beyond the "direct buy/sell" decided default).
- Currency: single currency, or barter/resource-backed exchange?
- Price history, market manipulation mechanics, taxes/fees, regional market nuances beyond what's already decided.

**Engine/Systems Architecture:**
- What form future multiplayer would take (shared economy across all players, per-world/session economy, something else) — worth flagging early since it could influence how much the single-player architecture should anticipate it, but not required to start MVP work.
- Exact "done" criteria for the initial loop that would trigger evaluating the Unity migration (e.g., specific playtest/feel benchmarks, or simply "steps 1-4 of the MVP are complete and tunable").
- Asset pipeline continuity for the eventual Unity migration — sprites/animations built for Phaser/PixiJS generally need reformatting for Unity's import system; worth budgeting for and possibly a reason to keep 2D art simple/atlas-based early so re-import is mechanical rather than a redo.
- Whether AI-agent-driven development continues after the Unity migration (decided: yes, as long as possible) raises the same GUI-editor friction concerns flagged for Unity/Godot generally — worth revisiting Unity-specific agent workflows (e.g., scripting via code-first packages, avoiding hand-edited scene/prefab files) closer to migration time.
