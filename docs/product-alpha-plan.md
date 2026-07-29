# Profitable — Product Alpha Plan

**Purpose:** this document is the source for `product-alpha.md`'s eventual feature list. It doesn't reopen any design decision — every system in `profitable-design-questions.md` is locked. This is the work required to turn a verified proof-of-concept into a first-playable alpha: content, tuning, scale, polish, and packaging.

**What's explicitly NOT in scope for alpha:** Multiplayer (design complete, deliberately unbuilt — see `profitable-design-questions.md`'s Multiplayer section), any Unity migration work, any new gameplay system beyond what's already designed. Alpha is about making the *existing* design playable, not extending it.

---

## 1. Content Authoring

The current content set (3 resources, 1 refining recipe, 1 crafting recipe, 4 component recipes) proved the systems work. It's not close to enough for a human to actually play. This is the single largest work item for alpha.

### 1.1 Resources
**Recommendation: ~18-20 resources**, distributed across the three categories (solid/gas/crystal) and Planet Types (Terrestrial/Super-Earth/Neptunian/Gas Giant), roughly:
- 8-10 solid resources (feeds refining, most crafting, and 3 of 4 component categories)
- 5-6 gas resources (feeds Neptunian/Gas Giant planets, some crafting inputs)
- 5-6 crystal resources (feeds refining alongside solids, some higher-tier crafting)

This is enough to make Planet Type eligibility (Phase 2) actually feel meaningful — right now, with 3 resources, most planets' eligible pool is trivially small. It also gives the percentage-based subset-selection table (Grey 20% → Gold 100%) room to actually differentiate a Grey planet from a Gold one.

### 1.2 Refining Recipes
**Recommendation: 8-10 recipes**, each n:1 or multi-resource per the decided model, deliberately varying: some 2-input, some 3-input, some mixing categories (the way Igneous Ore + Autunite Crystal already does) so the straight-average combination formula gets exercised across different input counts.

### 1.3 Crafting Recipes (tiers 3-7)
**Recommendation: 12-15 recipes**, spread across tiers, each with a defined category+threshold input requirement. Deliberately include:
- A few recipes with a **low threshold** (easy to meet, rarely penalized) and a few with a **high threshold** (frequently triggers the penalty curve) — the current single recipe doesn't exercise the full penalty curve's range.
- At least 2-3 recipes per tier band (3-5 general, 6-7 specialized) so the crafter-profession system (below) has real recipes to specialize around.

### 1.4 Ship Component Recipes
**Recommendation: 3-4 recipes per category** (12-16 total, up from 1 each). A single weapon/engine/shield/cargo-hold recipe means every ship of a given tier is identical — multiple recipes per category let players actually choose a build direction.

### 1.5 Schematics
**Recommendation: a real schematic roster, tier-distributed**, matching the crafting recipes above. Currently unclear how many exist at all — needs an explicit count and tier spread (more Grey/White, progressively fewer toward Gold, matching the existing tier-breakpoint-width pattern already used everywhere else).

### 1.6 Small Design Loose Ends to Resolve During Content Authoring
These were deliberately left open in the original design passes as "decide when you get to content" — they need answers now, but they're narrow, content-shaped decisions, not new system design:

- **Tier 6-7 crew profession list.** Crew Crafters decided tier 6-7 crew are specialized, but the actual profession list (weaponsmith, alchemist, armorsmith, etc.) was never enumerated. Needs a concrete list before the crew hiring pool can generate real candidates.
- **Schematic tier ↔ acquisition rarity connection.** Left open in the original Crafting section — whether a schematic's tier also affects how hard it is to find in the market pool, or those are independent. Worth deciding alongside populating the schematic roster itself.
- **Crafted-item aggregate tier formula (tiers 3-7 display color).** Stubbed as "straight average" during MVP planning but never formally re-confirmed as final — worth explicitly locking this now, reusing the same straight-average pattern already confirmed for ship tier and market listing tier, for consistency.

### 1.7 Ships
No new ship *types* needed — ships are built from components, not authored as fixed classes. **Recommendation:** author 3-4 "recommended build" presets (e.g., a balanced starter, a cargo hauler, a fast scout) purely as onboarding content — suggested component combinations a new player can buy into, not a new data structure.

---

## 2. Balance Tuning

Every value below currently has a functionally-correct placeholder (agents were contractually required to implement *something* reasonable) but none have been tuned through actual play. This needs a dedicated playtesting pass, not just picking numbers on paper.

**By system:**

