# Profitable — Product Alpha Feature List

**Purpose:** the working checklist for alpha. Every item below traces back to a locked design decision in `profitable-design-questions.md` — nothing here is a new design question, only implementation, content, tuning, and packaging work against decisions already made. Detailed rationale for each section lives in its linked planning doc; this file is the trackable list itself.

**Explicitly not in this list:** Multiplayer backend implementation (design complete, deliberately deferred — see `profitable-design-questions.md`'s Multiplayer section), any Unity migration work, any new gameplay system.

**Sequence:** work top to bottom — later sections depend on earlier ones (tuning needs real content to tune against; UI/UX needs stable numbers/content to onboard into).

---

## 1. Content Authoring
*Detail: `profitable-alpha-content-roster.md`*

- [ ] Implement 21 resources (9 solid, 6 gas, 6 crystal) with correct per-category quality applicability (gases: no durability; crystals: no purity)
- [ ] Implement 10 refining recipes
- [ ] Implement 13 crafting recipes (8 tier 3-5, 5 tier 6-7)
- [ ] Implement 16 ship component recipes (4 per category: weapon, engine, shield, cargo hold)
- [ ] Mark 5 starter recipes as known-by-default (no schematic required): 1 general craft + 1 per component category
- [ ] Generate/place schematics for the remaining 17 recipes into the existing schematic market-pool mechanism
- [ ] Define the 5 tier 6-7 crew professions (Weaponsmith, Engineer, Shield Technician, Cargo Specialist, Artisan)
- [ ] Document 4 ship build presets as onboarding reference content (Starter Runner, Hauler, Scout, Skirmisher)
- [ ] **Decide and lock:** crafted-item aggregate tier formula (recommend: straight average, matching ship tier and market listing tier)
- [ ] **Decide:** schematic tier ↔ acquisition rarity connection (can wait until schematic pool-refresh is implemented)

## 2. Balance Tuning
*Detail: `profitable-alpha-tuning-values.md`*

- [ ] Load Trading starting values (drift ±2%/unit, floor/ceiling 50-150%, global markup/discount ±10%, fee 5%, listing expiry 72h)
- [ ] Load Crew starting values (wage table, capacity cost curve, 48h upkeep grace period)
- [ ] Load Ships/Travel starting values (speed modifier table, 1 unit = 1 hour scaling constant, shipyard pool 3/24h)
- [ ] Load Scanner starting values (radius table, cost curve, pool 2/48h)
- [ ] Load Travel Encounters starting values (20% trigger chance, type weights, trade-opportunity range, hazard cost curve)
- [ ] Load Combat starting values (10% arrival check chance — durability damage % and crew unavailable duration already implemented)
- [ ] **Validate** (not re-derive) already-locked Refining/Crafting/Galaxy-Planet numbers through actual play
- [ ] Run a dedicated playtesting pass adjusting all of the above against real content from Section 1
- [ ] Re-record final tuned values back into `profitable-design-questions.md` once stable, so the design doc stays the source of truth

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

- [ ] Build the 7-step skippable tooltip onboarding flow (gather → refine → craft → market → travel → shipyard → crew)
- [ ] Wire onboarding completion/skip state through the existing `SaveSystem`
- [ ] Build settings screen: audio on/off (via existing `AudioManager`), reset-onboarding option
- [ ] Build debug/tuning panel exposing Section 2's tunables for live adjustment, gated behind a debug flag
- [ ] Run the tier-color legibility pass across all tier-driven UI (resource, refiner/crafter, planet, ship, schematic, scanner, crew)
- [ ] Add a minimal colorblind-safe treatment (e.g., tier-letter label alongside color) where feasible

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
