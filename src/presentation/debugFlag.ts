// Shared debug-mode gate for dev-only tools -- the seed-playtest-save
// shortcut below, and the future debug/tuning panel from
// profitable-alpha-uiux-onboarding-plan.md §2 ("Recommend gating this
// behind a debug flag/URL parameter so it's not visible in whatever build
// gets shared outside the immediate dev/playtest group"). No tuning panel
// exists yet to import a flag from, so this establishes the convention
// both are meant to share, rather than each inventing its own.
//
// Two layers, both required:
// - `import.meta.env.DEV` guarantees anything gated behind this is
//   dead-code-eliminated from a real `npm run build` production bundle --
//   the same precedent main.ts's existing `window.__game` dev hook
//   already established, extended here to a named, reusable check instead
//   of an inline `if`.
// - The `?debug=1` URL param on top means a plain `npm run dev` session
//   doesn't surface debug tools by default either, only when explicitly
//   requested -- so a build shared with a wider playtest group (still a
//   dev-mode server, but not meant to expose seeding/tuning tools to
//   every participant) stays clean unless the param is added.
export function isDebugModeEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "1";
}
