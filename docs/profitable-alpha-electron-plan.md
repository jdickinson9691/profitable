# Profitable — Alpha Electron Packaging Plan

Concrete plan for Section 5 of `product-alpha-plan.md`. Deliberately small — this should be days, not weeks, precisely because the simulation/presentation separation and the adapter pattern were built specifically to make this cheap.

---

## Target Platforms

**Recommendation: Windows and macOS for alpha, not Linux yet.** Covers the overwhelming majority of a typical playtest group with the least packaging/signing overhead. Linux support via Electron is not hard to add later (it's largely a build-target flag, not new code) — no reason to hold up alpha for it.

## Task List

1. **Add Electron as a dev dependency, wrap the existing Vite/Phaser build.** No changes to any game code — Electron's `BrowserWindow` simply loads the same built output that currently runs in a browser tab. This step alone should take under a day.

2. **Swap `SaveSystem`'s implementation from `localStorage` to Electron's file-system access** (e.g., writing to the app's user-data directory). This is exactly the swap the adapter pattern was built for, all the way back at the original architecture decision — no call site anywhere in the game needs to change, only the one file implementing the `SaveSystem` interface. **Recommendation:** keep the existing `localStorage` implementation available behind a flag during alpha, in case testing surfaces an issue with the file-system path and a quick fallback is useful — remove it once the Electron path is confirmed solid.

3. **Confirm `AudioManager`'s existing Web Audio implementation works unchanged inside Electron's Chromium runtime.** It should — Electron *is* Chromium — but this is a five-minute check, not an assumption worth skipping.

4. **Basic native app menu:** Quit, Reload, and a toggle for the debug/tuning panel from the UI/UX plan (Section 4) — gating that panel behind a menu item rather than a URL parameter is a more natural fit once the game isn't running in a browser with an address bar.

5. **Package and build** via `electron-builder` (or equivalent) for Windows (`.exe`/installer) and macOS (`.dmg` or `.app`). **Note macOS code-signing/notarization as a real, separate task** — an unsigned Mac build will trigger Gatekeener warnings that make an alpha feel broken even when it isn't; worth budgeting a small amount of time for an Apple Developer account and notarization setup rather than discovering this friction during the first external playtest.

6. **Confirm the game's window can be resized/maximized sensibly**, now that it's not constrained to a browser tab's chrome — the Galactic Map milestone's canvas-overflow bug was specifically about fixed-dimension assumptions; worth a quick check that packaging as a resizable native window doesn't resurface a version of that same class of bug.

## Explicitly Out of Scope for Alpha Packaging

Auto-update infrastructure, code-signing for a public/wide release (notarization for internal playtesting is enough), installer customization/branding beyond electron-builder's defaults. All real work for an eventual public release, not needed to get an alpha build into a small playtest group's hands.

## Relationship to Multiplayer's Deferred Timing

`profitable-design-questions.md`'s Multiplayer section explicitly deferred the Universe backend's implementation timing to "when the project moves toward being an app rather than purely web-driven." This Electron packaging step arguably *is* that moment. **Recommendation: treat that as a deliberate decision point, not an automatic trigger** — finishing this packaging plan doesn't obligate starting the Multiplayer backend immediately; it just means the condition that decision was waiting on has now been met, and it's worth consciously deciding whether to pick it up or continue deferring it further.
