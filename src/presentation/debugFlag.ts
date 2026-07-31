import { saveSystem } from "./gameState.ts";

const DEBUG_MODE_SAVE_KEY = "profitable:debugModeEnabled";

// Shared debug-mode gate for dev-only tools -- the seed-playtest-save
// shortcut below, and the debug/tuning panel from
// profitable-alpha-uiux-onboarding-plan.md §2 ("Recommend gating this
// behind a debug flag/URL parameter so it's not visible in whatever build
// gets shared outside the immediate dev/playtest group").
//
// Two independent paths, chosen by build type -- see each branch's own
// comment for why they can't share one mechanism:
export function isDebugModeEnabled(): boolean {
  if (typeof window === "undefined") return false;

  if (import.meta.env.DEV) {
    // Dev-server path (npm run dev), UNCHANGED from before Electron
    // packaging: `import.meta.env.DEV` guarantees this whole branch is
    // dead-code-eliminated from a real `vite build` production bundle
    // (the same precedent main.ts's own `window.__game` dev hook already
    // established), and the ?debug=1 URL param on top means a plain dev
    // session doesn't surface debug tools by default either, only when
    // explicitly requested. Never persisted -- must be re-typed per page
    // load, same as always.
    return new URLSearchParams(window.location.search).get("debug") === "1";
  }

  // Production/packaged-build path (Alpha Section 5, profitable-alpha-
  // electron-plan.md §4): `vite build` output -- everything Electron
  // packages -- has no address bar to put a ?debug=1 URL param on, so
  // there's no way to reach the branch above at all. A flag read through
  // the same swappable `saveSystem` gameState.ts already exposes (never
  // the browser storage adapter's own backend directly -- this file is
  // outside src/adapters, same rule every other presentation file
  // follows) stands in instead, toggled
  // only by Electron's native "Toggle Debug Mode" menu item
  // (electron/main.cjs's toggleDebugMode(), which writes this same key
  // through window.electronSaveAPI -- the identical bridge saveSystem
  // itself resolves to inside Electron -- then reloads so this function
  // re-runs and picks it up) -- absent/false by default, so a packaged
  // build never starts in debug mode without that deliberate menu action,
  // same principle as the dev-server path's URL param, just a different
  // mechanism for a build with no URL to type into.
  //
  // Necessary tradeoff: unlike the branch above, this one is NOT
  // statically foldable to `false` by the production build's minifier
  // (the saveSystem.load() read is a genuine runtime check), so the debug
  // panel's and devSeed's dynamic-imported code do ship as bytes in every
  // production/packaged bundle now, not only when DEV was already true --
  // they just don't execute unless this flag is actually set. There's no
  // way to have both "zero debug bytes in every production build" and
  // "runtime-toggleable in a packaged build with no URL bar" at once; the
  // latter is what this section explicitly asked for.
  return (saveSystem.load(DEBUG_MODE_SAVE_KEY) as boolean | null) ?? false;
}
