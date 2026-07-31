# Profitable — Product Alpha Feature List

**Purpose:** the working checklist for alpha. Every item below traces back to a locked design decision in `profitable-design-questions.md` — nothing here is a new design question, only implementation, content, tuning, and packaging work against decisions already made. Detailed rationale for each section lives in its linked planning doc; this file is the trackable list itself.

**Explicitly not in this list:** Multiplayer backend implementation (design complete, deliberately deferred — see `profitable-design-questions.md`'s Multiplayer section), any Unity migration work, any new gameplay system.

**Sequence:** work top to bottom — later sections depend on earlier ones (tuning needs real content to tune against; UI/UX needs stable numbers/content to onboard into).

---

## 1. Content Authoring
*Detail: `profitable-alpha-content-roster.md`*

- [x] Implement 21 resources (9 solid, 6 gas, 6 crystal) with correct per-category quality applicability (gases: no durability; crystals: no purity)
- [x] Implement 10 refining recipes
- [x] Implement 13 crafting recipes (8 tier 3-5, 5 tier 6-7)
- [x] Implement 16 ship component recipes (4 per category: weapon, engine, shield, cargo hold)
- [x] Mark 5 starter recipes as known-by-default (no schematic required): 1 general craft + 1 per component category
- [x] Generate/place schematics for the remaining 24 recipes into the existing schematic market-pool mechanism (corrected from this item's original "17" — 29 total crafting/component recipes minus the 5 known-by-default is 24, not 17)
- [x] Define the 5 tier 6-7 crew professions (Weaponsmith, Engineer, Shield Technician, Cargo Specialist, Artisan)
- [x] Document 4 ship build presets as onboarding reference content (Starter Runner, Hauler, Scout, Skirmisher)
- [x] **Decide and lock:** crafted-item aggregate tier formula (recommend: straight average, matching ship tier and market listing tier) — already implemented as a straight average (`src/simulation/aggregateTier.ts`); now formally confirmed as locked, not a stub
- [ ] **Decide:** schematic tier ↔ acquisition rarity connection (can wait until schematic pool-refresh is implemented)

## 2. Balance Tuning
*Detail: `profitable-alpha-tuning-values.md`*

**Status: correctness validated and committed. Feel-tuning explicitly deferred until the 2D engine is in place — a deliberate decision, not a stall.**

- [x] Load Trading starting values (drift ±2%/unit, floor/ceiling 50-150%, global markup/discount ±10%, fee 5%, listing expiry 72h) — already matched, no code change needed
- [x] Load Crew starting values — wage table and capacity cost curve corrected to match the doc exactly (wage: Blue-Gold moved to a true doubling curve; capacity: corrected to 500/1000/2000/4000); 48h upkeep grace period already matched
- [x] Load Ships/Travel starting values — speed modifier table corrected (Green/Blue/Purple/Orange); **`DISTANCE_TO_TRAVEL_HOURS_PER_UNIT` deliberately kept at its original 0.01, not changed to the tuning doc's proposed 1.0** — investigation found 0.01 was already live-verified in Phase 5's real browser testing (741-unit trip, 5.56h, hand-confirmed), while 1.0 was an ungrounded guess that would have produced 100-118 day cross-galaxy trips. The tuning doc itself was corrected to reflect this. Shipyard pool (3/24h) already matched.
- [x] Load Scanner starting values — **base radius and tier bonus table deliberately kept at their original values (120 base, +0→+350), not the tuning doc's proposed 50/+0→+80**, for the same reason as the travel-time constant (same coordinate space, same investigation). Cost curve and pool (2/48h refresh) loaded from the doc as proposed, since those aren't coordinate-dependent.
- [x] Load Travel Encounters starting values (20% trigger chance, 40/35/20/5 type weights, 50-200 Cr trade-opportunity range, hazard cost curve — middle bands are a documented reasoned completion of the doc's two given endpoints, not a direct transcription)
- [x] Load Combat starting values — 10% arrival-check chance loaded; durability damage % (15%) and crew unavailable duration (24h) already matched, confirmed not re-set
- [x] **Correctness validation via automated harness** (`scripts/playtestHarness.ts`, `npm run playtest`) — covers 11 of 13 mechanically-testable scenarios cleanly, 2 with documented caveats (A3: galaxy-specific resource mismatch, formula demonstrated correctly via direct comparison instead; B6: re-run and corrected against the real 50-planet scale after an initial run against a 5-planet dev-convenience galaxy produced a misleading result). Two real bugs found and fixed during this pass: a `getTierColor()` boundary gap affecting three systems since the original MVP commit, and a missing-schematic default-tier gap in `craft()`. Both documented with retroactive correction notes in the affected phase GDDs.
- [x] **Grey-tier scanner finding 0/49 planets at real scale — deliberately confirmed as intentional**, not a gap: consistent with "Grey = unremarkable baseline" already established for planet tier, refiner/crafter tier, and schematic tier. Documented in `profitable-alpha-tuning-values.md`.
- [ ] **Deferred: the human "feel" playtesting pass** (drift pacing, wage sustainability, travel-time pacing in real play, combat tension, full-loop rhythm) — see `profitable-alpha-playtest-plan.md` Parts A-C. Explicitly parked until the 2D presentation engine is further along, since testing pacing/feel against placeholder Phaser scenes would risk tuning against UI friction rather than the actual numbers. Risk of deferring this is acknowledged, not ignored.
- [ ] Re-record final tuned values back into `profitable-design-questions.md` once the deferred feel-tuning pass stabilizes them — not yet, since the values aren't final until that pass happens.

## 3. Scale & Performance
*Detail: `profitable-alpha-scale-performance-plan.md`*

- [ ] Fix galaxy generation at 50 planets
- [ ] Confirm resource/Planet Type distribution is reasonable at 50 planets with the real 21-item roster
- [ ] Test 1: full-galaxy map + travel layer rendering, discovered subset, check for overflow/legibility issues
- [ ] Test 2: realistic player-state load (3-5 ships, full crew, 50-100 listings, 30+ days of price history)
- [ ] Test 3: `getGlobalPrice()` performance at 50 planets with real listing volume
- [ ] Test 4: encounter/voyage history accumulation over an extended session (20-30 voyages)
- [ ] Fix any issues found as bugs against the responsible existing agent/system — not new design scope

## 4. UI/UX & Onboarding
*Detail: `profitable-alpha-uiux-onboarding-plan.md`*

- [x] Build debug/tuning panel exposing Section 2's tunables for live adjustment, gated behind a debug flag — `DebugPanelScene.ts`, reachable only via `?debug=1` (nav entry and scene registration both gated; scene code is dynamic-imported into its own chunk, verified absent from a production `npm run build` bundle and from a non-debug session's nav/registered-scenes). Every Section 2 scalar tunable across Trading/Crew/Ships & Travel/Scanner/Travel Encounters/Combat was promoted from `const` to `let` + a setter (data-file-only change, no formula/simulation code touched) and is live-adjustable via +/- steppers; per-tier tables (wage/cost/speed/weight curves) are exposed the same way. Includes a "Force Encounter" section (4 buttons: Trade Opportunity/Discovery/Hazard/Combat) that seeds a one-shot deterministic `RandomFn` into the next real `resolveArrival()` call rather than mocking an encounter — verified in-browser to produce a genuine, fully-resolvable `CombatEncounter` through the real `resolveEncounters()`/`initiateCombat()` path. Also includes "Reset all tuning to alpha defaults."
- [x] Build settings screen: audio on/off (via existing `AudioManager`), reset-onboarding option — `SettingsScene.ts`; `AudioManager` gained `setEnabled()`/`isEnabled()` (adapter-layer only), verified in-browser that toggling actually mutes/unmutes and persists via `SaveSystem`.
- [x] Build the 7-step skippable tooltip onboarding flow (gather → refine → craft → market → travel → shipyard → crew) — `onboardingOverlay.ts`, wired into all 7 scenes. Tracked per-step (not a strict linear pointer) since the nav bar already lets players visit scenes in any order; "Skip Tour" on any step's tooltip clears all 7 at once. Refine/Craft copy references "choose a recipe from the list" (recipe-selector-aware, not assuming a single hardcoded recipe).
- [x] Wire onboarding completion/skip state through the existing `SaveSystem` — `onboardingState.ts`; verified in-browser (dismiss/skip persist and survive scene changes; Settings' reset re-arms all 7 steps).
- [x] Run the tier-color legibility pass across all tier-driven UI (resource, refiner/crafter, planet, ship, schematic, scanner, crew) — audited via WCAG contrast ratio against the `#111111` canvas background plus a protanopia/deuteranopia/tritanopia simulation of all 21 tier-color pairs. One real failure found: Purple measured 2.99:1 (WCAG AA needs 4.5:1) — a legibility bug for all players, not just colorblind ones. Every other tier already cleared 4.5:1.
- [x] Add a minimal colorblind-safe treatment (e.g., tier-letter label alongside color) where feasible — audit found `TIER_COLOR_HEX` is only ever rendered as a real color fill in one place (`tierSelector.ts`), and that widget already draws the tier's full name as the colored text itself (never a bare swatch); every other tier display in the game shows the tier name as plain text regardless of color. This is already stronger than a letter code, so no separate abbreviation was added. Purple's color itself was corrected instead (0x9c27b0 → 0xba68c8, Material "Purple 300" — same palette family as the other 6, now 5.31:1 contrast) since that was the actual, concrete legibility gap the pass surfaced.

## 5. Electron Packaging
*Detail: `profitable-alpha-electron-plan.md`*

- [ ] Wrap existing Vite/Phaser build in Electron
- [ ] Swap `SaveSystem` to Electron file-system access (keep `localStorage` fallback behind a flag during testing)
- [ ] Confirm `AudioManager` works unchanged in Electron's Chromium runtime
- [ ] Add basic native app menu (Quit, Reload, debug panel toggle)
- [ ] Package/build for Windows and macOS
- [ ] Set up macOS notarization for internal playtest distribution
- [ ] Confirm resizable/maximizable window doesn't resurface the Map milestone's overflow bug class
- [ ] **Decision point:** consciously decide whether to begin Multiplayer backend work now that this "app, not web-driven" milestone is reached, or continue deferring it

---

## Definition of Alpha-Ready

All five sections above complete, with:
- A player able to complete the full loop (gather → refine → craft → trade → travel → crew → ships → combat) using only the real content roster, with no numbers left at their initial "reasonable guess" state from `profitable-alpha-tuning-values.md`
- The 50-planet galaxy performance-verified per Section 3's four tests
- A new, unfamiliar player able to get through onboarding and reach the core loop unassisted
- A packaged, installable Windows/macOS build distributable to an external playtest group