| System | Values needing real tuning |
|---|---|
| Refining | ±10% base variance, refiner tier variance table, refund chance curve |
| Crafting | Threshold penalty curve, schematic tier contribution table, +18% combined cap |
| Galaxy/Planets | Planet tier quality modifier (-15 to +30), specialty +15 bonus, resource subset % table |
| Trading | Baseline drift %, floor/ceiling (50-150%), global markup/discount (±10%), transaction fee (5%), listing expiry (~72h) |
| Crew | Wage curve, capacity expansion cost curve, upkeep grace period, idle rate (locked at flat 50%, but worth confirming it *feels* right) |
| Ships/Travel | Ship tier speed modifier, distance-to-travel-time scaling constant, shipyard pool size/refresh |
| Scanner | Base radius, tier radius-bonus table, pool refresh/size, cost curve |
| Encounters | Trigger chance per window, type-weight distribution (trade/discovery/hazard/combat), trade-opportunity currency range, hazard failure cost curve |
| Combat | Combat's weight in the type-split table, arrival-check chance, component durability damage %, crew `unavailableUntil` duration |
| Multiplayer (when built) | Universal modifier bounds, per-capita normalization — not urgent for alpha since unbuilt |

**Recommendation:** treat this as one dedicated pass, done *after* content authoring (Section 1) is complete — tuning against a thin content set will produce numbers that don't hold once the real roster exists.

---

## 3. Galaxy Scale & Performance

**Recommendation: fix alpha's galaxy size at 40-60 planets.** Large enough to make discovery, travel, and the trade map feel like a real galaxy rather than a demo (2-3 planets, as used for verification), small enough to stay well within what's already been performance-tested plus reasonable headroom. This is a number to pick once and hold, not tune live — Phase 2's galaxy structure decision was already "fixed, not infinite," this just makes that fixed number concrete.

**Recommendation: a dedicated scale/performance test pass**, since the only scale-related bug found so far (Map's canvas overflow) was caught at just 2 planets. Needs testing at:
- The full alpha galaxy size (40-60 planets) rendered on the map/trade-map/travel-layer screens simultaneously.
- A realistic player state: several owned ships, a full crew roster, many active listings, a deep price-history log (per-item per-planet, accumulating daily) — this hasn't been stress-tested at all yet.
- The `getGlobalPrice()` live-query pattern specifically, since it scans across all planets on every call — worth confirming this stays fast at 40-60 planets rather than degrading.

---

## 4. UI/UX & Onboarding

Every presentation agent built the minimum functional scene needed to prove its system — no visual identity, no tutorial, no onboarding, no settings. **Recommendation, scoped for alpha (not full polish):**

- **A first-time onboarding flow** — the game currently assumes a player already understands gather → refine → craft → trade → travel. A short guided first session (even just sequenced tooltips over the existing screens) is likely the highest-value UI investment for alpha specifically, since "first playable" implies someone unfamiliar with the whole design needs to make sense of it.
- **A settings screen** — at minimum: audio on/off (Agent 4's `AudioManager` already exists, just needs a UI), and a way to see/adjust the tunable values from Section 2 during playtesting itself (a debug/tuning panel is arguably more valuable *during* alpha than a polished settings menu).
- **Visual differentiation between the 7 tier colors** — this has been functionally correct (the right color is shown) but worth an explicit design pass to make sure Grey through Gold are actually easy to tell apart at a glance, since the entire game's readability depends on this one color system.
- **NOT in scope for alpha:** custom art assets, sound design/music, animation polish, accessibility pass beyond basics. These are real work, but they're post-alpha polish, not first-playable blockers.

---

## 5. Electron Packaging

**Recommendation: Electron**, not Tauri (Rust — breaks the single-toolchain, agent-friendly discipline held since the original tech-stack decision) or Capacitor (mobile-focused, not the current target).

**Task list, deliberately small and mechanical — no design questions attached:**
1. Wrap the existing Phaser/Vite build in an Electron shell (`electron-builder` or similar) — no changes to game code required.
2. Route `SaveSystem` to Electron's file-system access instead of (or alongside) browser `localStorage` — this is exactly the kind of swap the adapter pattern (built specifically for this reason, back at the original architecture decision) was designed to make trivial.
3. Basic app menu (quit, reload, maybe a debug-tools toggle).
4. Build/package for the target OS(es) — confirm which platforms alpha needs (Windows/Mac/both).
5. Confirm `AudioManager`'s Web Audio implementation works unchanged inside Electron's Chromium runtime (it should, but worth an explicit check rather than an assumption).

This should be genuinely small — days, not weeks — precisely because the simulation/presentation separation and the adapter pattern were built years (in project-time) ago specifically to make a moment like this cheap.

---

## 6. Suggested Sequencing

1. **Content authoring (Section 1)** — nothing else can be meaningfully tuned or tested against a 3-resource game.
2. **Balance tuning (Section 2)** — now that real content exists to tune against.
3. **Scale/performance pass (Section 3)** — run in parallel with or immediately after tuning, since it needs the real content volume to be meaningful too.
4. **UI/UX & onboarding (Section 4)** — build once the underlying numbers and content are stable, so onboarding doesn't need to be redone if tuning shifts the experience.
5. **Electron packaging (Section 5)** — last, and can happen in parallel with 3-4 since it's independent of content/tuning/UI work.

Multiplayer backend work, if it ever gets picked up, sits entirely outside this sequence — per its own design decision, its timing is tied to the eventual app-conversion moment, which this Electron packaging step arguably now *is*. Worth a deliberate decision at that point on whether Multiplayer's backend build starts now or stays deferred further — but that's a call for after alpha, not a blocker to it.
