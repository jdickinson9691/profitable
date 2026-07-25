# src/adapters

Owned by the **Infrastructure/Adapter Agent** (GDD §5.2, agent 4).

The browser-API isolation layer mandated by GDD §4: `SaveSystem` and
`AudioManager` interfaces, each with one concrete browser-backed
implementation. No other module anywhere in the codebase may call
`localStorage`/`Audio()` directly — it goes through one of these two
interfaces instead.

No gameplay logic, and no imports from `src/simulation`.

**Status:** `saveSystem.ts` is implemented — the `SaveSystem` interface plus
`createLocalStorageSaveSystem()`, a factory that JSON-serializes through an
injectable `StorageLike` backend (`getItem`/`setItem`), defaulting to the
real global `localStorage` (accessed via a type assertion, not lib.dom's
ambient types, so DOM globals stay type-invisible everywhere outside this
file). Node's own `localStorage` needs `--experimental-webstorage` plus a
file-backed store, which isn't practical to exercise in tests — the
injectable backend sidesteps that entirely; tests supply an in-memory fake
(`tests/fixtures/storage.ts`). `AudioManager` and the stub `NetworkAdapter`
are still outstanding.
