# src/presentation

Owned by the **Presentation Agent** (GDD §5.2, agent 5).

Renderable scenes for the MVP loop: the map screen (trivial for one
hardcoded planet), and animated screens for resource collection, refining,
and crafting. Calls `src/simulation`'s public functions and renders their
output — never reimplements or duplicates formula logic locally. Goes
through `src/adapters` for persistence/audio, never `localStorage`/Web Audio
directly. No DOM-based UI — everything renders inside the canvas.

**Render engine choice (Phaser vs PixiJS, GDD §4) is deliberately deferred**
— not yet picked. No engine dependency has been added to `package.json`.
Whichever agent/session picks this up next should make that call before
writing scene code, then add the corresponding dependency.

Nothing has been implemented here yet.
